/**
 * Share Workflow Automation Service
 * Handles complex approval workflows, automatic step execution, and condition-based processing
 */

import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import { getFeatureFlagService } from './FeatureFlagService';
import * as cron from 'node-cron';

export type WorkflowStepType = 'approval' | 'notification' | 'validation' | 'transformation';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'timeout';
export type WorkflowTrigger = 'manual' | 'scheduled' | 'condition' | 'external';

// Define Event interface for approval rules and conditions
export interface WorkflowEvent {
  id?: string;
  name?: string;
  autoActivate?: boolean;
  allowedContentTypes?: string[];
  maxDuration?: number;
  maxAccessCount?: number;
  conditions?: {
    allowedDomains?: string[];
    allowedUsers?: string[];
    timeRestrictions?: {
      allowedHours?: number[];
      allowedDays?: number[];
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Define ShareRequest interface
export interface ShareRequest {
  id: string;
  workflowId: string;
  sourceDomainId: string;
  targetDomainId: string;
  requestedBy: string;
  contentType: string;
  requestedDuration?: number;
  maxAccessCount?: number;
  requestedAt: Date;
  status: string;
  approvedAt?: Date;
  progress?: number;
  sourceDomain?: unknown;
  targetDomain?: unknown;
  workflow?: unknown;
  [key: string]: unknown;
}

// Define StepExecution interface
export interface StepExecution {
  id: string;
  shareRequestId: string;
  stepNumber: number;
  status: StepStatus;
  workflowStep: {
    id: string;
    stepType: WorkflowStepType;
    stepName: string;
    conditions?: WorkflowCondition[];
    actions?: {
      notifications?: NotificationConfig[];
      transformations?: WorkflowEvent[];
    };
    requiredUsers?: string[];
    requiredRole?: string;
    timeoutHours?: number;
    [key: string]: unknown;
  };
  shareRequest: ShareRequest;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  assignedTo?: string;
  approvedBy?: string;
  approvedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;
  retryCount?: number;
  errorMessage?: string;
  [key: string]: unknown;
}

// Define WorkflowStep interface
export interface WorkflowStep {
  id: string;
  stepType: WorkflowStepType;
  stepName: string;
  conditions?: WorkflowCondition[];
  actions?: {
    notifications?: NotificationConfig[];
    transformations?: WorkflowEvent[];
  };
  requiredUsers?: string[];
  requiredRole?: string;
  timeoutHours?: number;
  [key: string]: unknown;
}

export interface WorkflowExecution {
  id: string;
  requestId: string;
  workflowId: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  context: Record<string, unknown>;
}

export interface WorkflowCondition {
  type: 'user_role' | 'domain_property' | 'content_type' | 'time' | 'approval_count' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: unknown;
  field?: string;
}

export interface WorkflowAction {
  type: 'approve' | 'reject' | 'notify' | 'transform' | 'assign' | 'schedule' | 'custom';
  config: Record<string, unknown>;
}

export interface AutoApprovalRule {
  id: string;
  name: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  priority: number;
  isActive: boolean;
  maxDuration?: number;
  maxAccessCount?: number;
  allowedContentTypes?: string[];
  requiredPermissions?: string[];
}

export interface WorkflowMetrics {
  totalExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  stepCompletionRates: Record<string, number>;
  bottleneckSteps: Array<{ stepName: string; avgTime: number }>;
  autoApprovalRate: number;
  timeoutRate: number;
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'in_app';
  recipients: string[];
  template: string;
  conditions?: WorkflowCondition[];
  delay?: number; // Minutes to delay notification
  maxRetries?: number;
}

// Type guards for safe property access
function isShareRequest(obj: unknown): obj is ShareRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'workflowId' in obj &&
    'sourceDomainId' in obj &&
    'targetDomainId' in obj &&
    'requestedBy' in obj &&
    'contentType' in obj
  );
}

function isStepExecution(obj: unknown): obj is StepExecution {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'shareRequestId' in obj &&
    'stepNumber' in obj &&
    'status' in obj &&
    'workflowStep' in obj &&
    'shareRequest' in obj
  );
}

function isWorkflowStep(obj: unknown): obj is WorkflowStep {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'stepType' in obj &&
    'stepName' in obj
  );
}

function isWorkflowEvent(obj: unknown): obj is WorkflowEvent {
  return (
    typeof obj === 'object' &&
    obj !== null
  );
}

function hasConditions(obj: unknown): obj is { conditions: WorkflowCondition[] } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'conditions' in obj &&
    Array.isArray((obj as any).conditions)
  );
}

function hasAutoApprovalRules(obj: unknown): obj is { autoApprovalRules: WorkflowEvent[] } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'autoApprovalRules' in obj &&
    Array.isArray((obj as any).autoApprovalRules)
  );
}

export class ShareWorkflowAutomationService {
  private prisma: PrismaClient;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  // Performance thresholds
  private readonly PERFORMANCE_THRESHOLDS = {
    maxExecutionTime: 24 * 60 * 60 * 1000, // 24 hours
    maxStepRetries: 3,
    defaultTimeoutHours: 48,
    batchSize: 100,
  };

  constructor(prisma: PrismaClient, cacheService: DomainCacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
    this.initializeCronJobs();
  }

  /**
   * Initialize workflow execution
   */
  async initializeWorkflowExecution(
    requestId: string,
    workflowId: string,
    context: Record<string, unknown> = {}
  ): Promise<string> {
    const workflow = await this.prisma.shareWorkflow.findUnique({
      where: { id: workflowId },
      include: { 
        workflowSteps: { 
          orderBy: { order: 'asc' } 
        } 
      },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Create step executions for all workflow steps
    const stepExecutions = await Promise.all(
      workflow.workflowSteps.map(async (step, index) => {
        const timeoutAt = step.timeoutHours 
          ? new Date(Date.now() + step.timeoutHours * 60 * 60 * 1000)
          : new Date(Date.now() + this.PERFORMANCE_THRESHOLDS.defaultTimeoutHours * 60 * 60 * 1000);

        return this.prisma.shareStepExecution.create({
          data: {
            shareRequestId: requestId,
            workflowStepId: step.id,
            stepNumber: step.stepNumber,
            status: index === 0 ? 'pending' : 'pending',
            timeoutAt,
            inputData: JSON.parse(JSON.stringify(context)),
          },
        });
      })
    );

    // Start first step if auto-start is enabled
    if (workflow.workflowSteps.length > 0) {
      await this.executeStep(stepExecutions[0].id);
    }

    return requestId;
  }

  /**
   * Execute a workflow step
   */
  async executeStep(stepExecutionId: string): Promise<void> {
    const stepExecution = await this.prisma.shareStepExecution.findUnique({
      where: { id: stepExecutionId },
      include: {
        workflowStep: true,
        shareRequest: {
          include: {
            sourceDomain: true,
            targetDomain: true,
            workflow: true,
          },
        },
      },
    });

    if (!stepExecution) {
      throw new Error('Step execution not found');
    }

    // Check if step has already been executed
    if (stepExecution.status === 'completed' || stepExecution.status === 'failed') {
      return;
    }

    // Check for timeout
    if (stepExecution.timeoutAt && new Date() > stepExecution.timeoutAt) {
      await this.handleStepTimeout(stepExecutionId);
      return;
    }

    // Update step status to in_progress
    await this.prisma.shareStepExecution.update({
      where: { id: stepExecutionId },
      data: { status: 'in_progress' },
    });

    try {
      // Execute based on step type
      switch (stepExecution.workflowStep.stepType) {
        case 'approval':
          await this.executeApprovalStep(stepExecution);
          break;
        case 'notification':
          await this.executeNotificationStep(stepExecution);
          break;
        case 'validation':
          await this.executeValidationStep(stepExecution);
          break;
        case 'transformation':
          await this.executeTransformationStep(stepExecution);
          break;
        default:
          throw new Error(`Unknown step type: ${stepExecution.workflowStep.stepType}`);
      }
    } catch (error) {
      await this.handleStepError(stepExecutionId, error);
    }
  }

  /**
   * Execute approval step
   */
  private async executeApprovalStep(stepExecution: unknown): Promise<void> {
    if (!isStepExecution(stepExecution)) {
      throw new Error('Invalid step execution object');
    }

    const { workflowStep, shareRequest } = stepExecution;
    
    // Check auto-approval conditions
    const autoApprovalResult = await this.checkAutoApprovalConditions(
      shareRequest,
      workflowStep.conditions || []
    );

    if (autoApprovalResult.shouldAutoApprove) {
      // Auto-approve the step
      await this.completeApprovalStep(
        stepExecution.id,
        'system',
        'Auto-approved based on conditions',
        autoApprovalResult.appliedRules
      );
      return;
    }

    // Assign to appropriate users
    const assignees = await this.determineStepAssignees(workflowStep, shareRequest);
    
    if (assignees.length === 0) {
      throw new Error('No eligible approvers found for this step');
    }

    // Send approval notifications
    await this.sendApprovalNotifications(stepExecution, assignees);

    // Update step with assignment information
    await this.prisma.shareStepExecution.update({
      where: { id: stepExecution.id },
      data: {
        assignedTo: assignees[0], // Assign to first eligible user
        status: 'in_progress',
        inputData: JSON.parse(JSON.stringify({
          ...stepExecution.inputData,
          assignees,
          approvalRequired: true,
        })),
      },
    });
  }

  /**
   * Execute notification step
   */
  private async executeNotificationStep(stepExecution: unknown): Promise<void> {
    if (!isStepExecution(stepExecution)) {
      throw new Error('Invalid step execution object');
    }

    const { workflowStep, shareRequest } = stepExecution;
    const notificationConfig = workflowStep.actions?.notifications || [];

    for (const config of notificationConfig) {
      try {
        await this.sendNotification(config, shareRequest, stepExecution);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    // Mark step as completed
    await this.prisma.shareStepExecution.update({
      where: { id: stepExecution.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        outputData: JSON.parse(JSON.stringify({
          notificationsSent: notificationConfig.length,
          timestamp: new Date(),
        })),
      },
    });

    // Move to next step
    await this.progressToNextStep(stepExecution.shareRequestId, stepExecution.stepNumber);
  }

  /**
   * Execute validation step
   */
  private async executeValidationStep(stepExecution: unknown): Promise<void> {
    if (!isStepExecution(stepExecution)) {
      throw new Error('Invalid step execution object');
    }

    const { workflowStep, shareRequest } = stepExecution;
    const validationRules = workflowStep.conditions || [];

    const validationResults = await Promise.all(
      validationRules.map(async (rule: WorkflowCondition) => {
        return this.validateCondition(rule, shareRequest, stepExecution);
      })
    );

    const allValid = validationResults.every(result => result.isValid);

    if (!allValid) {
      const failedRules = validationResults
        .filter(result => !result.isValid)
        .map(result => result.rule);

      throw new Error(`Validation failed for rules: ${failedRules.join(', ')}`);
    }

    // Mark step as completed
    await this.prisma.shareStepExecution.update({
      where: { id: stepExecution.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        outputData: JSON.parse(JSON.stringify({
          validationResults,
          allValid,
          timestamp: new Date(),
        })),
      },
    });

    // Move to next step
    await this.progressToNextStep(stepExecution.shareRequestId, stepExecution.stepNumber);
  }

  /**
   * Execute transformation step
   */
  private async executeTransformationStep(stepExecution: unknown): Promise<void> {
    if (!isStepExecution(stepExecution)) {
      throw new Error('Invalid step execution object');
    }

    const { workflowStep, shareRequest } = stepExecution;
    const transformationRules = workflowStep.actions?.transformations || [];

    const transformationResults = [];

    for (const rule of transformationRules) {
      try {
        const result = await this.applyTransformation(rule, shareRequest, stepExecution);
        transformationResults.push(result);
      } catch (error) {
        console.error('Transformation failed:', error);
        transformationResults.push({
          rule: rule.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Mark step as completed
    await this.prisma.shareStepExecution.update({
      where: { id: stepExecution.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        outputData: JSON.parse(JSON.stringify({
          transformationResults,
          timestamp: new Date(),
        })),
      },
    });

    // Move to next step
    await this.progressToNextStep(stepExecution.shareRequestId, stepExecution.stepNumber);
  }

  /**
   * Complete approval step
   */
  async completeApprovalStep(
    stepExecutionId: string,
    approvedBy: string,
    comments?: string,
    appliedRules?: string[]
  ): Promise<void> {
    const stepExecution = await this.prisma.shareStepExecution.findUnique({
      where: { id: stepExecutionId },
      include: { shareRequest: true },
    });

    if (!stepExecution) {
      throw new Error('Step execution not found');
    }

    // Update step execution
    await this.prisma.shareStepExecution.update({
      where: { id: stepExecutionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        approvedBy,
        approvedAt: new Date(),
        outputData: {
          comments,
          appliedRules,
          approvalType: approvedBy === 'system' ? 'automatic' : 'manual',
          timestamp: new Date(),
        },
      },
    });

    // Progress to next step
    await this.progressToNextStep(
      stepExecution.shareRequestId,
      stepExecution.stepNumber
    );
  }

  /**
   * Progress to next step in workflow
   */
  private async progressToNextStep(requestId: string, currentStepNumber: number): Promise<void> {
    const nextStep = await this.prisma.shareStepExecution.findFirst({
      where: {
        shareRequestId: requestId,
        stepNumber: currentStepNumber + 1,
      },
    });

    if (nextStep) {
      // Execute next step
      await this.executeStep(nextStep.id);
    } else {
      // Workflow completed
      await this.completeWorkflow(requestId);
    }
  }

  /**
   * Complete workflow execution
   */
  private async completeWorkflow(requestId: string): Promise<void> {
    // Update request status
    await this.prisma.shareRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        progress: 1.0,
      },
    });

    // Send completion notifications
    await this.sendWorkflowCompletionNotifications(requestId);

    // Trigger activation if auto-activate is enabled
    const request = await this.prisma.shareRequest.findUnique({
      where: { id: requestId },
      include: { workflow: true },
    });

    if (request?.workflow?.autoApprovalRules && Array.isArray(request.workflow.autoApprovalRules)) {
      const autoApprovalRules = request.workflow.autoApprovalRules as any[];
      if (autoApprovalRules.some((rule: WorkflowEvent) => rule.autoActivate)) {
        console.log('Auto-approval rules detected, enabling immediate activation');
      }
    }
  }

  /**
   * Check auto-approval conditions
   */
  private async checkAutoApprovalConditions(shareRequest: unknown,
    conditions: unknown[]
  ): Promise<{ shouldAutoApprove: boolean; appliedRules: string[] }> {
    if (!isShareRequest(shareRequest)) {
      throw new Error('Invalid share request object');
    }

    if (!this.featureFlags.isEnabled('AUTO_APPROVAL')) {
      return { shouldAutoApprove: false, appliedRules: [] };
    }

    const workflow = await this.prisma.shareWorkflow.findUnique({
      where: { id: shareRequest.workflowId },
    });

    if (!workflow?.autoApprovalRules || 
        !Array.isArray(workflow.autoApprovalRules) || 
        workflow.autoApprovalRules.length === 0) {
      console.log('No auto-approval rules found, requiring manual review');
      return { shouldAutoApprove: false, appliedRules: [] };
    }

    const autoApprovalRules = workflow.autoApprovalRules as WorkflowEvent[];
    const appliedRules: string[] = [];

    for (const rule of autoApprovalRules) {
      if (isWorkflowEvent(rule) && rule.autoActivate && this.evaluateApprovalRule(rule, shareRequest)) {
        console.log('Auto-approval rule matched, request approved');
        appliedRules.push(rule.name || 'unnamed-rule');
      }
    }

    return {
      shouldAutoApprove: appliedRules.length > 0,
      appliedRules,
    };
  }

  /**
   * Validate workflow condition
   */
  private async validateCondition(
    condition: WorkflowCondition, shareRequest: unknown,
    stepExecution?: unknown
  ): Promise<{ isValid: boolean; rule: string; details?: unknown }> {
    if (!isShareRequest(shareRequest)) {
      throw new Error('Invalid share request object');
    }

    let actualValue: unknown;
    let isValid = false;

    switch (condition.type) {
      case 'user_role':
        const userRole = await this.getUserRole(
          shareRequest.requestedBy,
          shareRequest.sourceDomainId
        );
        actualValue = userRole;
        isValid = this.evaluateCondition(userRole, condition.operator, condition.value);
        break;

      case 'domain_property':
        const domainProperty = await this.getDomainProperty(
          shareRequest.sourceDomainId,
          condition.field!
        );
        actualValue = domainProperty;
        isValid = this.evaluateCondition(domainProperty, condition.operator, condition.value);
        break;

      case 'content_type':
        actualValue = shareRequest.contentType;
        isValid = this.evaluateCondition(actualValue, condition.operator, condition.value);
        break;

      case 'time':
        actualValue = new Date();
        if (actualValue instanceof Date) {
          isValid = this.evaluateTimeCondition(actualValue, condition);
        } else {
          isValid = false;
        }
        break;

      case 'approval_count':
        const approvalCount = await this.getApprovalCount(shareRequest.id);
        actualValue = approvalCount;
        isValid = this.evaluateCondition(approvalCount, condition.operator, condition.value);
        break;

      case 'custom':
        const customResult = await this.evaluateCustomCondition(
          condition,
          shareRequest,
          stepExecution
        );
        actualValue = customResult.value;
        isValid = customResult.isValid;
        break;

      default:
        throw new Error(`Unknown condition type: ${condition.type}`);
    }

    return {
      isValid,
      rule: `${condition.type}:${condition.field}`,
      details: { actualValue, expectedValue: condition.value },
    };
  }

  /**
   * Evaluate condition based on operator
   */
  private evaluateCondition(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return Array.isArray(actual) 
          ? actual.includes(expected)
          : String(actual).includes(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Evaluate time-based conditions
   */
  private evaluateTimeCondition(actual: Date, condition: WorkflowCondition): boolean {
    const { operator, value } = condition;
    
    switch (operator) {
      case 'greater_than':
        return actual.getTime() > new Date(String(value)).getTime();
      case 'less_than':
        return actual.getTime() < new Date(String(value)).getTime();
      default:
        return this.evaluateCondition(actual.toISOString(), operator, value);
    }
  }

  /**
   * Get workflow metrics
   */
  async getWorkflowMetrics(workflowId: string, days: number = 30): Promise<WorkflowMetrics> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const executions = await this.prisma.shareRequest.findMany({
      where: {
        workflowId,
        requestedAt: { gte: startDate, lte: endDate },
      },
      include: {
        stepExecutions: {
          include: { workflowStep: true },
        },
      },
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'approved').length;
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

    // Calculate average execution time
    const completedExecutions = executions.filter(e => e.approvedAt);
    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, exec) => {
          const time = exec.approvedAt!.getTime() - exec.requestedAt.getTime();
          return sum + time;
        }, 0) / completedExecutions.length
      : 0;

    // Calculate step completion rates
    const stepCompletionRates: Record<string, number> = {};
    const stepGroups = new Map<string, { completed: number; total: number }>();

    executions.forEach(execution => {
      execution.stepExecutions.forEach(stepExec => {
        const stepName = stepExec.workflowStep.stepName;
        if (!stepGroups.has(stepName)) {
          stepGroups.set(stepName, { completed: 0, total: 0 });
        }
        const group = stepGroups.get(stepName)!;
        group.total++;
        if (stepExec.status === 'completed') {
          group.completed++;
        }
      });
    });

    stepGroups.forEach((group, stepName) => {
      stepCompletionRates[stepName] = group.total > 0 ? group.completed / group.total : 0;
    });

    // Calculate auto-approval rate
    const autoApprovalCount = executions.filter(e => 
      e.stepExecutions.some(s => s.approvedBy === 'system')
    ).length;
    const autoApprovalRate = totalExecutions > 0 ? autoApprovalCount / totalExecutions : 0;

    // Calculate timeout rate
    const timeoutCount = executions.filter(e => 
      e.stepExecutions.some(s => s.status === 'timeout')
    ).length;
    const timeoutRate = totalExecutions > 0 ? timeoutCount / totalExecutions : 0;

    return {
      totalExecutions,
      averageExecutionTime,
      successRate,
      stepCompletionRates,
      bottleneckSteps: [], // Would be calculated based on step timing analysis
      autoApprovalRate,
      timeoutRate,
    };
  }

  /**
   * Initialize cron jobs for workflow automation
   */
  private initializeCronJobs(): void {
    // Clean up expired workflows every hour
    const cleanupJob = cron.schedule('0 * * * *', async () => {
      await this.cleanupExpiredWorkflows();
    }, { scheduled: false });

    // Process timeout steps every 15 minutes
    const timeoutJob = cron.schedule('*/15 * * * *', async () => {
      await this.processTimeoutSteps();
    }, { scheduled: false });

    // Send reminder notifications every 6 hours
    const reminderJob = cron.schedule('0 */6 * * *', async () => {
      await this.sendReminderNotifications();
    }, { scheduled: false });

    this.cronJobs.set('cleanup', cleanupJob);
    this.cronJobs.set('timeout', timeoutJob);
    this.cronJobs.set('reminder', reminderJob);

    // Start all cron jobs
    this.cronJobs.forEach(job => job.start());
  }

  /**
   * Private helper methods
   */
  private async determineStepAssignees(step: unknown, shareRequest: unknown): Promise<string[]> {
    if (!isWorkflowStep(step) || !isShareRequest(shareRequest)) {
      throw new Error('Invalid step or share request object');
    }

    const assignees: string[] = [];

    if (step.requiredUsers && step.requiredUsers.length > 0) {
      assignees.push(...step.requiredUsers);
    }

    if (step.requiredRole) {
      const roleUsers = await this.prisma.domainPermission.findMany({
        where: {
          domainId: shareRequest.targetDomainId,
          role: step.requiredRole,
        },
        select: { userId: true },
      });
      assignees.push(...roleUsers.map(u => u.userId));
    }

    return [...new Set(assignees)]; // Remove duplicates
  }

  private async sendApprovalNotifications(stepExecution: unknown, assignees: string[]): Promise<void> {
    if (!isStepExecution(stepExecution)) {
      throw new Error('Invalid step execution object');
    }
    // Implementation for sending approval notifications
    console.log(`Sending approval notifications to ${assignees.length} users`);
  }

  private async sendNotification(
    config: NotificationConfig, shareRequest: unknown, stepExecution: unknown): Promise<void> {
    if (!isShareRequest(shareRequest) || !isStepExecution(stepExecution)) {
      throw new Error('Invalid share request or step execution object');
    }
    // Implementation for sending various types of notifications
    console.log(`Sending ${config.type} notification`);
  }

  private async sendWorkflowCompletionNotifications(requestId: string): Promise<void> {
    // Implementation for sending completion notifications
    console.log(`Sending completion notifications for request ${requestId}`);
  }

  private async getUserRole(userId: string, domainId: string): Promise<string> {
    const permission = await this.prisma.domainPermission.findFirst({
      where: { userId, domainId },
      select: { role: true },
    });
    return permission?.role || 'none';
  }

  private async getDomainProperty(domainId: string, property: string): Promise<unknown> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });
    return domain ? (domain as any)[property] : null;
  }

  private async getApprovalCount(requestId: string): Promise<number> {
    const count = await this.prisma.shareStepExecution.count({
      where: {
        shareRequestId: requestId,
        status: 'completed',
        approvedBy: { not: null },
      },
    });
    return count;
  }

  private async evaluateCustomCondition(
    condition: WorkflowCondition, shareRequest: unknown,
    stepExecution?: unknown
  ): Promise<{ isValid: boolean; value: unknown }> {
    if (!isShareRequest(shareRequest)) {
      throw new Error('Invalid share request object');
    }
    // Implementation for custom condition evaluation
    // This would be extended based on specific business logic
    return { isValid: true, value: null };
  }

  private async applyTransformation(
    rule: WorkflowEvent, shareRequest: unknown, stepExecution: unknown): Promise<unknown> {
    if (!isWorkflowEvent(rule) || !isShareRequest(shareRequest) || !isStepExecution(stepExecution)) {
      throw new Error('Invalid rule, share request, or step execution object');
    }
    // Implementation for applying transformations
    // This would be extended based on specific transformation needs
    return { success: true };
  }

  private async handleStepTimeout(stepExecutionId: string): Promise<void> {
    await this.prisma.shareStepExecution.update({
      where: { id: stepExecutionId },
      data: {
        status: 'timeout',
        completedAt: new Date(),
        errorMessage: 'Step timed out',
      },
    });
  }

  private async handleStepError(stepExecutionId: string, error: unknown): Promise<void> {
    const stepExecution = await this.prisma.shareStepExecution.findUnique({
      where: { id: stepExecutionId },
    });

    if (stepExecution && stepExecution.retryCount < this.PERFORMANCE_THRESHOLDS.maxStepRetries) {
      // Retry the step
      await this.prisma.shareStepExecution.update({
        where: { id: stepExecutionId },
        data: {
          retryCount: { increment: 1 },
          status: 'pending',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Schedule retry
      setTimeout(() => this.executeStep(stepExecutionId), 60000); // Retry in 1 minute
    } else {
      // Mark as failed
      await this.prisma.shareStepExecution.update({
        where: { id: stepExecutionId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async cleanupExpiredWorkflows(): Promise<void> {
    const expiredRequests = await this.prisma.shareRequest.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ['pending', 'in_review'] },
      },
    });

    for (const request of expiredRequests) {
      await this.prisma.shareRequest.update({
        where: { id: request.id },
        data: { status: 'expired' },
      });
    }
  }

  private async processTimeoutSteps(): Promise<void> {
    const timeoutSteps = await this.prisma.shareStepExecution.findMany({
      where: {
        timeoutAt: { lt: new Date() },
        status: { in: ['pending', 'in_progress'] },
      },
    });

    for (const step of timeoutSteps) {
      await this.handleStepTimeout(step.id);
    }
  }

  private async sendReminderNotifications(): Promise<void> {
    const pendingSteps = await this.prisma.shareStepExecution.findMany({
      where: {
        status: 'in_progress',
        assignedTo: { not: null },
        startedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24 hours
      },
      include: {
        shareRequest: {
          include: { sourceDomain: true, targetDomain: true },
        },
      },
    });

    for (const step of pendingSteps) {
      // Send reminder notification
      console.log(`Sending reminder for step ${step.id} to ${step.assignedTo}`);
    }
  }

  /**
   * Cleanup method to stop all cron jobs
   */
  cleanup(): void {
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs.clear();
  }

  /**
   * Evaluate approval rule against a share request
   */
  private evaluateApprovalRule(rule: WorkflowEvent, shareRequest: unknown): boolean {
    if (!isWorkflowEvent(rule) || !isShareRequest(shareRequest)) {
      return false;
    }

    try {
      // Basic rule evaluation logic
      if (!rule || !rule.conditions) {
        return false;
      }

      // Check content type restrictions
      if (rule.allowedContentTypes && rule.allowedContentTypes.length > 0) {
        if (!rule.allowedContentTypes.includes(shareRequest.contentType)) {
          return false;
        }
      }

      // Check duration limits
      if (rule.maxDuration && shareRequest.requestedDuration && shareRequest.requestedDuration > rule.maxDuration) {
        return false;
      }

      // Check access count limits
      if (rule.maxAccessCount && shareRequest.maxAccessCount && shareRequest.maxAccessCount > rule.maxAccessCount) {
        return false;
      }

      // Check user/domain-based conditions
      if (rule.conditions.allowedDomains) {
        if (!rule.conditions.allowedDomains.includes(shareRequest.sourceDomainId)) {
          return false;
        }
      }

      if (rule.conditions.allowedUsers) {
        if (!rule.conditions.allowedUsers.includes(shareRequest.requestedBy)) {
          return false;
        }
      }

      // Check time-based conditions
      if (rule.conditions.timeRestrictions) {
        const now = new Date();
        const currentHour = now.getHours();
        const dayOfWeek = now.getDay();

        if (rule.conditions.timeRestrictions.allowedHours) {
          if (!rule.conditions.timeRestrictions.allowedHours.includes(currentHour)) {
            return false;
          }
        }

        if (rule.conditions.timeRestrictions.allowedDays) {
          if (!rule.conditions.timeRestrictions.allowedDays.includes(dayOfWeek)) {
            return false;
          }
        }
      }

      // If all conditions pass, approve
      return true;
    } catch (error) {
      console.error('Error evaluating approval rule:', error);
      return false;
    }
  }
}

export default ShareWorkflowAutomationService; 
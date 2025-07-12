/**
 * Share Workflow Automation Service
 * Handles complex approval workflows, automatic step execution, and condition-based processing
 */
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
export type WorkflowStepType = 'approval' | 'notification' | 'validation' | 'transformation';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'timeout';
export type WorkflowTrigger = 'manual' | 'scheduled' | 'condition' | 'external';
export interface WorkflowExecution {
    id: string;
    requestId: string;
    workflowId: string;
    currentStep: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    startedAt: Date;
    completedAt?: Date;
    errorMessage?: string;
    context: Record<string, any>;
}
export interface StepExecution {
    id: string;
    stepId: string;
    requestId: string;
    status: StepStatus;
    startedAt: Date;
    completedAt?: Date;
    assignedTo?: string;
    inputData?: any;
    outputData?: any;
    errorMessage?: string;
    retryCount: number;
    timeoutAt?: Date;
}
export interface WorkflowCondition {
    type: 'user_role' | 'domain_property' | 'content_type' | 'time' | 'approval_count' | 'custom';
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
    field?: string;
}
export interface WorkflowAction {
    type: 'approve' | 'reject' | 'notify' | 'transform' | 'assign' | 'schedule' | 'custom';
    config: Record<string, any>;
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
    bottleneckSteps: Array<{
        stepName: string;
        avgTime: number;
    }>;
    autoApprovalRate: number;
    timeoutRate: number;
}
export interface NotificationConfig {
    type: 'email' | 'slack' | 'webhook' | 'sms' | 'in_app';
    recipients: string[];
    template: string;
    conditions?: WorkflowCondition[];
    delay?: number;
    maxRetries?: number;
}
export declare class ShareWorkflowAutomationService {
    private prisma;
    private cacheService;
    private featureFlags;
    private cronJobs;
    private readonly PERFORMANCE_THRESHOLDS;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Initialize workflow execution
     */
    initializeWorkflowExecution(requestId: string, workflowId: string, context?: Record<string, any>): Promise<string>;
    /**
     * Execute a workflow step
     */
    executeStep(stepExecutionId: string): Promise<void>;
    /**
     * Execute approval step
     */
    private executeApprovalStep;
    /**
     * Execute notification step
     */
    private executeNotificationStep;
    /**
     * Execute validation step
     */
    private executeValidationStep;
    /**
     * Execute transformation step
     */
    private executeTransformationStep;
    /**
     * Complete approval step
     */
    completeApprovalStep(stepExecutionId: string, approvedBy: string, comments?: string, appliedRules?: string[]): Promise<void>;
    /**
     * Progress to next step in workflow
     */
    private progressToNextStep;
    /**
     * Complete workflow execution
     */
    private completeWorkflow;
    /**
     * Check auto-approval conditions
     */
    private checkAutoApprovalConditions;
    /**
     * Validate workflow condition
     */
    private validateCondition;
    /**
     * Evaluate condition based on operator
     */
    private evaluateCondition;
    /**
     * Evaluate time-based conditions
     */
    private evaluateTimeCondition;
    /**
     * Get workflow metrics
     */
    getWorkflowMetrics(workflowId: string, days?: number): Promise<WorkflowMetrics>;
    /**
     * Initialize cron jobs for workflow automation
     */
    private initializeCronJobs;
    /**
     * Private helper methods
     */
    private determineStepAssignees;
    private sendApprovalNotifications;
    private sendNotification;
    private sendWorkflowCompletionNotifications;
    private getUserRole;
    private getDomainProperty;
    private getApprovalCount;
    private evaluateCustomCondition;
    private applyTransformation;
    private handleStepTimeout;
    private handleStepError;
    private cleanupExpiredWorkflows;
    private processTimeoutSteps;
    private sendReminderNotifications;
    /**
     * Cleanup method to stop all cron jobs
     */
    cleanup(): void;
    /**
     * Evaluate approval rule against a share request
     */
    private evaluateApprovalRule;
}
export default ShareWorkflowAutomationService;
//# sourceMappingURL=ShareWorkflowAutomationService.d.ts.map
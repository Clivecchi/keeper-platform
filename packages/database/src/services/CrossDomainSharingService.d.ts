/**
 * Cross-Domain Sharing Service
 * Manages secure sharing and collaboration between domains with approval workflows
 */
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
export type ContentType = 'keeper' | 'journey' | 'moment' | 'memory' | 'custom';
export type RequestType = 'share' | 'collaborate' | 'transfer';
export type ShareStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type WorkflowStepType = 'approval' | 'notification' | 'validation' | 'transformation';
export type AccessLevel = 'read' | 'write' | 'admin';
export type ActivationType = 'direct' | 'link' | 'embedded';
export type NotificationType = 'request_submitted' | 'approval_needed' | 'approved' | 'rejected' | 'expired';
export interface ShareRequestInput {
    sourceDomainId: string;
    targetDomainId: string;
    contentType: ContentType;
    contentId: string;
    requestType?: RequestType;
    permissions?: string[];
    accessLevel?: AccessLevel;
    requestedDuration?: number;
    title?: string;
    description?: string;
    justification?: string;
    urgency?: 'low' | 'normal' | 'high' | 'urgent';
    useTemplate?: string;
    workflowId?: string;
}
export interface WorkflowDefinition {
    name: string;
    description?: string;
    workflowType: 'content_share' | 'memory_share' | 'collaboration';
    requiresApproval: boolean;
    approvalSteps: WorkflowStep[];
    autoApprovalRules?: AutoApprovalRule[];
    defaultExpirationDays?: number;
    maxAccessCount?: number;
    allowSubsharing?: boolean;
    contentFilters?: ContentFilter[];
    accessRestrictions?: AccessRestriction[];
    auditLevel: 'minimal' | 'standard' | 'comprehensive';
}
export interface WorkflowStep {
    stepNumber: number;
    stepName: string;
    stepType: WorkflowStepType;
    requiredRole?: string;
    requiredUsers?: string[];
    requireAllUsers?: boolean;
    conditions?: any;
    actions?: any;
    timeoutHours?: number;
}
export interface AutoApprovalRule {
    id: string;
    name: string;
    conditions: Record<string, unknown>;
    maxDuration?: number;
    maxAccessCount?: number;
    allowedContentTypes?: ContentType[];
}
export interface ContentFilter {
    id: string;
    name: string;
    filterType: 'include' | 'exclude' | 'transform';
    patterns: string[];
    conditions?: any;
}
export interface AccessRestriction {
    id: string;
    name: string;
    restrictionType: 'ip' | 'time' | 'user' | 'session';
    config: Record<string, unknown>;
}
export interface ShareTemplate {
    name: string;
    description?: string;
    templateType: 'quick_share' | 'collaboration' | 'public_share' | 'time_limited';
    permissions: string[];
    accessLevel: AccessLevel;
    defaultDuration?: number;
    maxAccess?: number;
    workflowId?: string;
    requireApproval?: boolean;
    autoActivate?: boolean;
    allowSubsharing?: boolean;
    contentFilters?: ContentFilter[];
    accessRestrictions?: AccessRestriction[];
    contentTypes?: ContentType[];
}
export interface ShareActivationConfig {
    activationType: ActivationType;
    ipRestrictions?: string[];
    userRestrictions?: string[];
    sessionTimeout?: number;
    generateLink?: boolean;
    generateEmbed?: boolean;
}
export interface CollaborationConfig {
    name: string;
    description?: string;
    collaborationType: 'project' | 'temporary' | 'ongoing';
    memberDomainIds: string[];
    permissions: Record<string, unknown>;
    sharedResources: Record<string, unknown>;
    accessRules: Record<string, unknown>;
    startDate?: Date;
    endDate?: Date;
    auditLevel?: string;
    requireMFA?: boolean;
    allowedIPs?: string[];
}
export interface ShareMetrics {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    expiredRequests: number;
    activeShares: number;
    avgApprovalTime: number;
    avgAccessCount: number;
    topContentTypes: Array<{
        type: ContentType;
        count: number;
    }>;
    topTargetDomains: Array<{
        domainId: string;
        count: number;
    }>;
}
export interface ShareRequestFilter {
    sourceDomainId?: string;
    targetDomainId?: string;
    status?: ShareStatus;
    contentType?: ContentType;
    OR?: Array<{
        sourceDomainId?: string;
        targetDomainId?: string;
    }>;
}
export declare class CrossDomainSharingService {
    private prisma;
    private cacheService;
    private featureFlags;
    private readonly CACHE_TTL;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Create a share request
     */
    createShareRequest(input: ShareRequestInput, requestedBy: string): Promise<string>;
    /**
     * Process share request approval
     */
    approveShareRequest(requestId: string, approvedBy: string, comments?: string): Promise<void>;
    /**
     * Reject share request
     */
    rejectShareRequest(requestId: string, rejectedBy: string, rejectionReason: string): Promise<void>;
    /**
     * Activate an approved share
     */
    activateShare(requestId: string, activatedBy: string, config?: ShareActivationConfig): Promise<string>;
    /**
     * Access shared content
     */
    accessSharedContent(accessToken: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<unknown>;
    /**
     * Create a workflow
     */
    createWorkflow(sourceDomainId: string, definition: WorkflowDefinition, createdBy: string): Promise<string>;
    /**
     * Create a share template
     */
    createTemplate(domainId: string, template: ShareTemplate, createdBy: string): Promise<string>;
    /**
     * Create cross-domain collaboration
     */
    createCollaboration(hostDomainId: string, config: CollaborationConfig, createdBy: string): Promise<string>;
    /**
     * Get share metrics for domain
     */
    getShareMetrics(domainId: string, days?: number): Promise<ShareMetrics>;
    /**
     * List share requests for domain
     */
    listShareRequests(domainId: string, filters?: {
        status?: ShareStatus;
        contentType?: ContentType;
        direction?: 'incoming' | 'outgoing' | 'both';
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    /**
     * Get sharing analytics for domain
     */
    getSharingAnalytics(domainId: string, options: {
        period: string;
        type: string;
    }): Promise<{
        period: string;
        type: string;
        totalShares: number;
        activeShares: number;
        pendingRequests: number;
        approvedRequests: number;
        rejectedRequests: number;
        avgApprovalTime: number;
        topContentTypes: Array<{
            type: ContentType;
            count: number;
        }>;
        topTargetDomains: Array<{
            domainId: string;
            count: number;
        }>;
        shareTrends: Array<{
            date: string;
            count: number;
        }>;
        accessMetrics: {
            totalAccesses: number;
            uniqueUsers: number;
            avgSessionDuration: number;
        };
    }>;
    /**
     * Get sharing health status for domain
     */
    getSharingHealth(domainId: string): Promise<{
        domainId: string;
        status: 'healthy' | 'warning' | 'critical';
        score: number;
        metrics: {
            totalRequests: number;
            pendingRequests: number;
            expiredRequests: number;
            activeShares: number;
            avgApprovalTime: number;
            securityScore: number;
        };
        issues: Array<{
            type: 'security' | 'performance' | 'compliance' | 'access';
            severity: 'low' | 'medium' | 'high' | 'critical';
            message: string;
            recommendation: string;
        }>;
        lastChecked: Date;
    }>;
    /**
     * Private helper methods
     */
    private validateDomains;
    private validateUserPermissions;
    private getWorkflow;
    private getTemplate;
    private initializeWorkflow;
    private executeWorkflowStep;
    private validateAccessRestrictions;
    private logShareAccess;
    private sendShareNotifications;
    private sendCollaborationInvitations;
    private invalidateShareCache;
}
export default CrossDomainSharingService;
//# sourceMappingURL=CrossDomainSharingService.d.ts.map
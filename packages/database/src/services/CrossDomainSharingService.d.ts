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
    conditions: any;
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
    config: any;
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
    permissions: Record<string, any>;
    sharedResources: Record<string, any>;
    accessRules: Record<string, any>;
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
    accessSharedContent(accessToken: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<any>;
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
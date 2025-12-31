/**
 * Cross-Domain Sharing Service
 * Manages secure sharing and collaboration between domains with approval workflows
 */
import { getFeatureFlagService } from './FeatureFlagService';
import * as crypto from 'crypto';
export class CrossDomainSharingService {
    constructor(prisma, cacheService) {
        this.featureFlags = getFeatureFlagService();
        // Cache TTL settings
        this.CACHE_TTL = {
            workflow: 3600, // 1 hour
            template: 1800, // 30 minutes
            request: 900, // 15 minutes
            activation: 600, // 10 minutes
        };
        this.prisma = prisma;
        this.cacheService = cacheService;
    }
    /**
     * Create a share request
     */
    async createShareRequest(input, requestedBy) {
        if (!this.featureFlags.isEnabled('CROSS_DOMAIN_SHARING')) {
            throw new Error('Cross-domain sharing is not enabled');
        }
        // Validate domains
        await this.validateDomains(input.sourceDomainId, input.targetDomainId);
        // Validate user permissions
        await this.validateUserPermissions(input.sourceDomainId, requestedBy, 'share');
        // Get workflow if specified
        let workflow = null;
        if (input.workflowId) {
            workflow = await this.getWorkflow(input.workflowId);
        }
        else if (input.useTemplate) {
            const template = await this.getTemplate(input.useTemplate);
            if (template && typeof template === 'object' && 'workflowId' in template) {
                workflow = await this.getWorkflow(template.workflowId);
            }
        }
        // Determine expiration
        const expiresAt = input.requestedDuration
            ? new Date(Date.now() + input.requestedDuration * 24 * 60 * 60 * 1000)
            : workflow && typeof workflow === 'object' && 'defaultExpirationDays' in workflow
                ? new Date(Date.now() + workflow.defaultExpirationDays * 24 * 60 * 60 * 1000)
                : null;
        // Create share request
        const shareRequest = await this.prisma.shareRequest.create({
            data: {
                workflowId: workflow && typeof workflow === 'object' && 'id' in workflow ? workflow.id : null,
                sourceDomainId: input.sourceDomainId,
                targetDomainId: input.targetDomainId,
                contentType: input.contentType,
                contentId: input.contentId,
                requestType: input.requestType || 'share',
                permissions: input.permissions || [],
                accessLevel: input.accessLevel || 'read',
                requestedDuration: input.requestedDuration,
                expiresAt,
                title: input.title,
                description: input.description,
                justification: input.justification,
                urgency: input.urgency || 'normal',
                requestedBy,
                status: workflow && typeof workflow === 'object' && 'requiresApproval' in workflow && workflow.requiresApproval ? 'pending' : 'approved',
            },
        });
        // Initialize workflow if present
        if (workflow && typeof workflow === 'object' && workflow !== null) {
            await this.initializeWorkflow(shareRequest.id, workflow);
        }
        // Auto-approve if workflow doesn't require approval
        if (!workflow || !(typeof workflow === 'object' && workflow !== null && 'requiresApproval' in workflow && workflow.requiresApproval)) {
            await this.activateShare(shareRequest.id, requestedBy);
        }
        // Send notifications
        await this.sendShareNotifications(shareRequest.id, 'request_submitted');
        // Invalidate cache
        await this.invalidateShareCache(input.sourceDomainId, input.targetDomainId);
        return shareRequest.id;
    }
    /**
     * Process share request approval
     */
    async approveShareRequest(requestId, approvedBy, comments) {
        const request = await this.prisma.shareRequest.findUnique({
            where: { id: requestId },
            include: { workflow: true },
        });
        if (!request) {
            throw new Error('Share request not found');
        }
        if (request.status !== 'pending' && request.status !== 'in_review') {
            throw new Error(`Cannot approve request with status: ${request.status}`);
        }
        // Check approval permissions
        await this.validateUserPermissions(request.targetDomainId, approvedBy, 'approve');
        // Update request status
        await this.prisma.shareRequest.update({
            where: { id: requestId },
            data: {
                status: 'approved',
                approvedBy,
                approvedAt: new Date(),
                progress: 1.0,
            },
        });
        // Execute workflow step if present
        if (request.workflow) {
            await this.executeWorkflowStep(requestId, request.currentStep, approvedBy);
        }
        // Activate the share
        await this.activateShare(requestId, approvedBy);
        // Send approval notifications
        await this.sendShareNotifications(requestId, 'approved');
        // Invalidate cache
        await this.invalidateShareCache(request.sourceDomainId, request.targetDomainId);
    }
    /**
     * Reject share request
     */
    async rejectShareRequest(requestId, rejectedBy, rejectionReason) {
        const request = await this.prisma.shareRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new Error('Share request not found');
        }
        // Check rejection permissions
        await this.validateUserPermissions(request.targetDomainId, rejectedBy, 'approve');
        // Update request status
        await this.prisma.shareRequest.update({
            where: { id: requestId },
            data: {
                status: 'rejected',
                rejectedBy,
                rejectedAt: new Date(),
                rejectionReason,
            },
        });
        // Send rejection notifications
        await this.sendShareNotifications(requestId, 'rejected');
        // Invalidate cache
        await this.invalidateShareCache(request.sourceDomainId, request.targetDomainId);
    }
    /**
     * Activate an approved share
     */
    async activateShare(requestId, activatedBy, config) {
        const request = await this.prisma.shareRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new Error('Share request not found');
        }
        if (request.status !== 'approved') {
            throw new Error('Only approved requests can be activated');
        }
        // Generate access token
        const accessToken = crypto.randomBytes(32).toString('hex');
        const accessUrl = config?.generateLink
            ? `https://keeper.tools/shared/${accessToken}`
            : null;
        const embedCode = config?.generateEmbed
            ? `<iframe src="https://keeper.tools/embed/${accessToken}"></iframe>`
            : null;
        // Create activation
        const activation = await this.prisma.shareActivation.create({
            data: {
                shareRequestId: requestId,
                activationType: config?.activationType || 'direct',
                accessToken,
                accessUrl,
                embedCode,
                ipRestrictions: config?.ipRestrictions || [],
                userRestrictions: config?.userRestrictions || [],
                sessionTimeout: config?.sessionTimeout,
                activatedBy,
                expiresAt: request.expiresAt,
            },
        });
        // Update request status
        await this.prisma.shareRequest.update({
            where: { id: requestId },
            data: {
                activatedAt: new Date(),
                status: 'approved',
            },
        });
        return activation.accessToken;
    }
    /**
     * Access shared content
     */
    async accessSharedContent(accessToken, userId, ipAddress, userAgent) {
        const activation = await this.prisma.shareActivation.findUnique({
            where: { accessToken },
            include: {
                shareRequest: {
                    include: {
                        sourceDomain: true,
                        targetDomain: true,
                    },
                },
            },
        });
        if (!activation) {
            throw new Error('Invalid access token');
        }
        if (activation.expiresAt && new Date() > activation.expiresAt) {
            throw new Error('Share has expired');
        }
        if (activation.deactivatedAt) {
            throw new Error('Share has been deactivated');
        }
        // Validate access restrictions
        await this.validateAccessRestrictions(activation, userId, ipAddress);
        // Log access
        await this.logShareAccess(activation.id, userId, ipAddress, userAgent, 'view');
        // Update access count
        await this.prisma.shareActivation.update({
            where: { id: activation.id },
            data: {
                accessCount: { increment: 1 },
                lastAccessedAt: new Date(),
                lastAccessedBy: userId,
                lastAccessIP: ipAddress,
            },
        });
        // Update request access tracking
        await this.prisma.shareRequest.update({
            where: { id: activation.shareRequestId },
            data: {
                accessCount: { increment: 1 },
                lastAccessedAt: new Date(),
                lastAccessedBy: userId,
            },
        });
        // Return access information
        return {
            shareRequest: activation.shareRequest,
            permissions: activation.shareRequest.permissions,
            accessLevel: activation.shareRequest.accessLevel,
            expiresAt: activation.expiresAt,
            accessCount: activation.accessCount + 1,
        };
    }
    /**
     * Create a workflow
     */
    async createWorkflow(sourceDomainId, definition, createdBy) {
        // Validate domain permissions
        await this.validateUserPermissions(sourceDomainId, createdBy, 'admin');
        // Create workflow
        const workflow = await this.prisma.shareWorkflow.create({
            data: {
                name: definition.name,
                description: definition.description,
                workflowType: definition.workflowType,
                requiresApproval: definition.requiresApproval,
                autoApprovalRules: JSON.stringify(definition.autoApprovalRules || []),
                approvalSteps: JSON.stringify(definition.approvalSteps || []),
                defaultExpirationDays: definition.defaultExpirationDays,
                maxAccessCount: definition.maxAccessCount,
                allowSubsharing: definition.allowSubsharing || false,
                sourceDomainId,
                contentFilters: JSON.stringify(definition.contentFilters || []),
                accessRestrictions: JSON.stringify(definition.accessRestrictions || []),
                auditLevel: definition.auditLevel,
                createdBy,
            },
        });
        // Create workflow steps
        for (const step of definition.approvalSteps) {
            await this.prisma.shareWorkflowStep.create({
                data: {
                    workflowId: workflow.id,
                    stepNumber: step.stepNumber,
                    stepName: step.stepName,
                    stepType: step.stepType,
                    requiredRole: step.requiredRole,
                    requiredUsers: step.requiredUsers || [],
                    requireAllUsers: step.requireAllUsers || false,
                    conditions: step.conditions,
                    actions: step.actions,
                    timeoutHours: step.timeoutHours,
                    order: step.stepNumber,
                },
            });
        }
        // Cache the workflow
        await this.cacheService.cacheData(`workflow:${workflow.id}`, workflow, this.CACHE_TTL.workflow);
        return workflow.id;
    }
    /**
     * Create a share template
     */
    async createTemplate(domainId, template, createdBy) {
        // Validate permissions
        await this.validateUserPermissions(domainId, createdBy, 'admin');
        const shareTemplate = await this.prisma.shareTemplate.create({
            data: {
                name: template.name,
                description: template.description,
                templateType: template.templateType,
                permissions: template.permissions,
                accessLevel: template.accessLevel,
                defaultDuration: template.defaultDuration,
                maxAccess: template.maxAccess,
                workflowId: template.workflowId,
                requireApproval: template.requireApproval || false,
                autoActivate: template.autoActivate || false,
                allowSubsharing: template.allowSubsharing || false,
                contentFilters: JSON.stringify(template.contentFilters || []),
                accessRestrictions: JSON.stringify(template.accessRestrictions || []),
                domainId,
                contentTypes: template.contentTypes || [],
                createdBy,
            },
        });
        // Cache the template
        await this.cacheService.cacheData(`template:${shareTemplate.id}`, shareTemplate, this.CACHE_TTL.template);
        return shareTemplate.id;
    }
    /**
     * Create cross-domain collaboration
     */
    async createCollaboration(hostDomainId, config, createdBy) {
        // Validate permissions
        await this.validateUserPermissions(hostDomainId, createdBy, 'admin');
        // Validate member domains
        for (const domainId of config.memberDomainIds) {
            await this.validateDomains(hostDomainId, domainId);
        }
        // Create collaboration
        const collaboration = await this.prisma.crossDomainCollaboration.create({
            data: {
                name: config.name,
                description: config.description,
                collaborationType: config.collaborationType,
                hostDomainId,
                memberDomainIds: config.memberDomainIds,
                invitedDomainIds: config.memberDomainIds, // Initially invite all members
                permissions: JSON.parse(JSON.stringify(config.permissions)),
                sharedResources: JSON.parse(JSON.stringify(config.sharedResources)),
                accessRules: JSON.parse(JSON.stringify(config.accessRules)),
                startDate: config.startDate,
                endDate: config.endDate,
                auditLevel: config.auditLevel || 'standard',
                requireMFA: config.requireMFA || false,
                allowedIPs: config.allowedIPs || [],
                createdBy,
            },
        });
        // Send collaboration invitations
        await this.sendCollaborationInvitations(collaboration.id);
        return collaboration.id;
    }
    /**
     * Get share metrics for domain
     */
    async getShareMetrics(domainId, days = 30) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        // Get basic counts
        const [totalRequests, pendingRequests, approvedRequests, rejectedRequests, expiredRequests,] = await Promise.all([
            this.prisma.shareRequest.count({
                where: {
                    OR: [{ sourceDomainId: domainId }, { targetDomainId: domainId }],
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    targetDomainId: domainId,
                    status: 'pending',
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    OR: [{ sourceDomainId: domainId }, { targetDomainId: domainId }],
                    status: 'approved',
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    OR: [{ sourceDomainId: domainId }, { targetDomainId: domainId }],
                    status: 'rejected',
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    OR: [{ sourceDomainId: domainId }, { targetDomainId: domainId }],
                    status: 'expired',
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
        ]);
        // Get active shares
        const activeShares = await this.prisma.shareActivation.count({
            where: {
                expiresAt: { gt: new Date() },
                deactivatedAt: null,
                shareRequest: {
                    OR: [{ sourceDomainId: domainId }, { targetDomainId: domainId }],
                },
            },
        });
        // Calculate average approval time
        const approvedRequestsWithTimes = await this.prisma.shareRequest.findMany({
            where: {
                targetDomainId: domainId,
                status: 'approved',
                requestedAt: { gte: startDate, lte: endDate },
                approvedAt: { not: null },
            },
            select: { requestedAt: true, approvedAt: true },
        });
        const avgApprovalTime = approvedRequestsWithTimes.length > 0
            ? approvedRequestsWithTimes.reduce((sum, req) => {
                const approvalTime = req.approvedAt.getTime() - req.requestedAt.getTime();
                return sum + approvalTime;
            }, 0) / approvedRequestsWithTimes.length / (1000 * 60 * 60) // Convert to hours
            : 0;
        // Get content type breakdown
        const contentTypeStats = await this.prisma.shareRequest.groupBy({
            by: ['contentType'],
            where: {
                sourceDomainId: domainId,
                requestedAt: { gte: startDate, lte: endDate },
            },
            _count: { contentType: true },
            orderBy: { _count: { contentType: 'desc' } },
        });
        // Get target domain breakdown
        const targetDomainStats = await this.prisma.shareRequest.groupBy({
            by: ['targetDomainId'],
            where: {
                sourceDomainId: domainId,
                requestedAt: { gte: startDate, lte: endDate },
            },
            _count: { targetDomainId: true },
            orderBy: { _count: { targetDomainId: 'desc' } },
        });
        return {
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            expiredRequests,
            activeShares,
            avgApprovalTime,
            avgAccessCount: 0, // Would be calculated from access data
            topContentTypes: contentTypeStats.map(stat => ({
                type: stat.contentType,
                count: stat._count.contentType,
            })),
            topTargetDomains: targetDomainStats.map(stat => ({
                domainId: stat.targetDomainId,
                count: stat._count.targetDomainId,
            })),
        };
    }
    /**
     * List share requests for domain
     */
    async listShareRequests(domainId, filters = {}) {
        const whereClause = {};
        if (filters.direction === 'incoming') {
            whereClause.targetDomainId = domainId;
        }
        else if (filters.direction === 'outgoing') {
            whereClause.sourceDomainId = domainId;
        }
        else {
            whereClause.OR = [
                { sourceDomainId: domainId },
                { targetDomainId: domainId },
            ];
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.contentType) {
            whereClause.contentType = filters.contentType;
        }
        const requests = await this.prisma.shareRequest.findMany({
            where: whereClause,
            include: {
                workflow: true,
            },
            orderBy: { requestedAt: 'desc' },
            take: filters.limit || 50,
            skip: filters.offset || 0,
        });
        return requests;
    }
    /**
     * Get sharing analytics for domain
     */
    async getSharingAnalytics(domainId, options) {
        const { period, type } = options;
        // Parse period to get date range
        const days = parseInt(period.replace('d', '')) || 7;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        // Get basic metrics
        const [totalShares, activeShares, pendingRequests, approvedRequests, rejectedRequests] = await Promise.all([
            this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareActivation.count({
                where: {
                    expiresAt: { gt: new Date() },
                    deactivatedAt: null,
                    shareRequest: { sourceDomainId: domainId },
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    status: 'pending',
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    status: 'approved',
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    status: 'rejected',
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
        ]);
        // Calculate average approval time
        const approvedRequestsWithTimes = await this.prisma.shareRequest.findMany({
            where: {
                sourceDomainId: domainId,
                status: 'approved',
                requestedAt: { gte: startDate, lte: endDate },
                approvedAt: { not: null },
            },
            select: { requestedAt: true, approvedAt: true },
        });
        const avgApprovalTime = approvedRequestsWithTimes.length > 0
            ? approvedRequestsWithTimes.reduce((sum, req) => {
                const approvalTime = req.approvedAt.getTime() - req.requestedAt.getTime();
                return sum + approvalTime;
            }, 0) / approvedRequestsWithTimes.length / (1000 * 60 * 60) // Convert to hours
            : 0;
        // Get content type breakdown
        const contentTypeStats = await this.prisma.shareRequest.groupBy({
            by: ['contentType'],
            where: {
                sourceDomainId: domainId,
                requestedAt: { gte: startDate, lte: endDate },
            },
            _count: { contentType: true },
            orderBy: { _count: { contentType: 'desc' } },
        });
        // Get target domain breakdown
        const targetDomainStats = await this.prisma.shareRequest.groupBy({
            by: ['targetDomainId'],
            where: {
                sourceDomainId: domainId,
                requestedAt: { gte: startDate, lte: endDate },
            },
            _count: { targetDomainId: true },
            orderBy: { _count: { targetDomainId: 'desc' } },
        });
        // Generate share trends (daily for the period)
        const shareTrends = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
            const count = await this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    requestedAt: { gte: date, lt: nextDate },
                },
            });
            shareTrends.push({
                date: date.toISOString().split('T')[0],
                count,
            });
        }
        // Get access metrics
        const accessLogs = await this.prisma.shareAccessLog.findMany({
            where: {
                shareActivation: {
                    shareRequest: { sourceDomainId: domainId },
                },
                accessedAt: { gte: startDate, lte: endDate },
            },
            select: { userId: true, accessedAt: true },
        });
        const uniqueUsers = new Set(accessLogs.map(log => log.userId).filter(Boolean)).size;
        const totalAccesses = accessLogs.length;
        const avgSessionDuration = 0; // Would be calculated from session data
        return {
            period,
            type,
            totalShares,
            activeShares,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            avgApprovalTime,
            topContentTypes: contentTypeStats.map(stat => ({
                type: stat.contentType,
                count: stat._count.contentType,
            })),
            topTargetDomains: targetDomainStats.map(stat => ({
                domainId: stat.targetDomainId,
                count: stat._count.targetDomainId,
            })),
            shareTrends,
            accessMetrics: {
                totalAccesses,
                uniqueUsers,
                avgSessionDuration,
            },
        };
    }
    /**
     * Get sharing health status for domain
     */
    async getSharingHealth(domainId) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        // Get basic metrics
        const [totalRequests, pendingRequests, expiredRequests, activeShares] = await Promise.all([
            this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    status: 'pending',
                },
            }),
            this.prisma.shareRequest.count({
                where: {
                    sourceDomainId: domainId,
                    status: 'expired',
                    requestedAt: { gte: startDate, lte: endDate },
                },
            }),
            this.prisma.shareActivation.count({
                where: {
                    expiresAt: { gt: new Date() },
                    deactivatedAt: null,
                    shareRequest: { sourceDomainId: domainId },
                },
            }),
        ]);
        // Calculate average approval time
        const approvedRequestsWithTimes = await this.prisma.shareRequest.findMany({
            where: {
                sourceDomainId: domainId,
                status: 'approved',
                requestedAt: { gte: startDate, lte: endDate },
                approvedAt: { not: null },
            },
            select: { requestedAt: true, approvedAt: true },
        });
        const avgApprovalTime = approvedRequestsWithTimes.length > 0
            ? approvedRequestsWithTimes.reduce((sum, req) => {
                const approvalTime = req.approvedAt.getTime() - req.requestedAt.getTime();
                return sum + approvalTime;
            }, 0) / approvedRequestsWithTimes.length / (1000 * 60 * 60) // Convert to hours
            : 0;
        // Calculate security score based on various factors
        const securityIssues = await this.prisma.shareAccessLog.findMany({
            where: {
                shareActivation: {
                    shareRequest: { sourceDomainId: domainId },
                },
                accessGranted: false,
                accessedAt: { gte: startDate, lte: endDate },
            },
        });
        const securityScore = Math.max(0, 100 - (securityIssues.length * 10));
        // Calculate overall health score
        const score = Math.round((securityScore * 0.4) +
            (Math.max(0, 100 - (pendingRequests * 5)) * 0.3) +
            (Math.max(0, 100 - (expiredRequests * 10)) * 0.3));
        // Determine status based on score
        let status;
        if (score >= 80) {
            status = 'healthy';
        }
        else if (score >= 60) {
            status = 'warning';
        }
        else {
            status = 'critical';
        }
        // Generate issues list
        const issues = [];
        if (securityIssues.length > 0) {
            issues.push({
                type: 'security',
                severity: securityIssues.length > 5 ? 'high' : 'medium',
                message: `${securityIssues.length} security violations detected`,
                recommendation: 'Review access logs and strengthen security policies',
            });
        }
        if (pendingRequests > 10) {
            issues.push({
                type: 'performance',
                severity: pendingRequests > 20 ? 'high' : 'medium',
                message: `${pendingRequests} pending share requests`,
                recommendation: 'Review and process pending requests promptly',
            });
        }
        if (expiredRequests > 5) {
            issues.push({
                type: 'compliance',
                severity: 'medium',
                message: `${expiredRequests} expired share requests`,
                recommendation: 'Clean up expired requests and review expiration policies',
            });
        }
        if (avgApprovalTime > 24) {
            issues.push({
                type: 'performance',
                severity: avgApprovalTime > 72 ? 'high' : 'medium',
                message: `Average approval time is ${avgApprovalTime.toFixed(1)} hours`,
                recommendation: 'Optimize approval workflow to reduce response time',
            });
        }
        return {
            domainId,
            status,
            score,
            metrics: {
                totalRequests,
                pendingRequests,
                expiredRequests,
                activeShares,
                avgApprovalTime,
                securityScore,
            },
            issues,
            lastChecked: new Date(),
        };
    }
    /**
     * Private helper methods
     */
    async validateDomains(sourceDomainId, targetDomainId) {
        const [sourceDomain, targetDomain] = await Promise.all([
            this.prisma.domain.findUnique({ where: { id: sourceDomainId } }),
            this.prisma.domain.findUnique({ where: { id: targetDomainId } }),
        ]);
        if (!sourceDomain) {
            throw new Error('Source domain not found');
        }
        if (!targetDomain) {
            throw new Error('Target domain not found');
        }
        if (sourceDomainId === targetDomainId) {
            throw new Error('Cannot share within the same domain');
        }
    }
    async validateUserPermissions(domainId, userId, action) {
        const permission = await this.prisma.domainPermission.findFirst({
            where: {
                domainId,
                userId,
                role: { in: ['admin', 'user'] },
            },
        });
        if (!permission) {
            throw new Error(`Insufficient permissions to ${action} in domain`);
        }
        // Check specific action permissions
        if (action === 'admin' && permission.role !== 'admin') {
            throw new Error('Admin permissions required');
        }
    }
    async getWorkflow(workflowId) {
        const cached = await this.cacheService.getData(`workflow:${workflowId}`);
        if (cached) {
            return cached;
        }
        const workflow = await this.prisma.shareWorkflow.findUnique({
            where: { id: workflowId },
            include: { workflowSteps: { orderBy: { order: 'asc' } } },
        });
        if (workflow) {
            await this.cacheService.cacheData(`workflow:${workflowId}`, workflow, this.CACHE_TTL.workflow);
        }
        return workflow;
    }
    async getTemplate(templateId) {
        const cached = await this.cacheService.getData(`template:${templateId}`);
        if (cached) {
            return cached;
        }
        const template = await this.prisma.shareTemplate.findUnique({
            where: { id: templateId },
        });
        if (template) {
            await this.cacheService.cacheData(`template:${templateId}`, template, this.CACHE_TTL.template);
        }
        return template;
    }
    async initializeWorkflow(requestId, workflow) {
        // Create step executions for all workflow steps
        if (!workflow || typeof workflow !== 'object' || !('workflowSteps' in workflow)) {
            throw new Error('Invalid workflow: missing workflowSteps');
        }
        const workflowObj = workflow;
        for (const step of workflowObj.workflowSteps) {
            await this.prisma.shareStepExecution.create({
                data: {
                    shareRequestId: requestId,
                    workflowStepId: step.id,
                    stepNumber: step.stepNumber,
                    status: step.stepNumber === 1 ? 'in_progress' : 'pending',
                    timeoutAt: step.timeoutHours
                        ? new Date(Date.now() + step.timeoutHours * 60 * 60 * 1000)
                        : null,
                },
            });
        }
    }
    async executeWorkflowStep(requestId, stepNumber, userId) {
        const request = await this.prisma.shareRequest.findUnique({
            where: { id: requestId },
            include: { workflow: true },
        });
        if (!request || !request.workflow) {
            return;
        }
        // Process workflow step - simplified for now
        console.log(`Processing workflow step ${stepNumber} for request ${requestId}`);
    }
    async validateAccessRestrictions(activation, userId, ipAddress) {
        if (!activation || typeof activation !== 'object') {
            return;
        }
        const activationObj = activation;
        // Validate IP restrictions
        if (activationObj.ipRestrictions && Array.isArray(activationObj.ipRestrictions)) {
            const ipRestrictions = activationObj.ipRestrictions;
            if (ipAddress && !ipRestrictions.includes(ipAddress)) {
                throw new Error('Access denied: IP not in allowed list');
            }
        }
        // Validate user restrictions
        if (activationObj.userRestrictions && Array.isArray(activationObj.userRestrictions)) {
            const userRestrictions = activationObj.userRestrictions;
            if (userId && !userRestrictions.includes(userId)) {
                throw new Error('Access denied: User not in allowed list');
            }
        }
    }
    async logShareAccess(activationId, userId, ipAddress, userAgent, accessType = 'view') {
        try {
            await this.prisma.shareAccessLog.create({
                data: {
                    shareActivationId: activationId,
                    userId,
                    ipAddress,
                    userAgent,
                    accessType,
                    accessedAt: new Date(),
                    accessGranted: true,
                },
            });
        }
        catch (error) {
            console.error('Failed to log share access:', error);
        }
    }
    async sendShareNotifications(requestId, notificationType) {
        // Implementation for sending notifications
        // This would integrate with email/SMS/push notification services
        console.log(`Sending ${notificationType} notification for request ${requestId}`);
    }
    async sendCollaborationInvitations(collaborationId) {
        // Implementation for sending collaboration invitations
        console.log(`Sending collaboration invitations for ${collaborationId}`);
    }
    async invalidateShareCache(sourceDomainId, targetDomainId) {
        await Promise.all([
            this.cacheService.deleteData(`share_requests:${sourceDomainId}`),
            this.cacheService.deleteData(`share_requests:${targetDomainId}`),
            this.cacheService.deleteData(`share_metrics:${sourceDomainId}`),
            this.cacheService.deleteData(`share_metrics:${targetDomainId}`),
        ]);
    }
}
export default CrossDomainSharingService;
//# sourceMappingURL=CrossDomainSharingService.js.map
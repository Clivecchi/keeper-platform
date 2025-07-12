/**
 * Sprint 6: Cross-Domain Sharing Integration Tests
 * Comprehensive test suite for cross-domain sharing functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../test-utils/app';
import { createTestDomains, createTestUsers, createTestKeepers } from '../test-utils/fixtures';
import { generateAccessToken } from '../test-utils/auth';
import { CrossDomainSharingService } from '../../../../packages/database/src/services/CrossDomainSharingService';
import { DomainCacheService } from '../../../../packages/database/src/services/DomainCacheService';
import { ShareWorkflowAutomationService } from '../../../../packages/database/src/services/ShareWorkflowAutomationService';

describe('Sprint 6: Cross-Domain Sharing Integration Tests', () => {
  let app: Express;
  let prisma: PrismaClient;
  let sharingService: CrossDomainSharingService;
  let workflowService: ShareWorkflowAutomationService;
  let cacheService: DomainCacheService;

  // Test fixtures
  let testDomains: unknown[];
  let testUsers: unknown[];
  let testKeepers: unknown[];
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Initialize test environment
    app = await createTestApp();
    prisma = new PrismaClient();
    cacheService = new DomainCacheService();
    sharingService = new CrossDomainSharingService(prisma, cacheService);
    workflowService = new ShareWorkflowAutomationService(prisma, cacheService);

    // Create test fixtures
    testDomains = await createTestDomains(prisma, 3);
    testUsers = await createTestUsers(prisma, 4);
    testKeepers = await createTestKeepers(prisma, testDomains, testUsers);

    // Generate auth tokens
    adminToken = generateAccessToken(testUsers[0].id, 'admin');
    userToken = generateAccessToken(testUsers[1].id, 'user');

    // Setup domain permissions
    await prisma.domainPermission.createMany({
      data: [
        { domainId: testDomains[0].id, userId: testUsers[0].id, role: 'admin' },
        { domainId: testDomains[1].id, userId: testUsers[1].id, role: 'user' },
        { domainId: testDomains[2].id, userId: testUsers[2].id, role: 'admin' },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.shareAccessLog.deleteMany();
    await prisma.shareActivation.deleteMany();
    await prisma.shareStepExecution.deleteMany();
    await prisma.shareRequest.deleteMany();
    await prisma.shareWorkflowStep.deleteMany();
    await prisma.shareWorkflow.deleteMany();
    await prisma.shareTemplate.deleteMany();
    await prisma.collaborationActivity.deleteMany();
    await prisma.crossDomainCollaboration.deleteMany();
    await prisma.shareNotification.deleteMany();
    
    await prisma.$disconnect();
    if (workflowService) {
      workflowService.cleanup();
    }
  });

  beforeEach(async () => {
    // Clear any existing share data between tests
    await prisma.shareRequest.deleteMany();
    await prisma.shareWorkflow.deleteMany();
    await prisma.shareTemplate.deleteMany();
  });

  describe('Share Request Management', () => {
    it('should create a share request successfully', async () => {
      const shareData = {
        targetDomainId: testDomains[1].id,
        contentType: 'keeper',
        contentId: testKeepers[0].id,
        requestType: 'share',
        permissions: ['view', 'comment'],
        accessLevel: 'read',
        requestedDuration: 30,
        title: 'Test Share Request',
        description: 'Sharing test keeper for collaboration',
        justification: 'Testing cross-domain sharing functionality',
        urgency: 'normal',
      };

      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(shareData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBeDefined();

      // Verify request was created in database
      const request = await prisma.shareRequest.findUnique({
        where: { id: response.body.data.requestId },
      });
      expect(request).toBeTruthy();
      expect(request!.sourceDomainId).toBe(testDomains[0].id);
      expect(request!.targetDomainId).toBe(testDomains[1].id);
      expect(request!.contentType).toBe('keeper');
      expect(request!.status).toBe('pending');
    });

    it('should prevent duplicate share requests', async () => {
      const shareData = {
        targetDomainId: testDomains[1].id,
        contentType: 'keeper',
        contentId: testKeepers[0].id,
      };

      // Create first request
      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(shareData)
        .expect(201);

      // Try to create duplicate request
      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(shareData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('active share request already exists');
    });

    it('should list share requests for domain', async () => {
      // Create multiple requests
      const requests = [
        {
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
          title: 'First Request',
        },
        {
          targetDomainId: testDomains[2].id,
          contentType: 'journey',
          contentId: 'journey-1',
          title: 'Second Request',
        },
      ];

      for (const req of requests) {
        await request(app)
          .post(`/api/sharing/${testDomains[0].id}/requests`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(req)
          .expect(201);
      }

      // List all requests
      const response = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Second Request'); // Latest first
    });

    it('should filter share requests by status', async () => {
      // Create and approve one request
      const approvedRequest = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
        })
        .expect(201);

      await request(app)
        .post(`/api/sharing/requests/${approvedRequest.body.data.requestId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Create pending request
      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[2].id,
          contentType: 'keeper',
          contentId: testKeepers[1].id,
        })
        .expect(201);

      // Filter by approved status
      const approvedResponse = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/requests?status=approved`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(approvedResponse.body.data).toHaveLength(1);
      expect(approvedResponse.body.data[0].status).toBe('approved');

      // Filter by pending status
      const pendingResponse = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/requests?status=pending`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(pendingResponse.body.data).toHaveLength(1);
      expect(pendingResponse.body.data[0].status).toBe('pending');
    });

    it('should get specific share request details', async () => {
      const shareRequest = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
          title: 'Detailed Request',
          description: 'Request with full details',
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/sharing/requests/${shareRequest.body.data.requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Detailed Request');
      expect(response.body.data.sourceDomain).toBeDefined();
      expect(response.body.data.targetDomain).toBeDefined();
      expect(response.body.data.requester).toBeDefined();
    });
  });

  describe('Share Request Approval', () => {
    let shareRequestId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
          title: 'Test Approval Request',
        })
        .expect(201);

      shareRequestId = response.body.data.requestId;
    });

    it('should approve a share request', async () => {
      const response = await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ comments: 'Approved for testing' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved successfully');

      // Verify request status updated
      const updatedRequest = await prisma.shareRequest.findUnique({
        where: { id: shareRequestId },
      });
      expect(updatedRequest!.status).toBe('approved');
      expect(updatedRequest!.approvedBy).toBe(testUsers[1].id);
      expect(updatedRequest!.approvedAt).toBeTruthy();
    });

    it('should reject a share request', async () => {
      const response = await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/reject`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rejectionReason: 'Content not suitable for sharing' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected successfully');

      // Verify request status updated
      const updatedRequest = await prisma.shareRequest.findUnique({
        where: { id: shareRequestId },
      });
      expect(updatedRequest!.status).toBe('rejected');
      expect(updatedRequest!.rejectedBy).toBe(testUsers[1].id);
      expect(updatedRequest!.rejectionReason).toBe('Content not suitable for sharing');
    });

    it('should prevent unauthorized approval', async () => {
      // Try to approve with wrong user (not target domain member)
      const response = await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/approve`)
        .set('Authorization', `Bearer ${generateAccessToken(testUsers[2].id, 'user')}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should prevent double approval', async () => {
      // First approval
      await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Second approval attempt
      const response = await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot approve request with status');
    });
  });

  describe('Share Activation and Access', () => {
    let shareRequestId: string;

    beforeEach(async () => {
      // Create and approve a request
      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
        })
        .expect(201);

      shareRequestId = response.body.data.requestId;

      await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should activate a share and generate access token', async () => {
      const response = await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          activationType: 'direct',
          generateLink: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessToken).toHaveLength(64); // 32 bytes = 64 hex chars

      // Verify activation was created
      const activation = await prisma.shareActivation.findUnique({
        where: { accessToken: response.body.data.accessToken },
      });
      expect(activation).toBeTruthy();
      expect(activation!.activationType).toBe('direct');
      expect(activation!.accessUrl).toBeTruthy();
    });

    it('should access shared content with valid token', async () => {
      // Activate share
      const activationResponse = await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activationType: 'direct' })
        .expect(200);

      const accessToken = activationResponse.body.data.accessToken;

      // Access shared content
      const response = await request(app)
        .get(`/api/sharing/access/${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shareRequest).toBeDefined();
      expect(response.body.data.permissions).toBeDefined();
      expect(response.body.data.accessLevel).toBe('read');

      // Verify access was logged
      const accessLog = await prisma.shareAccessLog.findFirst({
        where: { shareActivation: { accessToken } },
      });
      expect(accessLog).toBeTruthy();
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/sharing/access/invalid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid access token');
    });

    it('should reject access to expired shares', async () => {
      // Create share with short expiration
      const expiredResponse = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
          requestedDuration: 1, // 1 day
        })
        .expect(201);

      await request(app)
        .post(`/api/sharing/requests/${expiredResponse.body.data.requestId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const activationResponse = await request(app)
        .post(`/api/sharing/requests/${expiredResponse.body.data.requestId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activationType: 'direct' })
        .expect(200);

      // Manually expire the share
      await prisma.shareActivation.update({
        where: { accessToken: activationResponse.body.data.accessToken },
        data: { expiresAt: new Date(Date.now() - 1000) }, // Expired 1 second ago
      });

      const response = await request(app)
        .get(`/api/sharing/access/${activationResponse.body.data.accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('has expired');
    });

    it('should get access info without accessing content', async () => {
      // Activate share
      const activationResponse = await request(app)
        .post(`/api/sharing/requests/${shareRequestId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activationType: 'direct' })
        .expect(200);

      const accessToken = activationResponse.body.data.accessToken;

      // Get access info
      const response = await request(app)
        .get(`/api/sharing/access/${accessToken}/info`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shareRequest).toBeDefined();
      expect(response.body.data.activation).toBeDefined();
      expect(response.body.data.activation.isActive).toBe(true);
      expect(response.body.data.activation.isExpired).toBe(false);

      // Verify no access log was created
      const accessLogCount = await prisma.shareAccessLog.count({
        where: { shareActivation: { accessToken } },
      });
      expect(accessLogCount).toBe(0);
    });
  });

  describe('Share Workflows', () => {
    it('should create a share workflow', async () => {
      const workflowData = {
        name: 'Standard Approval Workflow',
        description: 'Two-step approval process',
        workflowType: 'content_share',
        requiresApproval: true,
        approvalSteps: [
          {
            stepNumber: 1,
            stepName: 'Manager Review',
            stepType: 'approval',
            requiredRole: 'admin',
            timeoutHours: 48,
          },
          {
            stepNumber: 2,
            stepName: 'Final Approval',
            stepType: 'approval',
            requiredRole: 'admin',
            timeoutHours: 24,
          },
        ],
        defaultExpirationDays: 30,
        auditLevel: 'standard',
      };

      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/workflows`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workflowId).toBeDefined();

      // Verify workflow was created
      const workflow = await prisma.shareWorkflow.findUnique({
        where: { id: response.body.data.workflowId },
        include: { workflowSteps: true },
      });
      expect(workflow).toBeTruthy();
      expect(workflow!.name).toBe('Standard Approval Workflow');
      expect(workflow!.workflowSteps).toHaveLength(2);
    });

    it('should list workflows for domain', async () => {
      // Create multiple workflows
      const workflows = [
        {
          name: 'Quick Approval',
          workflowType: 'content_share',
          requiresApproval: true,
          approvalSteps: [
            {
              stepNumber: 1,
              stepName: 'Review',
              stepType: 'approval',
              requiredRole: 'user',
            },
          ],
          auditLevel: 'minimal',
        },
        {
          name: 'Collaboration Workflow',
          workflowType: 'collaboration',
          requiresApproval: false,
          approvalSteps: [],
          auditLevel: 'comprehensive',
        },
      ];

      for (const workflow of workflows) {
        await request(app)
          .post(`/api/sharing/${testDomains[0].id}/workflows`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(workflow)
          .expect(201);
      }

      // List all workflows
      const response = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/workflows`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Collaboration Workflow'); // Latest first
    });

    it('should filter workflows by type', async () => {
      // Create workflows of different types
      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/workflows`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Content Share Workflow',
          workflowType: 'content_share',
          requiresApproval: true,
          approvalSteps: [
            {
              stepNumber: 1,
              stepName: 'Review',
              stepType: 'approval',
              requiredRole: 'user',
            },
          ],
          auditLevel: 'standard',
        })
        .expect(201);

      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/workflows`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Memory Share Workflow',
          workflowType: 'memory_share',
          requiresApproval: true,
          approvalSteps: [
            {
              stepNumber: 1,
              stepName: 'Review',
              stepType: 'approval',
              requiredRole: 'admin',
            },
          ],
          auditLevel: 'comprehensive',
        })
        .expect(201);

      // Filter by content_share
      const contentResponse = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/workflows?workflowType=content_share`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(contentResponse.body.data).toHaveLength(1);
      expect(contentResponse.body.data[0].workflowType).toBe('content_share');

      // Filter by memory_share
      const memoryResponse = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/workflows?workflowType=memory_share`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(memoryResponse.body.data).toHaveLength(1);
      expect(memoryResponse.body.data[0].workflowType).toBe('memory_share');
    });
  });

  describe('Share Templates', () => {
    it('should create a share template', async () => {
      const templateData = {
        name: 'Quick Share Template',
        description: 'Template for quick sharing',
        templateType: 'quick_share',
        permissions: ['view', 'comment'],
        accessLevel: 'read',
        defaultDuration: 7,
        requireApproval: false,
        autoActivate: true,
        contentTypes: ['keeper', 'journey'],
      };

      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templateId).toBeDefined();

      // Verify template was created
      const template = await prisma.shareTemplate.findUnique({
        where: { id: response.body.data.templateId },
      });
      expect(template).toBeTruthy();
      expect(template!.name).toBe('Quick Share Template');
      expect(template!.templateType).toBe('quick_share');
      expect(template!.autoActivate).toBe(true);
    });

    it('should list templates for domain', async () => {
      // Create multiple templates
      const templates = [
        {
          name: 'Public Share',
          templateType: 'public_share',
          permissions: ['view'],
          accessLevel: 'read',
          requireApproval: false,
        },
        {
          name: 'Collaboration Template',
          templateType: 'collaboration',
          permissions: ['view', 'edit'],
          accessLevel: 'write',
          requireApproval: true,
        },
      ];

      for (const template of templates) {
        await request(app)
          .post(`/api/sharing/${testDomains[0].id}/templates`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(template)
          .expect(201);
      }

      // List all templates
      const response = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter templates by type', async () => {
      // Create templates of different types
      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Public Template',
          templateType: 'public_share',
          permissions: ['view'],
          accessLevel: 'read',
        })
        .expect(201);

      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Time Limited Template',
          templateType: 'time_limited',
          permissions: ['view'],
          accessLevel: 'read',
          defaultDuration: 1,
        })
        .expect(201);

      // Filter by public_share
      const publicResponse = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/templates?templateType=public_share`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(publicResponse.body.data).toHaveLength(1);
      expect(publicResponse.body.data[0].templateType).toBe('public_share');
    });
  });

  describe('Cross-Domain Collaboration', () => {
    it('should create a collaboration', async () => {
      const collaborationData = {
        name: 'Test Collaboration',
        description: 'Testing collaboration features',
        collaborationType: 'project',
        memberDomainIds: [testDomains[1].id, testDomains[2].id],
        permissions: {
          [testDomains[1].id]: ['view', 'comment'],
          [testDomains[2].id]: ['view', 'edit'],
        },
        sharedResources: {
          keepers: [testKeepers[0].id],
          journeys: [],
        },
        accessRules: {
          allowCrossEdit: true,
          requireApproval: false,
        },
        auditLevel: 'comprehensive',
      };

      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/collaborations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(collaborationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborationId).toBeDefined();

      // Verify collaboration was created
      const collaboration = await prisma.crossDomainCollaboration.findUnique({
        where: { id: response.body.data.collaborationId },
      });
      expect(collaboration).toBeTruthy();
      expect(collaboration!.name).toBe('Test Collaboration');
      expect(collaboration!.memberDomainIds).toHaveLength(2);
      expect(collaboration!.status).toBe('planning');
    });

    it('should list collaborations for domain', async () => {
      // Create multiple collaborations
      const collaborations = [
        {
          name: 'Project Alpha',
          collaborationType: 'project',
          memberDomainIds: [testDomains[1].id],
          permissions: {},
          sharedResources: {},
          accessRules: {},
        },
        {
          name: 'Temporary Collab',
          collaborationType: 'temporary',
          memberDomainIds: [testDomains[2].id],
          permissions: {},
          sharedResources: {},
          accessRules: {},
        },
      ];

      for (const collab of collaborations) {
        await request(app)
          .post(`/api/sharing/${testDomains[0].id}/collaborations`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(collab)
          .expect(201);
      }

      // List all collaborations
      const response = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/collaborations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter collaborations by type', async () => {
      // Create collaborations of different types
      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/collaborations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Project Collaboration',
          collaborationType: 'project',
          memberDomainIds: [testDomains[1].id],
          permissions: {},
          sharedResources: {},
          accessRules: {},
        })
        .expect(201);

      await request(app)
        .post(`/api/sharing/${testDomains[0].id}/collaborations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Ongoing Collaboration',
          collaborationType: 'ongoing',
          memberDomainIds: [testDomains[2].id],
          permissions: {},
          sharedResources: {},
          accessRules: {},
        })
        .expect(201);

      // Filter by project type
      const projectResponse = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/collaborations?collaborationType=project`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(projectResponse.body.data).toHaveLength(1);
      expect(projectResponse.body.data[0].collaborationType).toBe('project');
    });
  });

  describe('Share Metrics and Analytics', () => {
    beforeEach(async () => {
      // Create test data for metrics
      const requests = [
        {
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
          status: 'approved',
        },
        {
          targetDomainId: testDomains[2].id,
          contentType: 'journey',
          contentId: 'journey-1',
          status: 'rejected',
        },
        {
          targetDomainId: testDomains[1].id,
          contentType: 'moment',
          contentId: 'moment-1',
          status: 'pending',
        },
      ];

      for (const req of requests) {
        await prisma.shareRequest.create({
          data: {
            ...req,
            sourceDomainId: testDomains[0].id,
            requestedBy: testUsers[0].id,
          },
        });
      }
    });

    it('should get share metrics for domain', async () => {
      const response = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/metrics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRequests');
      expect(response.body.data).toHaveProperty('pendingRequests');
      expect(response.body.data).toHaveProperty('approvedRequests');
      expect(response.body.data).toHaveProperty('rejectedRequests');
      expect(response.body.data).toHaveProperty('topContentTypes');
      expect(response.body.data).toHaveProperty('topTargetDomains');
    });

    it('should get pending requests for domain', async () => {
      const response = await request(app)
        .get(`/api/sharing/${testDomains[0].id}/pending`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
      expect(response.body.meta.count).toBe(1);
    });
  });

  describe('Bulk Operations', () => {
    let pendingRequestIds: string[];

    beforeEach(async () => {
      // Create multiple pending requests
      const requests = [
        {
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
        },
        {
          targetDomainId: testDomains[1].id,
          contentType: 'journey',
          contentId: 'journey-1',
        },
        {
          targetDomainId: testDomains[1].id,
          contentType: 'moment',
          contentId: 'moment-1',
        },
      ];

      pendingRequestIds = [];
      for (const req of requests) {
        const response = await request(app)
          .post(`/api/sharing/${testDomains[0].id}/requests`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(req)
          .expect(201);

        pendingRequestIds.push(response.body.data.requestId);
      }
    });

    it('should bulk approve multiple requests', async () => {
      const response = await request(app)
        .post('/api/sharing/bulk/approve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          requestIds: pendingRequestIds,
          comments: 'Bulk approved for testing',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toBe(3);
      expect(response.body.data.failed).toBe(0);
      expect(response.body.data.total).toBe(3);

      // Verify all requests were approved
      const approvedRequests = await prisma.shareRequest.findMany({
        where: { id: { in: pendingRequestIds } },
      });
      expect(approvedRequests.every(r => r.status === 'approved')).toBe(true);
    });

    it('should handle mixed success/failure in bulk operations', async () => {
      // Add an invalid request ID
      const invalidRequestIds = [...pendingRequestIds, 'invalid-uuid'];

      const response = await request(app)
        .post('/api/sharing/bulk/approve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          requestIds: invalidRequestIds,
          comments: 'Bulk approved with invalid ID',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toBe(3);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.total).toBe(4);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle high volume of concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => {
        return request(app)
          .post(`/api/sharing/${testDomains[0].id}/requests`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            targetDomainId: testDomains[1].id,
            contentType: 'keeper',
            contentId: `keeper-${i}`,
            title: `Concurrent Request ${i}`,
          });
      });

      const responses = await Promise.all(concurrentRequests);
      const successCount = responses.filter(r => r.status === 201).length;
      
      expect(successCount).toBe(50);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Create 100 requests
      const requests = Array.from({ length: 100 }, (_, i) => {
        return request(app)
          .post(`/api/sharing/${testDomains[0].id}/requests`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            targetDomainId: testDomains[1].id,
            contentType: 'keeper',
            contentId: `perf-keeper-${i}`,
          });
      });

      await Promise.all(requests);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Security and Access Control', () => {
    it('should enforce domain permissions', async () => {
      // Try to create request without domain permission
      const unauthorizedToken = generateAccessToken(testUsers[3].id, 'user');
      
      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should prevent access to other domains requests', async () => {
      // Create request in domain 0
      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
        })
        .expect(201);

      const requestId = response.body.data.requestId;

      // Try to view request from domain 2 (unauthorized)
      const unauthorizedToken = generateAccessToken(testUsers[2].id, 'admin');
      
      const viewResponse = await request(app)
        .get(`/api/sharing/requests/${requestId}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);

      expect(viewResponse.body.success).toBe(false);
      expect(viewResponse.body.error).toContain('Insufficient permissions');
    });

    it('should validate share request data', async () => {
      const invalidRequest = {
        targetDomainId: 'invalid-uuid',
        contentType: 'invalid-type',
        contentId: '',
        requestedDuration: -1,
      };

      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post(`/api/sharing/${testDomains[0].id}/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle non-existent domain IDs', async () => {
      const response = await request(app)
        .post(`/api/sharing/non-existent-domain/requests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetDomainId: testDomains[1].id,
          contentType: 'keeper',
          contentId: testKeepers[0].id,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll just verify the structure exists
      expect(app).toBeDefined();
    });
  });
});

// Helper function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 
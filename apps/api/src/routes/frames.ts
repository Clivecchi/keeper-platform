/**
 * Frames API Routes
 * =================
 * 
 * Express routes for frame type information and frame CRUD operations.
 * Provides available frame types for Board Studio.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const prisma = new PrismaClient();

// =============================================================================
// FRAME TYPE REGISTRY
// =============================================================================

const FRAME_TYPES = [
  {
    id: 'media-card',
    name: 'Media Card',
    type: 'media_card',
    description: 'Rich media presentation with images and content',
    category: 'content',
    icon: '🖼️',
    defaultConfig: {
      allowMedia: true,
      showMetadata: true,
      layout: 'card'
    }
  },
  {
    id: 'preview',
    name: 'Preview Frame',
    type: 'preview',
    description: 'Compact content summary and overview',
    category: 'content',
    icon: '👁️',
    defaultConfig: {
      showThumbnail: true,
      maxLines: 3,
      showActions: true
    }
  },
  {
    id: 'dialog',
    name: 'Dialog Frame',
    type: 'dialog',
    description: 'Guided agent interaction and conversation',
    category: 'interaction',
    icon: '💬',
    defaultConfig: {
      allowInput: true,
      showHistory: true,
      maxMessages: 50
    }
  },
  {
    id: 'config-panel',
    name: 'Config Panel',
    type: 'config_panel',
    description: 'Form-based settings and configuration',
    category: 'configuration',
    icon: '⚙️',
    defaultConfig: {
      layout: 'tabbed',
      allowSave: true,
      validation: true
    }
  },
  {
    id: 'process-frame',
    name: 'Process Frame',
    type: 'process_frame',
    description: 'Step-based workflow and guided processes',
    category: 'interaction',
    icon: '📋',
    defaultConfig: {
      showProgress: true,
      allowNavigation: true,
      validateSteps: true
    }
  },
  {
    id: 'agent-preview',
    name: 'Agent Preview',
    type: 'agent_preview',
    description: 'Agent identity and configuration preview',
    category: 'visualization',
    icon: '🤖',
    defaultConfig: {
      showAvatar: true,
      showCapabilities: true,
      showStatus: true
    }
  },
  {
    id: 'code-snippet',
    name: 'Code Snippet',
    type: 'code_snippet',
    description: 'Code viewer and editor with syntax highlighting',
    category: 'content',
    icon: '💻',
    defaultConfig: {
      language: 'javascript',
      showLineNumbers: true,
      allowEdit: false,
      theme: 'dark'
    }
  },
  // Board-specific frames
  {
    id: 'people-overview',
    name: 'People Overview',
    type: 'preview',
    description: 'Comprehensive people management interface',
    category: 'visualization',
    icon: '👥',
    entityType: 'people',
    defaultConfig: {
      showFilters: true,
      showSearch: true,
      showStats: true
    }
  },
  {
    id: 'role-manager',
    name: 'Role Manager',
    type: 'config_panel',
    description: 'Role and permission management interface',
    category: 'configuration',
    icon: '🛡️',
    entityType: 'people',
    defaultConfig: {
      showMatrix: true,
      allowRoleCreation: true,
      showAuditLog: true
    }
  },
  {
    id: 'collaboration-network',
    name: 'Collaboration Network',
    type: 'media_card',
    description: 'Visual network of people and relationships',
    category: 'visualization',
    icon: '🕸️',
    entityType: 'people',
    defaultConfig: {
      showConnections: true,
      allowZoom: true,
      interactive: true
    }
  },
  {
    id: 'activity-feed',
    name: 'Activity Feed',
    type: 'media_card',
    description: 'Real-time activity timeline',
    category: 'content',
    icon: '📰',
    entityType: 'people',
    defaultConfig: {
      showFilters: true,
      realTime: true,
      maxItems: 100
    }
  },
  {
    id: 'people-process',
    name: 'People Process',
    type: 'process_frame',
    description: 'Guided people onboarding workflow',
    category: 'interaction',
    icon: '🚀',
    entityType: 'people',
    defaultConfig: {
      steps: 5,
      allowSkip: false,
      showValidation: true
    }
  }
];

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CreateFrameSchema = z.object({
  type: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  config: z.record(z.any()).optional(),
  content: z.object({
    type: z.string(),
    url: z.string().optional(),
    alt: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional()
  }).optional()
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/frames
 * List available frame types
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, entityType } = req.query;

    let filteredFrameTypes = FRAME_TYPES;

    // Filter by category if specified
    if (category && typeof category === 'string') {
      filteredFrameTypes = filteredFrameTypes.filter(frame => frame.category === category);
    }

    // Filter by entity type if specified
    if (entityType && typeof entityType === 'string') {
      filteredFrameTypes = filteredFrameTypes.filter(frame => 
        !frame.entityType || frame.entityType === entityType
      );
    }

    res.json(filteredFrameTypes);
  } catch (error) {
    console.error('Error fetching frame types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/frames/:frameType
 * Get specific frame type information
 */
router.get('/:frameType', requireAuth, async (req, res) => {
  try {
    const { frameType } = req.params;

    const frameTypeInfo = FRAME_TYPES.find(frame => frame.type === frameType || frame.id === frameType);

    if (!frameTypeInfo) {
      return res.status(404).json({ error: 'Frame type not found' });
    }

    res.json(frameTypeInfo);
  } catch (error) {
    console.error('Error fetching frame type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/frames
 * Create a new frame instance
 */
router.post('/', requireAuth, validateRequest(CreateFrameSchema), async (req, res) => {
  try {
    const { type, entityType, entityId, config, content, position } = req.body;

    // Find the frame type
    const frameType = FRAME_TYPES.find(ft => ft.type === type || ft.id === type);
    if (!frameType) {
      return res.status(400).json({ error: 'Invalid frame type' });
    }

    // Create frame config
    const frameConfig = await prisma.frameConfig.create({
      data: {
        name: frameType.name,
        description: frameType.description,
        frameType: frameType.type,
        contentConfig: config || frameType.defaultConfig,
        layoutConfig: position ? { position } : null,
        theme: null
      }
    });

    // Create frame content if provided
    let frameContent = null;
    if (content) {
      frameContent = await prisma.frameContent.create({
        data: {
          type: content.type,
          url: content.url || '',
          alt: content.alt,
          metadata: content.metadata
        }
      });
    }

    // Create frame instance
    const frameInstance = await prisma.frameInstance.create({
      data: {
        entityType,
        entityId,
        configId: frameConfig.id,
        currentContentId: frameContent?.id || null
      },
      include: {
        FrameConfig: true,
        FrameContent_FrameInstance_currentContentIdToFrameContent: true
      }
    });

    console.log('Frame created:', frameInstance);
    res.status(201).json(frameInstance);
  } catch (error) {
    console.error('Error creating frame:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/frames/instances/:entityType/:entityId
 * Get frame instances for a specific entity
 */
router.get('/instances/:entityType/:entityId', requireAuth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const frameInstances = await prisma.frameInstance.findMany({
      where: {
        entityType,
        entityId
      },
      include: {
        FrameConfig: true,
        FrameContent_FrameInstance_currentContentIdToFrameContent: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(frameInstances);
  } catch (error) {
    console.error('Error fetching frame instances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/frames/instances/:frameId
 * Update a frame instance
 */
router.patch('/instances/:frameId', requireAuth, async (req, res) => {
  try {
    const { frameId } = req.params;
    const { config, content, position } = req.body;

    // Update frame config if provided
    if (config || position) {
      const updateData: any = {};
      if (config) updateData.contentConfig = config;
      if (position) updateData.layoutConfig = { position };

      await prisma.frameConfig.update({
        where: { id: frameId },
        data: updateData
      });
    }

    // Update frame content if provided
    if (content) {
      const frameInstance = await prisma.frameInstance.findUnique({
        where: { id: frameId }
      });

      if (frameInstance?.currentContentId) {
        await prisma.frameContent.update({
          where: { id: frameInstance.currentContentId },
          data: {
            type: content.type,
            url: content.url,
            alt: content.alt,
            metadata: content.metadata
          }
        });
      }
    }

    // Return updated frame instance
    const updatedFrame = await prisma.frameInstance.findUnique({
      where: { id: frameId },
      include: {
        FrameConfig: true,
        FrameContent_FrameInstance_currentContentIdToFrameContent: true
      }
    });

    res.json(updatedFrame);
  } catch (error) {
    console.error('Error updating frame instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/frames/instances/:frameId
 * Delete a frame instance
 */
router.delete('/instances/:frameId', requireAuth, async (req, res) => {
  try {
    const { frameId } = req.params;

    // Get frame instance to clean up related records
    const frameInstance = await prisma.frameInstance.findUnique({
      where: { id: frameId }
    });

    if (!frameInstance) {
      return res.status(404).json({ error: 'Frame instance not found' });
    }

    // Delete frame instance (this will cascade to config and content via Prisma relations)
    await prisma.frameInstance.delete({
      where: { id: frameId }
    });

    console.log('Frame deleted:', frameId);
    res.json({ success: true, message: 'Frame deleted successfully' });
  } catch (error) {
    console.error('Error deleting frame instance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

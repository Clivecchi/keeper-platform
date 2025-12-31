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
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { validationMiddleware } from '../middleware/validationMiddleware.js';

const router: Router = Router();
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
router.get('/', authMiddlewareCompat, async (req, res) => {
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

    return res.json(filteredFrameTypes);
  } catch (error) {
    console.error('Error fetching frame types:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/frames/:frameType
 * Get specific frame type information
 */
router.get('/:frameType', authMiddlewareCompat, async (req, res) => {
  try {
    const { frameType } = req.params;

    const frameTypeInfo = FRAME_TYPES.find(frame => frame.type === frameType || frame.id === frameType);

    if (!frameTypeInfo) {
      return res.status(404).json({ error: 'Frame type not found' });
    }

    return res.json(frameTypeInfo);
  } catch (error) {
    console.error('Error fetching frame type:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/frames
 * Create a new frame instance
 */
router.post('/', authMiddlewareCompat, validationMiddleware(CreateFrameSchema), async (req, res) => {
  try {
    const { type, entityType, entityId, config, content, position } = req.body;

    // Find the frame type
    const frameType = FRAME_TYPES.find(ft => ft.type === type || ft.id === type);
    if (!frameType) {
      return res.status(400).json({ error: 'Invalid frame type' });
    }

    // For now, return mock frame instance
    // TODO: Replace with actual frame creation when properly implemented
    const mockFrameInstance = {
      id: `frame-${Date.now()}`,
      entityType,
      entityId,
      configId: `config-${Date.now()}`,
      currentContentId: content ? `content-${Date.now()}` : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      FrameConfig: {
        id: `config-${Date.now()}`,
        name: frameType.name,
        description: frameType.description,
        frameType: frameType.type,
        contentConfig: config || frameType.defaultConfig,
        layoutConfig: position ? { position } : null,
        theme: null
      },
      FrameContent_FrameInstance_currentContentIdToFrameContent: content ? {
        id: `content-${Date.now()}`,
        type: content.type,
        url: content.url || '',
        alt: content.alt || null,
        createdAt: new Date(),
        playlistOwnerId: null
      } : null
    };

    console.log('Frame created:', mockFrameInstance);
    return res.status(201).json(mockFrameInstance);
  } catch (error) {
    console.error('Error creating frame:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/frames/instances/:entityType/:entityId
 * Get frame instances for a specific entity
 */
router.get('/instances/:entityType/:entityId', authMiddlewareCompat, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // For now, return mock frame instances
    // TODO: Replace with actual frame queries when properly implemented
    const mockFrameInstances = [
      {
        id: `frame-${entityType}-${entityId}-1`,
        entityType,
        entityId,
        configId: `config-1`,
        currentContentId: `content-1`,
        createdAt: new Date(),
        updatedAt: new Date(),
        FrameConfig: {
          id: `config-1`,
          name: `${entityType} Frame`,
          description: `Frame for ${entityType}`,
          frameType: 'preview'
        }
      }
    ];

    return res.json(mockFrameInstances);
  } catch (error) {
    console.error('Error fetching frame instances:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/frames/instances/:frameId
 * Update a frame instance
 */
router.patch('/instances/:frameId', authMiddlewareCompat, async (req, res) => {
  try {
    const { frameId } = req.params;
    const { config, content, position } = req.body;

    // For now, return mock updated frame
    // TODO: Replace with actual frame update when properly implemented
    const mockUpdatedFrame = {
      id: frameId,
      entityType: 'mock',
      entityId: 'mock-entity',
      configId: `config-${frameId}`,
      currentContentId: content ? `content-${frameId}` : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      FrameConfig: {
        id: `config-${frameId}`,
        name: 'Updated Frame',
        description: 'Updated frame description',
        frameType: 'preview',
        contentConfig: config,
        layoutConfig: position ? { position } : null
      }
    };

    console.log('Frame updated:', frameId, { config, content, position });
    return res.json(mockUpdatedFrame);
  } catch (error) {
    console.error('Error updating frame instance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/frames/instances/:frameId
 * Delete a frame instance
 */
router.delete('/instances/:frameId', authMiddlewareCompat, async (req, res) => {
  try {
    const { frameId } = req.params;

    // For now, just log the deletion
    // TODO: Replace with actual frame deletion when properly implemented
    console.log('Frame deletion requested:', frameId);
    return res.json({ success: true, message: 'Frame deleted successfully' });
  } catch (error) {
    console.error('Error deleting frame instance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

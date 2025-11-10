/**
 * Boards API Routes
 * =================
 * 
 * Express routes for board CRUD operations.
 * Handles board creation, retrieval, updating, and deletion.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { validationMiddleware } from '../middleware/validationMiddleware.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';
import {
  viewerModeSchema,
  addFrameSchema,
  updateFrameSchema,
  setCoverSchema,
  upsertNavSchema,
  publishSchema
} from './boards.schemas.js';
import {
  setViewerMode,
  addFrame,
  updateFrame,
  setCover,
  upsertNav,
  publishBoard,
  uploadMedia
} from '../services/boards/BoardsService.js';
import { logAudit, computeHash } from '../utils/audit.js';

const router: Router = Router();
const prisma = new PrismaClient();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  description: z.string().optional(),
  engagementMode: z.enum(['dialogic', 'wizard', 'focus', 'canvas']).default('canvas'),
  layout: z.enum(['grid', 'column', 'row', 'wizard', 'focus', 'canvas']).default('canvas'),
  domainId: z.string().uuid(),
  theme: z.object({
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    accentColor: z.string().optional(),
    borderColor: z.string().optional()
  }).optional()
});

const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  engagementMode: z.enum(['dialogic', 'wizard', 'focus', 'canvas']).optional(),
  layout: z.enum(['grid', 'column', 'row', 'wizard', 'focus', 'canvas']).optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    accentColor: z.string().optional(),
    borderColor: z.string().optional()
  }).optional(),
  frames: z.array(z.object({
    id: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    configId: z.string(),
    currentContentId: z.string().nullable(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional()
    }).optional()
  })).optional()
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/boards
 * List boards for a domain
 * 
 * @deprecated This endpoint uses mock data. Use /api/board-data instead for real persistence.
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { domainId } = req.query;
    
    if (!domainId || typeof domainId !== 'string') {
      return res.status(400).json({ error: 'domainId is required' });
    }

    // Check if user has access to this domain
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const domainPermission = await prisma.domainPermission.findFirst({
      where: {
        userId: req.user.id,
        domainId: domainId
      }
    });

    if (!domainPermission) {
      return res.status(403).json({ error: 'Access denied to domain' });
    }

    // DEPRECATED: This endpoint returns mock data
    // Use /api/board-data for real persistence
    console.warn('[DEPRECATED] /api/boards endpoint called. Use /api/board-data instead.');
    
    const mockBoards = [
      {
        id: 'agent-board-1',
        name: 'Agent Home Board',
        type: 'agent_board',
        description: 'Configure and manage AI agents',
        lastModified: new Date('2024-01-28'),
        frameCount: 4,
        engagementMode: 'dialogic',
        domainId
      },
      {
        id: 'domain-board-1',
        name: 'Domain Management Board',
        type: 'domain_board',
        description: 'Manage domain settings and members',
        lastModified: new Date('2024-01-27'),
        frameCount: 4,
        engagementMode: 'wizard',
        domainId
      },
      {
        id: 'journey-board-1',
        name: 'Journey Visualization Board',
        type: 'journey_board',
        description: 'Visualize and manage learning journeys',
        lastModified: new Date('2024-01-26'),
        frameCount: 4,
        engagementMode: 'canvas',
        domainId
      },
      {
        id: 'keeper-type-board-1',
        name: 'Keeper Type Management',
        type: 'keeper_type_board',
        description: 'Manage Keeper Types and configurations',
        lastModified: new Date('2024-01-25'),
        frameCount: 5,
        engagementMode: 'wizard',
        domainId
      },
      {
        id: 'people-board-1',
        name: 'People Management Board',
        type: 'people_board',
        description: 'Manage people and collaboration',
        lastModified: new Date('2024-01-24'),
        frameCount: 5,
        engagementMode: 'canvas',
        domainId
      }
    ];

    res.set('X-Deprecated', 'true');
    res.set('X-Deprecated-Message', 'This endpoint is deprecated. Use /api/board-data instead.');
    return res.json(mockBoards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/boards
 * Create a new board
 */
router.post('/', authMiddlewareCompat, validationMiddleware(CreateBoardSchema), async (req: Request, res: Response) => {
  try {
    const { name, type, description, engagementMode, layout, domainId, theme } = req.body;

    // Check if user has access to this domain
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const domainPermission = await prisma.domainPermission.findFirst({
      where: {
        userId: req.user.id,
        domainId: domainId
      }
    });

    if (!domainPermission) {
      return res.status(403).json({ error: 'Access denied to domain' });
    }

    // For now, return mock created board
    // TODO: Replace with actual board creation when board storage is implemented
    const mockBoard = {
      id: `board-${Date.now()}`,
      name,
      type,
      description,
      engagementMode,
      layout,
      domainId,
      theme,
      frameCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.id
    };

    console.log('Board created:', mockBoard);
    return res.status(201).json(mockBoard);
  } catch (error) {
    console.error('Error creating board:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/boards/:boardId
 * Get a specific board with its frames
 */
router.get('/:boardId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;

    // For now, return mock board data
    // TODO: Replace with actual board query when board storage is implemented
    const mockBoard = {
      id: boardId,
      config: {
        id: `${boardId}-config`,
        type: 'custom_board',
        name: 'Custom Board',
        description: 'A custom board created in Board Studio',
        layout: 'canvas',
        engagementMode: 'canvas',
        allowLayoutEditing: true,
        theme: {
          primaryColor: '#334155',
          backgroundColor: '#E2E8F0',
          accentColor: '#0F172A',
          borderColor: '#CBD5E1'
        }
      },
      frames: [],
      entityType: 'board',
      entityId: boardId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return res.json(mockBoard);
  } catch (error) {
    console.error('Error fetching board:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/boards/:boardId
 * Update a board
 */
router.patch('/:boardId', authMiddlewareCompat, validationMiddleware(UpdateBoardSchema), async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;
    const updates = req.body;

    // For now, just log the update and return success
    // TODO: Replace with actual board update when board storage is implemented
    console.log('Board update requested:', boardId, updates);

    const updatedBoard = {
      id: boardId,
      ...updates,
      updatedAt: new Date()
    };

    return res.json(updatedBoard);
  } catch (error) {
    console.error('Error updating board:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/boards/:boardId
 * Delete a board
 */
router.delete('/:boardId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;

    // For now, just log the deletion
    // TODO: Replace with actual board deletion when board storage is implemented
    console.log('Board deletion requested:', boardId);

    return res.json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Error deleting board:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// DOMAIN BOARD MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * PATCH /api/boards/:boardId/viewer-mode
 * Set viewer mode for a board
 */
router.patch(
  '/:boardId/viewer-mode',
  authMiddlewareCompat,
  idempotencyMiddleware(),
  validationMiddleware(viewerModeSchema),
  async (req: Request, res: Response) => {
    try {
      const { boardId } = req.params;
      const { mode, dryRun, requestId } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const inputHash = computeHash({ boardId, mode, dryRun });

      // Dry run mode
      if (dryRun) {
        return res.json({
          ok: true,
          dryRun: true,
          diff: {
            boardId,
            mode,
            message: 'Would update viewer mode'
          }
        });
      }

      // Execute the operation
      const result = await setViewerMode({
        boardId,
        mode,
        userId: req.user.id
      });

      const resultHash = computeHash(result);

      // Log audit
      await logAudit({
        who: req.user.id,
        tool: 'domain.board.setViewerMode',
        boardId,
        inputHash,
        resultHash,
        requestId
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error setting viewer mode:', error);
      if (error.message === 'ACCESS_DENIED') {
        return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to modify this board' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/boards/:boardId/frames
 * Add a frame to a board
 */
router.post(
  '/:boardId/frames',
  authMiddlewareCompat,
  idempotencyMiddleware(),
  validationMiddleware(addFrameSchema),
  async (req: Request, res: Response) => {
    try {
      const { boardId } = req.params;
      const { pattern, name, index, props, dryRun, requestId } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const inputHash = computeHash({ boardId, pattern, name, index, props, dryRun });

      // Dry run mode
      if (dryRun) {
        return res.json({
          ok: true,
          dryRun: true,
          diff: {
            boardId,
            pattern,
            name,
            index,
            props,
            message: 'Would add frame'
          }
        });
      }

      // Execute the operation
      const result = await addFrame({
        boardId,
        pattern,
        name,
        index,
        props,
        userId: req.user.id
      });

      const resultHash = computeHash(result);

      // Log audit
      await logAudit({
        who: req.user.id,
        tool: 'domain.board.addFrame',
        boardId,
        frameId: result.frame.id,
        inputHash,
        resultHash,
        requestId
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error adding frame:', error);
      if (error.message === 'ACCESS_DENIED') {
        return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to modify this board' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/boards/frames/:frameId
 * Update a frame
 */
router.patch(
  '/frames/:frameId',
  authMiddlewareCompat,
  idempotencyMiddleware(),
  validationMiddleware(updateFrameSchema),
  async (req: Request, res: Response) => {
    try {
      const { frameId } = req.params;
      const { patch, dryRun, requestId } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const inputHash = computeHash({ frameId, patch, dryRun });

      // Dry run mode
      if (dryRun) {
        return res.json({
          ok: true,
          dryRun: true,
          diff: {
            frameId,
            patch,
            message: 'Would update frame'
          }
        });
      }

      // Execute the operation
      const result = await updateFrame({
        frameId,
        patch,
        userId: req.user.id
      });

      const resultHash = computeHash(result);

      // Log audit
      await logAudit({
        who: req.user.id,
        tool: 'domain.board.updateFrame',
        frameId,
        inputHash,
        resultHash,
        requestId
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error updating frame:', error);
      if (error.message === 'ACCESS_DENIED') {
        return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to modify this frame' });
      }
      if (error.message === 'FRAME_NOT_FOUND') {
        return res.status(404).json({ error: 'FRAME_NOT_FOUND', message: 'Frame not found' });
      }
      if (error.message === 'INVALID_PATCH') {
        return res.status(400).json({ error: 'INVALID_PATCH', message: 'Invalid patch data' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/boards/:boardId/cover
 * Set board cover image
 */
router.post(
  '/:boardId/cover',
  authMiddlewareCompat,
  idempotencyMiddleware(),
  validationMiddleware(setCoverSchema),
  async (req: Request, res: Response) => {
    try {
      const { boardId } = req.params;
      const { mime, name, bytesBase64, dryRun, requestId } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const inputHash = computeHash({ boardId, mime, name, bytesBase64: bytesBase64.substring(0, 100), dryRun });

      // Dry run mode
      if (dryRun) {
        return res.json({
          ok: true,
          dryRun: true,
          diff: {
            boardId,
            mime,
            name,
            message: 'Would upload cover and set as board cover'
          }
        });
      }

      // Step 1: Upload media
      const uploadResult = await uploadMedia({
        mime,
        name,
        bytesBase64,
        userId: req.user.id
      });

      // Step 2: Set as cover
      const result = await setCover({
        boardId,
        mediaId: uploadResult.mediaId,
        userId: req.user.id
      });

      const resultHash = computeHash(result);

      // Log audit
      await logAudit({
        who: req.user.id,
        tool: 'domain.board.setCover',
        boardId,
        inputHash,
        resultHash,
        requestId
      });

      return res.json({
        ...result,
        mediaUrl: uploadResult.url
      });
    } catch (error: any) {
      console.error('Error setting cover:', error);
      if (error.message === 'ACCESS_DENIED') {
        return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to modify this board' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/boards/:boardId/nav
 * Upsert pathway navigation items
 */
router.put(
  '/:boardId/nav',
  authMiddlewareCompat,
  idempotencyMiddleware(),
  validationMiddleware(upsertNavSchema),
  async (req: Request, res: Response) => {
    try {
      const { boardId } = req.params;
      const { items, dryRun, requestId } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const inputHash = computeHash({ boardId, items, dryRun });

      // Dry run mode
      if (dryRun) {
        return res.json({
          ok: true,
          dryRun: true,
          diff: {
            boardId,
            items,
            message: 'Would update navigation items'
          }
        });
      }

      // Execute the operation
      const result = await upsertNav({
        boardId,
        items,
        userId: req.user.id
      });

      const resultHash = computeHash(result);

      // Log audit
      await logAudit({
        who: req.user.id,
        tool: 'domain.board.upsertPathwayNav',
        boardId,
        inputHash,
        resultHash,
        requestId
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error upserting nav:', error);
      if (error.message === 'ACCESS_DENIED') {
        return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to modify this board' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/boards/:boardId/publish
 * Publish or unpublish a board
 */
router.patch(
  '/:boardId/publish',
  authMiddlewareCompat,
  idempotencyMiddleware(),
  validationMiddleware(publishSchema),
  async (req: Request, res: Response) => {
    try {
      const { boardId } = req.params;
      const { isPublic, dryRun, requestId } = req.body;

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const inputHash = computeHash({ boardId, isPublic, dryRun });

      // Dry run mode
      if (dryRun) {
        return res.json({
          ok: true,
          dryRun: true,
          diff: {
            boardId,
            isPublic,
            message: `Would ${isPublic ? 'publish' : 'unpublish'} board`
          }
        });
      }

      // Execute the operation
      const result = await publishBoard({
        boardId,
        isPublic,
        userId: req.user.id
      });

      const resultHash = computeHash(result);

      // Log audit
      await logAudit({
        who: req.user.id,
        tool: 'domain.board.publish',
        boardId,
        inputHash,
        resultHash,
        requestId
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Error publishing board:', error);
      if (error.message === 'ACCESS_DENIED') {
        return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have permission to modify this board' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
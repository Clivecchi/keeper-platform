/**
 * Boards API Routes - Phase 1 Implementation
 * Real database persistence with Board model and default frames
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { randomUUID } from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

const boardQuerySchema = z.object({
  keeperId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const BoardCreate = z.object({
  keeperId: z.string().uuid(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  description: z.string().max(280).optional(),
  icon: z.string().optional(),
});

const BoardUpdate = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
  theme: z.object({ 
    primary: z.string().optional(), 
    background: z.string().optional() 
  }).optional(),
  behavior: z.object({
    showGrid: z.boolean().optional(),
    snapToGrid: z.boolean().optional(),
    gridSize: z.number().int().min(4).max(24).optional(),
    defaultPattern: z.enum(['dialogic','wizard','focus','canvas','gallery','form']).optional(),
    startFrameId: z.string().uuid().nullable().optional(),
    draftMode: z.boolean().optional(),
    autosave: z.boolean().optional(),
    frameOrder: z.array(z.string()).optional(),
  }).optional(),
  data: z.object({
    scope: z.enum(['keeper','domain','journey','people','custom']).optional(),
    entityId: z.string().uuid().nullable().optional(),
    dataBindings: z.record(z.any()).optional(),
    agentId: z.string().uuid().nullable().optional(),
  }).optional(),
  access: z.object({
    visibility: z.enum(['private','unlisted','org','public']).optional(),
    roles: z.record(z.string()).optional(),
    allowComments: z.boolean().optional(),
    shareLinkEnabled: z.boolean().optional(),
  }).optional(),
});

const FrameCreate = z.object({
  name: z.string().min(1).max(60),
  pattern: z.enum(['dialogic','wizard','focus','canvas','gallery','form']).optional(),
  frameType: z.string().default('media_card'),
  orderIndex: z.number().int().optional(),
});

const FrameUpdate = z.object({
  name: z.string().min(1).max(60).optional(),
  pattern: z.enum(['dialogic','wizard','focus','canvas','gallery','form']).optional(),
  layoutKind: z.string().optional(),
  layoutData: z.record(z.any()).optional(),
  props: z.record(z.any()).optional(),
  orderIndex: z.number().int().optional(),
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create default FrameConfig for frames
 */
async function ensureDefaultFrameConfig(name: string): Promise<string> {
  try {
    const existing = await prisma.frameConfig.findUnique({
      where: { name }
    });
    
    if (existing) {
      return existing.id;
    }
    
    const config = await prisma.frameConfig.create({
      data: {
        id: randomUUID(),
        name,
        description: `Default config for ${name}`,
        theme: {},
        updatedAt: new Date(),
      }
    });
    
    return config.id;
  } catch (error) {
    console.error('Error creating default frame config:', error);
    throw error;
  }
}

/**
 * Create default Cover and Settings frames for a new board
 */
async function createDefaultFrames(boardId: string): Promise<any[]> {
  const coverConfigId = await ensureDefaultFrameConfig('cover-default');
  const settingsConfigId = await ensureDefaultFrameConfig('settings-default');

  return [
    {
      id: randomUUID(),
      boardId,
      role: 'cover',
      name: 'Cover',
      pattern: 'focus',
      frameType: 'media_card',
      orderIndex: 0,
      layoutKind: 'focus',
      layoutData: {},
      props: { 
        title: '__BOARD_NAME__', 
        subtitle: '__BOARD_DESC__', 
        media: null, 
        alignment: 'center' 
      },
      entityType: 'board',
      entityId: boardId,
      configId: coverConfigId,
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      boardId,
      role: 'settings',
      name: 'Settings',
      pattern: 'form',
      frameType: 'config_panel',
      orderIndex: 1,
      layoutKind: 'row',
      layoutData: {},
      props: {},
      entityType: 'board',
      entityId: boardId,
      configId: settingsConfigId,
      updatedAt: new Date(),
    }
  ];
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/boards?keeperId=:keeperId → list boards
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { keeperId, limit, offset } = boardQuerySchema.parse(req.query);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const boards = await prisma.board.findMany({
      where: { keeperId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return res.json({
      success: true,
      data: boards
    });
  } catch (error) {
    console.error('Error fetching boards:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid parameters', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/boards → create board with default frames
 */
router.post('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const boardData = BoardCreate.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check for slug uniqueness within keeper
    const existingBoard = await prisma.board.findUnique({
      where: {
        keeperId_slug: {
          keeperId: boardData.keeperId,
          slug: boardData.slug
        }
      }
    });

    if (existingBoard) {
      return res.status(400).json({ 
        success: false, 
        error: 'Board slug already exists for this keeper' 
      });
    }

    // Create the board
    const board = await prisma.board.create({
      data: {
        id: randomUUID(),
        ...boardData,
        theme: {},
        behavior: {
          showGrid: true,
          snapToGrid: true,
          gridSize: 8,
          defaultPattern: 'dialogic',
          startFrameId: null,
          draftMode: false,
          autosave: true,
          frameOrder: []
        },
        data: {
          scope: 'keeper',
          entityId: null,
          dataBindings: {},
          agentId: null
        },
        access: {
          visibility: 'private',
          roles: {},
          allowComments: false,
          shareLinkEnabled: false
        },
        updatedAt: new Date(),
      }
    });

    // Create default frames
    const defaultFrames = await createDefaultFrames(board.id);

    // Insert frames
    await prisma.frameInstance.createMany({
      data: defaultFrames
    });

    // Fetch the complete board with frames
    const completeBoard = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        frames: {
          orderBy: { orderIndex: 'asc' },
          include: {
            FrameConfig: true
          }
        }
      }
    });

    return res.json({
      success: true,
      data: completeBoard
    });
  } catch (error) {
    console.error('Error creating board:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid board data', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/boards/:id → full board with frames
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        frames: {
          orderBy: { orderIndex: 'asc' },
          include: {
            FrameConfig: true
          }
        }
      }
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    return res.json({
      success: true,
      data: board
    });
  } catch (error) {
    console.error('Error fetching board:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/boards/:id → update board
 */
router.put('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = BoardUpdate.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if board exists
    const existingBoard = await prisma.board.findUnique({
      where: { id }
    });

    if (!existingBoard) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    // If slug is being updated, check uniqueness
    if (updates.slug && updates.slug !== existingBoard.slug) {
      const slugConflict = await prisma.board.findUnique({
        where: {
          keeperId_slug: {
            keeperId: existingBoard.keeperId,
            slug: updates.slug
          }
        }
      });

      if (slugConflict) {
        return res.status(400).json({ 
          success: false, 
          error: 'Board slug already exists for this keeper' 
        });
      }
    }

    // Update the board
    const updatedBoard = await prisma.board.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      include: {
        frames: {
          orderBy: { orderIndex: 'asc' },
          include: {
            FrameConfig: true
          }
        }
      }
    });

    return res.json({
      success: true,
      data: updatedBoard
    });
  } catch (error) {
    console.error('Error updating board:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid board data', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/boards/:id/frames → add frame
 */
router.post('/:id/frames', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId } = req.params;
    const frameData = FrameCreate.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if board exists and get default pattern
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { frames: { select: { orderIndex: true } } }
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    // Get next order index
    const maxOrderIndex = board.frames.reduce((max, frame) => 
      Math.max(max, frame.orderIndex), -1);
    const nextOrderIndex = frameData.orderIndex ?? maxOrderIndex + 1;

    // Get default pattern from board behavior
    const behavior = board.behavior as any;
    const defaultPattern = frameData.pattern ?? behavior?.defaultPattern ?? 'dialogic';

    // Create default frame config
    const configId = await ensureDefaultFrameConfig(`frame-${frameData.name.toLowerCase()}`);

    // Create the frame
    const frame = await prisma.frameInstance.create({
      data: {
        id: randomUUID(),
        boardId,
        name: frameData.name,
        pattern: defaultPattern,
        frameType: frameData.frameType,
        orderIndex: nextOrderIndex,
        layoutKind: 'canvas',
        layoutData: {},
        props: {},
        entityType: 'board',
        entityId: boardId,
        configId,
        updatedAt: new Date(),
      },
      include: {
        FrameConfig: true
      }
    });

    return res.json({
      success: true,
      data: frame
    });
  } catch (error) {
    console.error('Error creating frame:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid frame data', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/boards/:id/frames/:frameId → update frame
 */
router.patch('/:id/frames/:frameId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId, frameId } = req.params;
    const updates = FrameUpdate.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if frame exists and belongs to board
    const existingFrame = await prisma.frameInstance.findFirst({
      where: { 
        id: frameId,
        boardId 
      }
    });

    if (!existingFrame) {
      return res.status(404).json({ success: false, error: 'Frame not found' });
    }

    // Update the frame
    const updatedFrame = await prisma.frameInstance.update({
      where: { id: frameId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      include: {
        FrameConfig: true
      }
    });

    return res.json({
      success: true,
      data: updatedFrame
    });
  } catch (error) {
    console.error('Error updating frame:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid frame data', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/boards/:id/frames/:frameId → delete frame
 */
router.delete('/:id/frames/:frameId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId, frameId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if frame exists and belongs to board
    const existingFrame = await prisma.frameInstance.findFirst({
      where: { 
        id: frameId,
        boardId 
      }
    });

    if (!existingFrame) {
      return res.status(404).json({ success: false, error: 'Frame not found' });
    }

    // Prevent deletion of cover and settings frames
    if (existingFrame.role === 'cover' || existingFrame.role === 'settings') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete default frames (cover/settings)' 
      });
    }

    // Delete the frame
    await prisma.frameInstance.delete({
      where: { id: frameId }
    });

    return res.json({
      success: true,
      message: 'Frame deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting frame:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
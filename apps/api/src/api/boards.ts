/**
 * Boards API Routes - Phase 1 Implementation
 * Real database persistence with Board model and default frames
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { kamAuth, kamScope } from '../kam/middleware.js';
import { randomUUID } from 'crypto';
import { broadcastAgentEvent } from './agents/events.js';
import { extractRole, can } from '../kam/permissions.js';
import type { IncomingHttpHeaders } from 'http';

const router: Router = Router();
const prisma = new PrismaClient();
// Import ensure so Studio alias uses the same canonical ensure logic for AHB
import { ensureAgentHomeBoard } from './agents.js';

// UUID v4 validator
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  templateId: z.enum(['agent', 'domain', 'journey', 'people', 'custom']).optional(),
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
    // Phase 10 flags
    realtime: z.object({ enabled: z.boolean().default(true) }).optional(),
    composition: z.object({ allowEdits: z.boolean().default(true) }).optional(),
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
  // NEW: allow layoutPrefs at top-level; will be merged into Board.data
  layoutPrefs: z.record(z.any()).optional(),
});

// -----------------------------------------------------------------------------
// Phase 9 additions: Board-level frames (data.frames) and templates
// -----------------------------------------------------------------------------
const DataFrameInstance = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string().optional(),
  visible: z.boolean().optional(),
  props: z.record(z.any()).optional(),
  region: z.enum(['main','side','footer']).optional()
});

const FrameAdd = z.object({
  key: z.string(),
  title: z.string().optional(),
  visible: z.boolean().optional().default(true),
  props: z.record(z.any()).optional(),
  region: z.enum(['main','side','footer']).optional()
});

const FramePatch = z.object({
  title: z.string().optional(),
  visible: z.boolean().optional(),
  props: z.record(z.any()).optional(),
  region: z.enum(['main','side','footer']).optional()
});

const BoardTemplate = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  frames: z.array(DataFrameInstance),
  layoutPrefs: z.record(z.any()).optional(),
  createdAt: z.string()
});

const BoardTemplateCreate = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  frames: z.array(DataFrameInstance.extend({ id: z.string().uuid().optional() })).default([]),
  layoutPrefs: z.record(z.any()).optional()
});

// In-memory templates for mock usage
const templatesMem: Array<z.infer<typeof BoardTemplate>> = [];

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

const FrameReorder = z.object({
  order: z.array(z.string().uuid()),
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create default FrameConfig for frames
 */
async function ensureDefaultFrameConfig(name: string): Promise<string> {
  try {
    const existing = await prisma.frameConfig.findFirst({
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
 * Template specifications for different board types
 */
const BOARD_TEMPLATES = {
  agent: {
    name: 'Agent Board',
    frames: [
      {
        name: 'Dialogic',
        pattern: 'dialogic',
        frameType: 'dialog',
        layoutKind: 'canvas',
        props: {
          title: 'Agent Conversation',
          placeholder: 'Ask your agent anything...',
          showHistory: true,
          maxMessages: 50
        }
      },
      {
        name: 'Preview',
        pattern: 'focus',
        frameType: 'agent_preview',
        layoutKind: 'focus',
        props: {
          showCapabilities: true,
          showStatus: true,
          showMetrics: true
        }
      }
    ]
  },
  domain: {
    name: 'Domain Board',
    frames: [
      {
        name: 'People',
        pattern: 'canvas',
        frameType: 'media_card',
        layoutKind: 'grid',
        props: {
          title: 'Domain Members',
          gridCols: 3,
          showStats: true,
          allowInvite: true
        }
      },
      {
        name: 'Preview',
        pattern: 'focus',
        frameType: 'preview',
        layoutKind: 'focus',
        props: {
          showDescription: true,
          showMetrics: true,
          showActivity: true
        }
      }
    ]
  },
  journey: {
    name: 'Journey Board',
    frames: [
      {
        name: 'Gallery',
        pattern: 'gallery',
        frameType: 'media_card',
        layoutKind: 'grid',
        props: {
          title: 'Journey Milestones',
          layout: 'masonry',
          showProgress: true,
          allowReorder: false
        }
      },
      {
        name: 'Wizard',
        pattern: 'wizard',
        frameType: 'process_frame',
        layoutKind: 'wizard',
        props: {
          title: 'Journey Steps',
          showProgress: true,
          allowSkip: false,
          steps: [
            { id: 'start', label: 'Getting Started', completed: false },
            { id: 'progress', label: 'Making Progress', completed: false },
            { id: 'mastery', label: 'Achieving Mastery', completed: false }
          ]
        }
      }
    ]
  },
  people: {
    name: 'People Board',
    frames: [
      {
        name: 'Grid',
        pattern: 'canvas',
        frameType: 'media_card',
        layoutKind: 'grid',
        props: {
          title: 'Team Members',
          gridCols: 4,
          showRoles: true,
          showStatus: true,
          allowFilter: true
        }
      }
    ]
  },
  custom: {
    name: 'Custom Board',
    frames: []
  }
};

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

/**
 * Apply template frames to a board (in addition to Cover + Settings)
 */
async function applyTemplate(boardId: string, templateId: string): Promise<any[]> {
  const template = BOARD_TEMPLATES[templateId as keyof typeof BOARD_TEMPLATES];
  if (!template || !template.frames.length) {
    return [];
  }

  const templateFrames = [];
  let orderIndex = 2; // Start after Cover (0) and Settings (1)

  for (const frameSpec of template.frames) {
    const configId = await ensureDefaultFrameConfig(`${templateId}-${frameSpec.name.toLowerCase()}`);
    
    templateFrames.push({
      id: randomUUID(),
      boardId,
      role: null,
      name: frameSpec.name,
      pattern: frameSpec.pattern,
      frameType: frameSpec.frameType,
      orderIndex: orderIndex++,
      layoutKind: frameSpec.layoutKind,
      layoutData: {},
      props: frameSpec.props || {},
      entityType: 'board',
      entityId: boardId,
      configId,
      updatedAt: new Date(),
    });
  }

  return templateFrames;
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
        frames: {
          select: { id: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Add frame count to each board
    const boardsWithFrameCount = boards.map(board => ({
      ...board,
      frameCount: board.frames.length,
      frames: undefined // Remove frames array from response
    }));

    return res.json({
      success: true,
      data: boardsWithFrameCount
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
        keeperId: boardData.keeperId,
        name: boardData.name,
        slug: boardData.slug,
        description: boardData.description ?? null,
        icon: boardData.icon ?? null,
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

    // Create default frames (Cover + Settings)
    const defaultFrames = await createDefaultFrames(board.id);

    // Apply template if specified
    const templateFrames = boardData.templateId 
      ? await applyTemplate(board.id, boardData.templateId)
      : [];

    // Combine all frames
    const allFrames = [...defaultFrames, ...templateFrames];

    // Insert frames
    await prisma.frameInstance.createMany({
      data: allFrames
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
    const reqId = (req as any).reqId || req.get('x-request-id') || '';

    if (!UUID_V4.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid board id', reqId });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized', reqId });
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
      return res.status(404).json({ success: false, error: 'Board not found', reqId });
    }

    // Generate etag from updatedAt timestamp
    const etag = `"${board.updatedAt.getTime()}"`;
    
    // Set etag header
    res.set('ETag', etag);

    // Safe defaults for behavior and data
    const rawDataAny = (board?.data as any) ?? {};
    const rawData = (rawDataAny && typeof rawDataAny === 'object') ? rawDataAny : {};
    const safeFrames = Array.isArray(rawData.frames) ? rawData.frames : [];
    const safeLayoutPrefs = rawData.layoutPrefs && typeof rawData.layoutPrefs === 'object' ? rawData.layoutPrefs : {};
    const rawBehaviorAny = (board as any)?.behavior ?? {};
    const rawBehavior = (rawBehaviorAny && typeof rawBehaviorAny === 'object') ? rawBehaviorAny : {};
    const safeBehavior = {
      realtime: { enabled: true, ...(rawBehavior.realtime || {}) },
      composition: { allowEdits: true, ...(rawBehavior.composition || {}) },
      ...rawBehavior
    };

    const hasBehavior = !!(board as any)?.behavior;

    console.log('[board-data:get]', {
      reqId,
      boardId: id,
      status: 'ok',
      hasBehavior,
      hasFramesArray: Array.isArray(rawData.frames),
      hasLayoutPrefs: typeof rawData.layoutPrefs,
      types: {
        behavior: typeof (board as any)?.behavior,
        frames: Array.isArray(rawData.frames),
        layoutPrefs: typeof rawData.layoutPrefs
      }
    });

    return res.json({
      success: true,
      data: {
        ...board,
        behavior: safeBehavior,
        data: {
          ...rawData,
          frames: safeFrames,
          layoutPrefs: safeLayoutPrefs
        },
        etag
      },
      reqId
    });
  } catch (error) {
    const reqId = (req as any).reqId || req.get('x-request-id') || '';
    console.error('[board-data:get:error]', {
      reqId,
      boardId: req.params?.id,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ success: false, error: 'Internal server error', reqId });
  }
});

/**
 * GET /api/board-data/:id/raw → dump raw DB row (env and auth gated)
 */
router.get('/:id/raw', authMiddlewareCompat, async (req: Request, res: Response) => {
  const reqId = (req as any).reqId || req.get('x-request-id') || '';
  try {
    const { id } = req.params;
    if (!process.env.ENABLE_RAW_INSPECTOR) {
      return res.status(404).json({ success: false, error: 'Not found', reqId });
    }
    if (!UUID_V4.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid board id', reqId });
    }
    const role = extractRole(req);
    if (!can(role, 'board.inspect.raw')) {
      return res.status(403).json({ success: false, error: 'Forbidden', code: 'forbidden', reason: 'board.inspect.raw', reqId });
    }
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found', reqId });
    }
    return res.json({ success: true, data: {
      id: board.id,
      slug: (board as any).slug,
      name: (board as any).name,
      data: (board as any).data,
      behavior: (board as any).behavior,
      access: (board as any).access,
      updatedAt: (board as any).updatedAt,
      createdAt: (board as any).createdAt
    }, reqId });
  } catch (error) {
    console.error('[board-data:raw:error]', {
      reqId,
      boardId: req.params?.id,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ success: false, error: 'Internal server error', reqId });
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

    // Check for etag conflicts (unless force update)
    const forceUpdate = req.query.force === 'true';
    if (!forceUpdate) {
      const ifMatch = req.get('If-Match');
      const currentEtag = `"${existingBoard.updatedAt.getTime()}"`;
      
      if (ifMatch && ifMatch !== currentEtag) {
        // Return conflict with current board state
        const conflictBoard = await prisma.board.findUnique({
          where: { id },
          include: {
            frames: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        });

        return res.status(409).json({
          success: false,
          error: 'Conflict detected',
          code: 'ETAG_MISMATCH',
          data: {
            conflict: true,
            serverVersion: {
              ...conflictBoard,
              etag: currentEtag
            },
            clientEtag: ifMatch,
            serverEtag: currentEtag
          }
        });
      }
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

    // Prepare updates, merging layoutPrefs into existing data JSON
    const { layoutPrefs, data: dataFromBody, ...restUpdates } = updates as unknown as {
      layoutPrefs?: Record<string, unknown>;
      data?: Record<string, unknown>;
      [key: string]: unknown;
    };

    const mergedData: Record<string, unknown> = {
      ...(existingBoard.data as Record<string, unknown> || {}),
      ...(dataFromBody || {}),
    };

    if (layoutPrefs) {
      mergedData.layoutPrefs = layoutPrefs;
    }

    // Update the board
    const updatedBoard = await prisma.board.update({
      where: { id },
      data: {
        ...(restUpdates as Record<string, unknown>),
        data: mergedData as unknown as any,
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

    // Generate new etag
    const newEtag = `"${updatedBoard.updatedAt.getTime()}"`;
    res.set('ETag', newEtag);

    // Broadcast settings update if behavior flags changed
    try {
      const role = extractRole(req);
      if (!can(role, 'board.layout.update')) {
        // If unauthorized, we would have rejected above; kept here for consistency
      }
      const agentId = (updatedBoard as any)?.agentId || ((updatedBoard.data as any)?.agentId);
      if (agentId && ('behavior' in restUpdates || layoutPrefs)) {
        broadcastAgentEvent({ type: 'board.settings.updated', agentId, at: new Date().toISOString(), data: { behavior: (restUpdates as any)?.behavior, layoutPrefs: layoutPrefs ?? undefined } });
      }
    } catch {}

    return res.json({
      success: true,
      data: {
        ...updatedBoard,
        etag: newEtag
      }
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

    // Broadcast SSE event to agent channel if linked
    const agentId = (board as any)?.agentId || (board?.data as any)?.agentId;
    if (agentId) {
      try {
        broadcastAgentEvent({ type: 'board.frames.added', agentId, data: { frameId: frame.id, name: frame.name }, at: new Date().toISOString() });
      } catch {}
    }

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
 * POST /api/board-data/:id/frames → add data.frame instance (Phase 9)
 */
router.post('/:id/frames-data', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId } = req.params;
    const body = FrameAdd.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const role = extractRole(req);
    if (!can(role, 'board.frames.add')) {
      return res.status(403).json({ success: false, code: 'forbidden', reason: 'board.frames.add' });
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return res.status(404).json({ success: false, error: 'Board not found' });

    const data = (board.data as any) || {};
    const frames: any[] = Array.isArray(data.frames) ? data.frames : [];
    const instance = {
      id: randomUUID(),
      key: body.key,
      title: body.title,
      visible: body.visible ?? true,
      props: body.props ?? {},
      region: body.region
    };
    frames.push(instance);

    const updated = await prisma.board.update({
      where: { id: boardId },
      data: {
        data: { ...data, frames },
        updatedAt: new Date(),
      }
    });

    const agentId = (updated as any)?.agentId || ((updated.data as any)?.agentId);
    if (agentId) {
      try {
        broadcastAgentEvent({ type: 'board.frames.added', agentId, data: { frameId: instance.id, key: instance.key }, at: new Date().toISOString() });
      } catch {}
    }

    return res.json({ success: true, data: { frames } });
  } catch (error) {
    console.error('Error adding data frame instance:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid frame add', details: error.errors });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/board-data/:id/frames-data/:frameId → update data.frame
 */
router.patch('/:id/frames-data/:frameId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId, frameId } = req.params;
    const patch = FramePatch.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const role = extractRole(req);
    if (!can(role, 'board.frames.update')) {
      return res.status(403).json({ success: false, code: 'forbidden', reason: 'board.frames.update' });
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return res.status(404).json({ success: false, error: 'Board not found' });
    const data = (board.data as any) || {};
    const frames: any[] = Array.isArray(data.frames) ? data.frames : [];
    const idx = frames.findIndex((f) => f.id === frameId);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Frame not found' });

    frames[idx] = { ...frames[idx], ...patch };
    const updated = await prisma.board.update({ where: { id: boardId }, data: { data: { ...data, frames }, updatedAt: new Date() } });

    const agentId = (updated as any)?.agentId || ((updated.data as any)?.agentId);
    if (agentId) {
      try { broadcastAgentEvent({ type: 'board.frames.updated', agentId, data: { frameId }, at: new Date().toISOString() }); } catch {}
    }

    return res.json({ success: true, data: { frames } });
  } catch (error) {
    console.error('Error updating data frame instance:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid frame patch', details: error.errors });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/board-data/:id/frames-data/:frameId → remove data.frame
 */
router.delete('/:id/frames-data/:frameId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId, frameId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const role = extractRole(req);
    if (!can(role, 'board.frames.remove')) {
      return res.status(403).json({ success: false, code: 'forbidden', reason: 'board.frames.remove' });
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return res.status(404).json({ success: false, error: 'Board not found' });
    const data = (board.data as any) || {};
    const frames: any[] = Array.isArray(data.frames) ? data.frames : [];
    const next = frames.filter((f) => f.id !== frameId);

    const updated = await prisma.board.update({ where: { id: boardId }, data: { data: { ...data, frames: next }, updatedAt: new Date() } });
    const agentId = (updated as any)?.agentId || ((updated.data as any)?.agentId);
    if (agentId) {
      try { broadcastAgentEvent({ type: 'board.frames.removed', agentId, data: { frameId }, at: new Date().toISOString() }); } catch {}
    }

    return res.json({ success: true, data: { frames: next } });
  } catch (error) {
    console.error('Error deleting data frame instance:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/board-data/:id/frames-data/reorder → reorder data.frames by id array
 */
router.patch('/:id/frames-data/reorder', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId } = req.params;
    const order = (req.body?.order as string[]) || [];
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const role = extractRole(req);
    if (!can(role, 'board.frames.reorder')) {
      return res.status(403).json({ success: false, code: 'forbidden', reason: 'board.frames.reorder' });
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return res.status(404).json({ success: false, error: 'Board not found' });
    const data = (board.data as any) || {};
    const frames: any[] = Array.isArray(data.frames) ? data.frames : [];
    const idToFrame = new Map(frames.map((f) => [f.id, f] as const));
    const missing = order.filter((fid) => !idToFrame.has(fid));
    if (missing.length) return res.status(400).json({ success: false, error: `Unknown frame ids: ${missing.join(', ')}` });

    const reordered = order.map((fid) => idToFrame.get(fid));
    const updated = await prisma.board.update({ where: { id: boardId }, data: { data: { ...data, frames: reordered }, updatedAt: new Date() } });

    const agentId = (updated as any)?.agentId || ((updated.data as any)?.agentId);
    if (agentId) {
      try { broadcastAgentEvent({ type: 'board.frames.updated', agentId, data: { order }, at: new Date().toISOString() }); } catch {}
    }

    return res.json({ success: true, data: { frames: reordered, order } });
  } catch (error) {
    console.error('Error reordering data frames:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
/**
 * PATCH /api/boards/:id/frames/:frameId → update frame
 */
router.patch('/:id/frames/:frameId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: boardId, frameId } = req.params;
    
    console.log('🔄 PATCH Frame Request:', {
      boardId,
      frameId,
      rawBody: req.body,
      bodyKeys: Object.keys(req.body || {}),
      propsInBody: req.body?.props ? 'YES' : 'NO',
      propsContent: req.body?.props
    });
    
    const updates = FrameUpdate.parse(req.body);
    console.log('✅ Parsed updates:', {
      updates,
      hasProps: 'props' in updates,
      propsValue: updates.props
    });
    
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

    console.log('📋 Existing frame before update:', {
      id: existingFrame.id,
      currentProps: existingFrame.props,
      propsType: typeof existingFrame.props
    });

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

    // Broadcast SSE
    const parentBoard = await prisma.board.findUnique({ where: { id: boardId } });
    const agentId = (parentBoard as any)?.agentId || (parentBoard?.data as any)?.agentId;
    if (agentId) {
      try {
        broadcastAgentEvent({ type: 'board.frames.updated', agentId, data: { frameId: updatedFrame.id }, at: new Date().toISOString() });
      } catch {}
    }

    console.log('🎯 Frame updated successfully:', {
      id: updatedFrame.id,
      newProps: updatedFrame.props,
      propsType: typeof updatedFrame.props,
      propsKeys: updatedFrame.props ? Object.keys(updatedFrame.props) : 'null'
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

    // Broadcast SSE
    const parentBoard = await prisma.board.findUnique({ where: { id: boardId } });
    const agentId = (parentBoard as any)?.agentId || (parentBoard?.data as any)?.agentId;
    if (agentId) {
      try {
        broadcastAgentEvent({ type: 'board.frames.removed', agentId, data: { frameId }, at: new Date().toISOString() });
      } catch {}
    }

    return res.json({
      success: true,
      data: { id: frameId, deleted: true }
    });
  } catch (error) {
    console.error('Error deleting frame:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/boards/:id/frames/reorder → reorder frames
 */
router.patch('/:id/frames/reorder', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const boardId = req.params.id;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Validate request body
    const { order } = FrameReorder.parse(req.body);

    // Check if board exists and user has access
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        frames: {
          select: { id: true, role: true, orderIndex: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    // Validate that all frame IDs exist and belong to this board
    const existingFrameIds = board.frames.map(f => f.id);
    const missingIds = order.filter(id => !existingFrameIds.includes(id));
    
    if (missingIds.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Frame IDs not found: ${missingIds.join(', ')}` 
      });
    }

    // Ensure Cover and Settings frames remain at positions 0 and 1
    const coverFrame = board.frames.find(f => f.role === 'cover');
    const settingsFrame = board.frames.find(f => f.role === 'settings');
    
    if (coverFrame && order.indexOf(coverFrame.id) !== 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cover frame must remain at position 0' 
      });
    }
    
    if (settingsFrame && order.indexOf(settingsFrame.id) !== 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Settings frame must remain at position 1' 
      });
    }

    // Update orderIndex for all frames
    const updates = order.map((frameId, index) => 
      prisma.frameInstance.update({
        where: { id: frameId },
        data: { orderIndex: index, updatedAt: new Date() }
      })
    );

    await prisma.$transaction(updates);

    // Return updated frames
    const updatedFrames = await prisma.frameInstance.findMany({
      where: { boardId },
      orderBy: { orderIndex: 'asc' }
    });

    // Broadcast SSE
    const parentBoard = await prisma.board.findUnique({ where: { id: boardId } });
    const agentId = (parentBoard as any)?.agentId || (parentBoard?.data as any)?.agentId;
    if (agentId) {
      try {
        broadcastAgentEvent({ type: 'board.frames.updated', agentId, data: { order: updatedFrames.map(f => f.id) }, at: new Date().toISOString() });
      } catch {}
    }

    return res.json({
      success: true,
      data: { 
        boardId,
        frames: updatedFrames,
        order 
      }
    });
  } catch (error) {
    console.error('Error reordering frames:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid reorder data', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

// ============================================================================
// Templates endpoints (Phase 9)
// ============================================================================
export const templatesRouter = Router();

// ============================================================================
// Studio alias: GET /api/board-data/agents/:id/home → ensure & return board-data shape
// ============================================================================
export const studioAliasRouter = Router();

studioAliasRouter.get('/agents/:id/home', authMiddlewareCompat, async (req: Request, res: Response) => {
  const reqId = (req as any).reqId || req.get('x-request-id') || '';
  try {
    const { id: agentId } = req.params as { id: string };
    const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_V4.test(agentId)) {
      return res.status(400).json({ success: false, error: 'Invalid agent id', reqId });
    }

    // Ensure via canonical logic (idempotent, seeds five frames, dedupes)
    const board = await ensureAgentHomeBoard(prisma as any, agentId, { reqId, fallbackKeeperId: (req as any).user?.id });

    // Return board-data shape consistent with GET /api/board-data/:id
    const safeDataAny = (board.data as any) ?? {};
    const safeData = (safeDataAny && typeof safeDataAny === 'object') ? safeDataAny : {};
    const safeFramesArr = Array.isArray(safeData.frames) ? safeData.frames : [];
    const safeLayoutPrefs = safeData.layoutPrefs && typeof safeData.layoutPrefs === 'object' ? safeData.layoutPrefs : {};
    const rawBehaviorAny = (board as any)?.behavior ?? {};
    const rawBehavior = (rawBehaviorAny && typeof rawBehaviorAny === 'object') ? rawBehaviorAny : {};
    const behavior = {
      realtime: { enabled: true, ...(rawBehavior.realtime || {}) },
      composition: { allowEdits: true, ...(rawBehavior.composition || {}) },
      ...rawBehavior
    } as any;
    const etag = `"${board.updatedAt.getTime()}"`;
    res.set('ETag', etag);

    return res.json({
      success: true,
      data: {
        ...board,
        behavior,
        data: { ...safeData, frames: safeFramesArr, layoutPrefs: safeLayoutPrefs },
        etag
      },
      reqId
    });
  } catch (error) {
    console.error('[studio-alias:get:error]', { reqId, message: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ success: false, error: 'Internal server error', reqId });
  }
});

// ============================================================================
// RO Parity: GET /api/board-data/agents/:id/home → read-only, service-key auth
// Returns DTO with boardId and ordered frame kinds matching runtime mapping
// ============================================================================
export const boardDataRoRouter = Router();

function normalizeKindForRo(role: string | null, frameType: string): string {
  if (role === 'dialog') return 'dialog';
  if (role === 'agent_preview') return 'preview';
  if (role === 'topics') return 'topics';
  if (role === 'draft') return 'drafts';
  if (role === 'config_panel') return 'config';
  return frameType || 'unknown';
}

boardDataRoRouter.get('/agents/:id/home', kamAuth, kamScope(['boards.ro']), async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params as { id: string };
    // Find existing home board by agentId; do not create/mutate
    const board = await prisma.board.findFirst({
      where: { agentId },
      select: { id: true }
    });

    if (!board) {
      return res.json({ boardId: null, frames: [] });
    }

    const frames = await prisma.frameInstance.findMany({
      where: { boardId: board.id },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, role: true, frameType: true, orderIndex: true, name: true }
    });

    return res.json({
      boardId: board.id,
      frames: frames.map((f) => ({
        id: f.id,
        kind: normalizeKindForRo(f.role as string | null, f.frameType as string),
        order: f.orderIndex,
        title: f.name || null
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: 'internal' });
  }
});

templatesRouter.get('/', async (_req: Request, res: Response) => {
  return res.json({ success: true, data: templatesMem });
});

templatesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const role = extractRole(req);
    if (!can(role, 'board.templates.save')) {
      return res.status(403).json({ success: false, code: 'forbidden', reason: 'board.templates.save' });
    }
    const body = BoardTemplateCreate.parse(req.body);
    const tpl = {
      id: randomUUID(),
      name: body.name,
      description: body.description,
      frames: (body.frames || []).map((f) => ({
        id: f.id || randomUUID(),
        key: f.key,
        title: f.title,
        visible: f.visible ?? true,
        props: f.props ?? {},
        region: f.region,
      })),
      layoutPrefs: body.layoutPrefs,
      createdAt: new Date().toISOString(),
    } as z.infer<typeof BoardTemplate>;
    templatesMem.unshift(tpl);
    return res.json({ success: true, data: tpl });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid template', details: err.errors });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

templatesRouter.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const role = extractRole(req);
    if (!can(role, 'board.templates.apply')) {
      return res.status(403).json({ success: false, code: 'forbidden', reason: 'board.templates.apply' });
    }
    const { id } = req.params;
    const boardId = (req.query.boardId as string) || '';
    if (!boardId) return res.status(400).json({ success: false, error: 'boardId is required' });

    const tpl = templatesMem.find((t) => t.id === id);
    if (!tpl) return res.status(404).json({ success: false, error: 'Template not found' });

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return res.status(404).json({ success: false, error: 'Board not found' });

    const data = (board.data as any) || {};
    const existingFrames: any[] = Array.isArray(data.frames) ? data.frames : [];
    // Merge frames (append new ones; keep existing by id)
    const incoming = tpl.frames.map((f) => ({ ...f, id: f.id || randomUUID() }));
    const merged = [...existingFrames];
    for (const f of incoming) {
      if (!merged.find((m) => m.id === f.id)) merged.push(f);
    }

    const newData = {
      ...data,
      frames: merged,
      layoutPrefs: tpl.layoutPrefs ? { ...(data.layoutPrefs || {}), ...tpl.layoutPrefs } : data.layoutPrefs,
    };

    const updated = await prisma.board.update({ where: { id: boardId }, data: { data: newData, updatedAt: new Date() } });

    const agentId = (updated as any)?.agentId || ((updated.data as any)?.agentId);
    if (agentId) {
      try { broadcastAgentEvent({ type: 'board.frames.updated', agentId, data: { templateId: id }, at: new Date().toISOString() }); } catch {}
    }

    return res.json({ success: true, data: { frames: merged, layoutPrefs: newData.layoutPrefs } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
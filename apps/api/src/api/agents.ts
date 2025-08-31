/**
 * Agents API Routes
 * API endpoints for agent data used by AgentBoard
 */

import { Router, Request, Response } from 'express';
import { memoryRouter } from './agents/memory.js';
import { draftsRouter } from './agents/drafts.js';
import { topicsRouter } from './agents/topics.js';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const router: Router = Router();

// Sub-routes
router.use(memoryRouter);
router.use(topicsRouter);
router.use(draftsRouter);
const prisma = new PrismaClient();

// Validation schemas
const agentQuerySchema = z.object({
  domainId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'training']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET /api/agents - Get all agents
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { domainId, status, limit, offset } = agentQuerySchema.parse(req.query);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Query kip_agents table for real data
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const agents = await prisma.kip_agents.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { created_at: 'desc' },
    });

    const total = await prisma.kip_agents.count({ where });

    return res.json({
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        purpose: agent.purpose,
        model: agent.model,
        agent_class: agent.agent_class,
        status: agent.status,
        model_provider: agent.model_provider,
        visibility: agent.visibility,
        tools: agent.tools,
        permissions: agent.permissions,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agents/:id - Get a specific agent by ID
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const agent = await prisma.kip_agents.findUnique({
      where: { id },
      include: {
        kip_agent_logs: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
        kip_sessions: {
          take: 5,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      purpose: agent.purpose,
      model: agent.model,
      agent_class: agent.agent_class,
      status: agent.status,
      model_provider: agent.model_provider,
      visibility: agent.visibility,
      tools: agent.tools,
      permissions: agent.permissions,
      config: agent.config,
      model_settings: agent.model_settings,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      recent_logs: agent.kip_agent_logs,
      recent_sessions: agent.kip_sessions,
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/agents - Create a new agent
 */
router.post('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const createAgentSchema = z.object({
      name: z.string().min(1).max(100),
      slug: z.string().min(1).max(50),
      purpose: z.string().min(1).max(500),
      model: z.string().min(1),
      agent_class: z.string().default('Standard'),
      model_provider: z.string().default('openai'),
      visibility: z.enum(['private', 'public', 'shared']).default('private'),
      tools: z.array(z.string()).default([]),
      permissions: z.array(z.string()).default([]),
      config: z.record(z.any()).default({}),
      model_settings: z.record(z.any()).default({}),
    });

    const data = createAgentSchema.parse(req.body);
    const agent = await prisma.kip_agents.create({
      data: {
        name: data.name,
        slug: data.slug,
        purpose: data.purpose,
        model: data.model,
        agent_class: data.agent_class,
        model_provider: data.model_provider,
        visibility: data.visibility,
        tools: data.tools,
        permissions: data.permissions,
        config: data.config,
        model_settings: data.model_settings,
        created_by: userId,
        status: 'ready',
      },
    });

    return res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agents/:id/home-board - Get or create Agent Home Board
 */
router.get('/:id/home-board', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Check if agent exists
    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Look for existing Agent Home Board
    let board = await prisma.board.findFirst({
      where: {
        data: {
          path: ['agentId'],
          equals: agentId
        }
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

    // If no board exists, create one using the agent template
    if (!board) {
      const boardId = `agent-board-${agentId}`;
      
      // Create the board
      board = await prisma.board.create({
        data: {
          id: boardId,
          keeperId: agent.created_by || userId, // Use agent creator as keeper, fallback to current user
          name: `${agent.name} Home Board`,
          slug: `agent-${agent.slug}-home`,
          description: `Home board for ${agent.name} agent`,
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
            scope: 'agent',
            entityId: agentId,
            agentId: agentId,
            dataBindings: {}
          },
          access: {
            visibility: 'private',
            roles: {},
            allowComments: false,
            shareLinkEnabled: false
          },
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

      // Create default frames for Agent Home Board
      const frameConfigs = [
        {
          name: 'dialog-default',
          description: 'Default config for dialog frames',
          theme: {},
        },
        {
          name: 'agent-preview-default', 
          description: 'Default config for agent preview frames',
          theme: {},
        },
        {
          name: 'topics-default',
          description: 'Default config for topics frames',
          theme: {},
        },
        {
          name: 'draft-default',
          description: 'Default config for draft frames', 
          theme: {},
        },
        {
          name: 'config-panel-default',
          description: 'Default config for config panel frames',
          theme: {},
        }
      ];

      // Create frame configs
      const createdConfigs = await Promise.all(
        frameConfigs.map(config => 
          prisma.frameConfig.create({
            data: config
          })
        )
      );

      // Create default frames
      const defaultFrames = [
        {
          id: `dialog-${agentId}`,
          boardId: board.id,
          role: null,
          name: 'Agent Conversation',
          pattern: 'dialogic',
          frameType: 'dialog',
          orderIndex: 0,
          layoutKind: 'canvas',
          layoutData: {},
          props: {
            title: 'Agent Conversation',
            placeholder: `Chat with ${agent.name}...`,
            showHistory: true,
            maxMessages: 50,
            agentId: agentId,
            agentName: agent.name
          },
          entityType: 'agent',
          entityId: agentId,
          configId: createdConfigs[0].id,
          updatedAt: new Date(),
        },
        {
          id: `agent-preview-${agentId}`,
          boardId: board.id,
          role: null,
          name: 'Agent Preview',
          pattern: 'focus',
          frameType: 'agent_preview',
          orderIndex: 1,
          layoutKind: 'focus',
          layoutData: {},
          props: {
            showCapabilities: true,
            showStatus: true,
            showMetrics: true,
            agentId: agentId,
            agentName: agent.name,
            model: agent.model,
            provider: agent.model_provider,
            status: agent.status
          },
          entityType: 'agent',
          entityId: agentId,
          configId: createdConfigs[1].id,
          updatedAt: new Date(),
        },
        {
          id: `topics-${agentId}`,
          boardId: board.id,
          role: null,
          name: 'Topics',
          pattern: 'focus',
          frameType: 'topics',
          orderIndex: 2,
          layoutKind: 'focus',
          layoutData: {},
          props: {
            view: 'list',
            showTags: true,
            groupBy: 'status',
            boardId: board.id
          },
          entityType: 'agent',
          entityId: agentId,
          configId: createdConfigs[2].id,
          updatedAt: new Date(),
        },
        {
          id: `draft-${agentId}`,
          boardId: board.id,
          role: null,
          name: 'Draft',
          pattern: 'canvas',
          frameType: 'draft',
          orderIndex: 3,
          layoutKind: 'canvas',
          layoutData: {},
          props: {
            tabs: ['Form', 'JSON', 'Diff', 'History'],
            agentId: agentId
          },
          entityType: 'agent',
          entityId: agentId,
          configId: createdConfigs[3].id,
          updatedAt: new Date(),
        },
        {
          id: `config-panel-${agentId}`,
          boardId: board.id,
          role: null,
          name: 'Configuration',
          pattern: 'wizard',
          frameType: 'config_panel',
          orderIndex: 4,
          layoutKind: 'wizard',
          layoutData: {},
          props: {
            layout: 'tabbed',
            allowSave: true,
            validation: true,
            agentId: agentId
          },
          entityType: 'agent',
          entityId: agentId,
          configId: createdConfigs[4].id,
          updatedAt: new Date(),
        }
      ];

      // Insert frames
      await prisma.frameInstance.createMany({
        data: defaultFrames
      });

      // Refetch board with frames
      const refetchedBoard = await prisma.board.findUnique({
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

      if (!refetchedBoard) {
        return res.status(500).json({ success: false, error: 'Failed to create board' });
      }

      board = refetchedBoard;
    }

    return res.json({
      success: true,
      data: {
        board,
        agent: {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          model: agent.model,
          provider: agent.model_provider
        }
      }
    });
  } catch (error) {
    console.error('Error loading agent home board:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/agents/:id/draft - Get agent draft
 */
router.get('/:id/draft', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Extract draft from agent config
    const config = agent.config as any;
    const draft = config?.draft || null;

    return res.json({
      success: true,
      data: draft
    });
  } catch (error) {
    console.error('Error fetching agent draft:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/agents/:id/draft - Update agent draft
 */
router.patch('/:id/draft', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const updateDraftSchema = z.object({
      status: z.enum(['editing', 'proposed', 'committed', 'rejected']).optional(),
      title: z.string().optional(),
      payload: z.record(z.any()).optional(),
    });

    const updates = updateDraftSchema.parse(req.body);

    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Update draft in agent config
    const config = agent.config as any || {};
    const currentDraft = config.draft || {};

    const updatedDraft = {
      ...currentDraft,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (!currentDraft.createdAt) {
      updatedDraft.createdAt = new Date().toISOString();
    }

    const updatedConfig = {
      ...config,
      draft: updatedDraft
    };

    await prisma.kip_agents.update({
      where: { id: agentId },
      data: { config: updatedConfig }
    });

    return res.json({
      success: true,
      data: updatedDraft
    });
  } catch (error) {
    console.error('Error updating agent draft:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid draft data', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/agents/:id/draft/propose - Propose agent draft
 */
router.post('/:id/draft/propose', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const config = agent.config as any || {};
    const draft = config.draft || {};

    if (draft.status !== 'editing') {
      return res.status(400).json({ 
        success: false, 
        error: 'Can only propose drafts in editing status' 
      });
    }

    // Update draft status and create snapshot
    const updatedDraft = {
      ...draft,
      status: 'proposed',
      updatedAt: new Date().toISOString()
    };

    const updatedConfig = {
      ...config,
      draft: updatedDraft,
      draft_snapshot: { ...draft, snapshotAt: new Date().toISOString() }
    };

    await prisma.kip_agents.update({
      where: { id: agentId },
      data: { config: updatedConfig }
    });

    return res.json({
      success: true,
      data: updatedDraft
    });
  } catch (error) {
    console.error('Error proposing agent draft:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/agents/:id/draft/commit - Commit agent draft
 */
router.post('/:id/draft/commit', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const config = agent.config as any || {};
    const draft = config.draft || {};

    if (draft.status !== 'proposed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Can only commit proposed drafts' 
      });
    }

    // Move draft to history and reset
    const history = config.draft_history || [];
    const newHistoryEntry = {
      id: `history-${Date.now()}`,
      agentId,
      snapshot: config.draft_snapshot || draft,
      status: 'committed',
      committedAt: new Date().toISOString()
    };

    const updatedConfig = {
      ...config,
      draft: {
        status: 'editing',
        title: '',
        payload: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      draft_history: [newHistoryEntry, ...history.slice(0, 9)] // Keep last 10
    };

    await prisma.kip_agents.update({
      where: { id: agentId },
      data: { config: updatedConfig }
    });

    return res.json({
      success: true,
      data: updatedConfig.draft
    });
  } catch (error) {
    console.error('Error committing agent draft:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/agents/:id/draft/history - Get agent draft history
 */
router.get('/:id/draft/history', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: agentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const config = agent.config as any || {};
    const history = config.draft_history || [];

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching agent draft history:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

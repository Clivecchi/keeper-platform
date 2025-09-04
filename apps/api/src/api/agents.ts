/**
 * Agents API Routes
 * API endpoints for agent data used by AgentBoard
 */

import { Router, Request, Response } from 'express';
import { memoryRouter } from './agents/memory.js';
import { draftsRouter } from './agents/drafts.js';
import { topicsRouter } from './agents/topics.js';
import { activityRouter } from './agents/activity.js';
import { tasksRouter } from './agents/tasks.js';
import eventsRouter from './agents/events.js';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { randomUUID } from 'crypto';

const router: Router = Router();

// Sub-routes
router.use(memoryRouter);
router.use(topicsRouter);
router.use(draftsRouter);
router.use(activityRouter);
router.use(tasksRouter);
router.use(eventsRouter);
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
    const reqId = (req as any).reqId || req.get('x-request-id') || '';

    if (!userId) {
      console.warn('[home-board:auth] missing bearer or user in request', { reqId });
      return res.status(401).json({ success: false, error: 'Unauthorized', reqId });
    }

    const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_V4.test(agentId)) {
      return res.status(400).json({ success: false, error: 'Invalid agent id', reqId });
    }

    console.log('[agent-home:ensure:start]', { agentId, reqId });

    const agent = await prisma.kip_agents.findUnique({ where: { id: agentId } });
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found', reqId });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.board.findFirst({
        where: { agentId },
        include: { frames: { orderBy: { orderIndex: 'asc' }, include: { FrameConfig: true } } }
      });
      if (existing) {
        console.log('[agent-home:ensure:found]', { agentId, boardId: existing.id });
        return existing;
      }

      const safeSlug = `agent-${(agent.slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^(-)+|(-)+$/g, '')}-home`;
      const createData: any = {
        keeperId: agent.created_by || userId,
        name: `${agent.name} Home Board`,
        slug: safeSlug,
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
        data: { scope: 'agent', entityId: agentId, agentId, dataBindings: {} },
        access: { visibility: 'private', roles: {}, allowComments: false, shareLinkEnabled: false },
        updatedAt: new Date(),
        agentId
      };

      let board = await tx.board.create({
        data: createData,
        include: { frames: { orderBy: { orderIndex: 'asc' }, include: { FrameConfig: true } } }
      });
      console.log('[agent-home:ensure:created]', { agentId, boardId: board.id });

      const configNameByRole: Record<string, string> = {
        dialog: 'dialogic-default',
        agent_preview: 'preview-default',
        topics: 'topics-default',
        draft: 'draft-default',
        config_panel: 'config-panel-default'
      };

      const ensureConfig = async (name: string) => {
        const found = await tx.frameConfig.findFirst({ where: { name } });
        if (found) return found.id;
        const created = await tx.frameConfig.create({ data: { name, description: `Default config for ${name}`, theme: {} } });
        return created.id;
      };

      const roles = [
        { role: 'dialog', name: 'Agent Conversation', frameType: 'dialog', pattern: 'dialogic', orderIndex: 0 },
        { role: 'agent_preview', name: 'Agent Preview', frameType: 'agent_preview', pattern: 'focus', orderIndex: 1 },
        { role: 'topics', name: 'Topics', frameType: 'topics', pattern: 'focus', orderIndex: 2 },
        { role: 'draft', name: 'Draft', frameType: 'draft', pattern: 'canvas', orderIndex: 3 },
        { role: 'config_panel', name: 'Configuration', frameType: 'config_panel', pattern: 'wizard', orderIndex: 4 }
      ];

      for (const r of roles) {
        const cfgId = await ensureConfig(configNameByRole[r.role]);
        const existingFrame = await tx.frameInstance.findFirst({ where: { boardId: board.id, role: r.role } });
        if (!existingFrame) {
          await tx.frameInstance.create({
            data: {
              id: randomUUID(),
              boardId: board.id,
              role: r.role,
              name: r.name,
              pattern: r.pattern,
              frameType: r.frameType,
              orderIndex: r.orderIndex,
              layoutKind: r.pattern === 'wizard' ? 'wizard' : (r.pattern === 'focus' ? 'focus' : 'canvas'),
              layoutData: {},
              props: r.role === 'dialog' ? {
                title: 'Agent Conversation', placeholder: `Chat with ${agent.name}...`, showHistory: true, maxMessages: 50, agentId, agentName: agent.name
              } : r.role === 'agent_preview' ? {
                showCapabilities: true, showStatus: true, showMetrics: true, agentId, agentName: agent.name, model: agent.model, provider: agent.model_provider, status: agent.status
              } : r.role === 'topics' ? {
                view: 'list', showTags: true, groupBy: 'status', boardId: board.id
              } : r.role === 'draft' ? {
                tabs: ['Form', 'JSON', 'Diff', 'History'], agentId
              } : {
                layout: 'tabbed', allowSave: true, validation: true, agentId
              },
              entityType: 'agent',
              entityId: agentId,
              configId: cfgId,
              updatedAt: new Date(),
            }
          });
          console.log('[agent-home:ensure:seed:frame]', { boardId: board.id, role: r.role, upserted: true });
        }
      }

      board = await tx.board.findUnique({ where: { id: board.id }, include: { frames: { orderBy: { orderIndex: 'asc' }, include: { FrameConfig: true } } } }) as typeof board;
      return board;
    });

    console.log('[agent-home:ensure:done]', { agentId, boardId: result.id });

    return res.json({
      success: true,
      data: {
        board: result,
        agent: {
          id: agentId,
          name: agent.name,
          status: agent.status,
          model: agent.model,
          provider: agent.model_provider
        }
      },
      reqId
    });
  } catch (error) {
    const reqId = (req as any).reqId || req.get('x-request-id') || '';
    console.error('[home-board:get:error]', { reqId, agentId: req.params?.id, message: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ success: false, error: 'Internal server error', reqId });
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

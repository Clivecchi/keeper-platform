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
import { PrismaClient, updateKipAgent } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { randomUUID } from 'crypto';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatAgentResponse(agent: {
  id: string;
  name: string;
  slug: string;
  purpose: string;
  model: string;
  agent_class: string;
  context_scope: string | null;
  status: string;
  model_provider: string;
  visibility: string;
  tools: string[];
  permissions: string[];
  config: unknown;
  model_settings: unknown;
  created_at: Date;
  updated_at: Date;
  kip_agent_logs?: unknown[];
  kip_sessions?: unknown[];
}) {
  return {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    purpose: agent.purpose,
    model: agent.model,
    agent_class: agent.agent_class,
    context_scope: agent.context_scope,
    status: agent.status,
    model_provider: agent.model_provider,
    visibility: agent.visibility,
    tools: agent.tools,
    permissions: agent.permissions,
    config: agent.config,
    model_settings: agent.model_settings,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
    ...(agent.kip_agent_logs !== undefined ? { recent_logs: agent.kip_agent_logs } : {}),
    ...(agent.kip_sessions !== undefined ? { recent_sessions: agent.kip_sessions } : {}),
  };
}

function normalizeToolsInput(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

function normalizeConfigInput(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const patchAgentSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    purpose: z.string().min(1).max(500).optional(),
    context_scope: z.string().max(5000).nullable().optional(),
    model: z.string().min(1).max(100).optional(),
    tools: z.union([z.array(z.string()), z.string()]).optional(),
    config: z.record(z.any()).optional(),
  })
  .strict();

const router: Router = Router();

// Sub-routes
router.use(memoryRouter);
router.use(topicsRouter);
router.use(draftsRouter);
router.use(activityRouter);
router.use(tasksRouter);
router.use(eventsRouter);
const prisma = new PrismaClient();

// Ensure the Agent Home Board exists and has the required frames (idempotent)
export async function ensureAgentHomeBoard(client: PrismaClient, agentId: string, opts?: { reqId?: string; fallbackKeeperId?: string }) {
  const reqId = opts?.reqId || '';
  console.log('[agent-home:ensure:start]', { reqId, agentId });

  // Validate UUID shape (36-char UUID)
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_V4.test(agentId)) {
    throw Object.assign(new Error('Invalid agent id'), { status: 400 });
  }

  const agent = await client.kip_agents.findUnique({ where: { id: agentId } });
  if (!agent) {
    const err = new Error('Agent not found');
    (err as any).status = 404;
    throw err;
  }

  const keeperId = (agent.created_by as string | null) || opts?.fallbackKeeperId || '';
  const safeSlug = `agent-${(agent.slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^(-)+|(-)+$/g, '')}-home`;

  // Helper to include frames consistently
  const includeBoard = {
    frames: {
      orderBy: { orderIndex: 'asc' },
      include: { FrameConfig: true },
    },
  } as const;

  // 1) Prefer lookup by agentId
  let board = await client.board.findFirst({ where: { agentId: agent.id }, include: includeBoard });
  if (board) {
    console.log('[agent-home:ensure:found-by-agentId]', { reqId, agentId, boardId: board.id });
  }

  // 2) Fallback by (keeperId, slug)
  if (!board) {
    board = await client.board.findFirst({ where: { keeperId, slug: safeSlug }, include: includeBoard });
    if (board) {
      console.log('[agent-home:ensure:found-by-slug]', { reqId, agentId, boardId: board.id, keeperId, slug: safeSlug });
      if (!board.agentId) {
        board = await client.board.update({
          where: { id: board.id },
          data: { agentId: agent.id, data: { ...(board.data as any ?? {}), scope: 'agent' } },
          include: includeBoard,
        });
        console.log('[agent-home:ensure:attached-agentId]', { reqId, boardId: board.id, agentId });
      }
    }
  }

  // 3) Create only if truly missing
  if (!board) {
    try {
      board = await client.board.create({
        data: {
          keeperId: keeperId || agent.created_by || agent.id, // ensure set so Studio can list it
          name: `${agent.name} Home Board`,
          slug: safeSlug,
          description: `Home board for ${agent.name} agent`,
          behavior: { defaultPattern: 'dialogic' },
          data: { scope: 'agent', agentId: agent.id, entityId: agent.id, dataBindings: {} },
          access: { visibility: 'private' },
          updatedAt: new Date(),
          agentId: agent.id,
        },
        include: includeBoard,
      });
      console.log('[agent-home:ensure:created]', { reqId, agentId, boardId: board.id });
    } catch (e: any) {
      // P2002: already exists under (keeperId, slug) – fetch and attach
      if (e?.code === 'P2002') {
        console.warn('[agent-home:ensure:create-conflict-P2002]', { reqId, agentId, keeperId, slug: safeSlug });
        board = await client.board.findFirst({ where: { keeperId, slug: safeSlug }, include: includeBoard });
        if (board && !board.agentId) {
          board = await client.board.update({
            where: { id: board.id },
            data: { agentId: agent.id, data: { ...(board.data as any ?? {}), scope: 'agent' } },
            include: includeBoard,
          });
          console.log('[agent-home:ensure:attached-agentId-post-conflict]', { reqId, boardId: board.id, agentId });
        }
      } else {
        console.error('[agent-home:ensure:create-failed]', { reqId, agentId, error: e?.message || String(e) });
        throw e;
      }
    }
  }

  // 4) Idempotent seed/repair of frames
  const required = [
    { role: 'dialog', name: 'Agent Conversation', frameType: 'dialog', pattern: 'dialogic', orderIndex: 0 },
    { role: 'agent_preview', name: 'Agent Preview', frameType: 'agent_preview', pattern: 'focus', orderIndex: 1 },
    { role: 'topics', name: 'Topics', frameType: 'topics', pattern: 'focus', orderIndex: 2 },
    { role: 'draft', name: 'Draft', frameType: 'draft', pattern: 'canvas', orderIndex: 3 },
    { role: 'config_panel', name: 'Configuration', frameType: 'config_panel', pattern: 'wizard', orderIndex: 4 },
  ] as const;

  // Enforce canonical set: delete extraneous frames and dedupe multiples per role
  const canonicalRoles = new Set<string>(required.map(r => r.role));

  await client.$transaction(async (tx) => {
    const frames = await tx.frameInstance.findMany({
      where: { boardId: board!.id },
      orderBy: { createdAt: 'asc' }
    });

    // 4a) Remove any frames that are not part of the canonical AHB roles
    const extras = frames.filter((f: any) => !canonicalRoles.has((f.role as string | null) || ''));
    for (const f of extras) {
      await tx.frameInstance.delete({ where: { id: f.id } });
      console.log('[agent-home:ensure:prune:extra-frame]', { reqId, boardId: board!.id, frameId: f.id, role: f.role, frameType: f.frameType });
    }

    // 4b) For each canonical role, keep first (oldest) and delete duplicates
    for (const role of canonicalRoles) {
      const byRole = frames.filter((f: any) => f.role === role);
      if (byRole.length > 1) {
        const [, ...dups] = byRole; // keep first
        for (const d of dups) {
          await tx.frameInstance.delete({ where: { id: d.id } });
          console.log('[agent-home:ensure:prune:dup-role]', { reqId, boardId: board!.id, role, frameId: d.id });
        }
      }
    }
  });

  // Reload board after pruning
  board = await client.board.findUnique({ where: { id: board!.id }, include: includeBoard });

  const existingByType = new Map((board?.frames ?? []).map((f: any) => [f.frameType, f]));
  const toCreate = required.filter(r => !existingByType.has(r.frameType));
  if (toCreate.length) {
    // Ensure FrameConfig for each role
    const configNameByRole: Record<string, string> = {
      dialog: 'dialogic-default',
      agent_preview: 'preview-default',
      topics: 'topics-default',
      draft: 'draft-default',
      config_panel: 'config-panel-default',
    };

    for (const r of toCreate) {
      const name = configNameByRole[r.role];
      const cfg = await client.frameConfig.findFirst({ where: { name } }) || await client.frameConfig.create({ data: { name, description: `Default config for ${name}`, theme: {} } });
      await client.frameInstance.create({
        data: {
          id: randomUUID(),
          boardId: board!.id,
          role: r.role,
          name: r.name,
          pattern: r.pattern,
          frameType: r.frameType,
          orderIndex: r.orderIndex,
          layoutKind: r.pattern === 'wizard' ? 'wizard' : (r.pattern === 'focus' ? 'focus' : 'canvas'),
          layoutData: {},
          props: r.role === 'dialog' ? {
            title: 'Agent Conversation', placeholder: `Chat with ${agent.name}...`, showHistory: true, maxMessages: 50, agentId: agent.id, agentName: agent.name
          } : r.role === 'agent_preview' ? {
            showCapabilities: true, showStatus: true, showMetrics: true, agentId: agent.id, agentName: agent.name, model: agent.model, provider: agent.model_provider, status: agent.status
          } : r.role === 'topics' ? {
            view: 'list', showTags: true, groupBy: 'status', boardId: board!.id
          } : r.role === 'draft' ? {
            tabs: ['Form', 'JSON', 'Diff', 'History'], agentId: agent.id
          } : {
            layout: 'tabbed', allowSave: true, validation: true, agentId: agent.id
          },
          entityType: 'agent',
          entityId: agent.id,
          configId: cfg.id,
          updatedAt: new Date(),
        }
      });
      console.log('[agent-home:ensure:seed:frame]', { reqId, boardId: board!.id, frameType: r.frameType, upserted: true });
    }

    // Reload board with frames
    board = await client.board.findUnique({ where: { id: board!.id }, include: includeBoard });
  }

  console.log('[agent-home:ensure:done]', { reqId, agentId, boardId: board!.id, frames: (board!.frames || []).length });
  return board!;
}

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

    return res.json(formatAgentResponse(agent));
  } catch (error) {
    console.error('Error fetching agent:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/agents/:id - Update agent fields (Chronicle presence saves)
 * Uses updateKipAgent — same path as PUT /api/kip/agents.
 */
router.patch('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!UUID_V4.test(id)) {
      return res.status(400).json({ error: 'Invalid agent id' });
    }

    const existing = await prisma.kip_agents.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const parsed = patchAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.errors });
    }

    const body = parsed.data;
    const tools = normalizeToolsInput(body.tools);
    const config = normalizeConfigInput(body.config);

    const updatePayload: Parameters<typeof updateKipAgent>[1] = {};
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.purpose !== undefined) updatePayload.purpose = body.purpose;
    if (body.context_scope !== undefined) {
      updatePayload.context_scope = body.context_scope === null ? undefined : body.context_scope;
    }
    if (body.model !== undefined) updatePayload.model = body.model;
    if (tools !== undefined) updatePayload.tools = tools;
    if (config !== undefined) updatePayload.config = config;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const updated = await updateKipAgent(id, updatePayload);
    return res.json(formatAgentResponse(updated));
  } catch (error) {
    console.error('Error updating agent:', error);
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

    const board = await ensureAgentHomeBoard(prisma, agentId, { reqId, fallbackKeeperId: userId });

    return res.json({
      success: true,
      data: {
        board,
      },
      reqId,
    });
  } catch (error) {
    const reqId = (req as any).reqId || req.get('x-request-id') || '';
    const status = (error as any)?.status || 500;
    console.error('[home-board:get:error]', { reqId, agentId: req.params?.id, message: error instanceof Error ? error.message : String(error) });
    return res.status(status).json({ success: false, error: (error as any)?.message || 'Internal server error', reqId });
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

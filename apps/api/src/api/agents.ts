/**
 * Agents API Routes
 * API endpoints for agent data used by AgentBoard
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const router: Router = Router();
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
        ...data,
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

export default router;

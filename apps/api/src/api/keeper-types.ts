/**
 * Keeper Types API Routes
 * API endpoints for keeper type data used by KeeperTypeBoard
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const keeperTypeQuerySchema = z.object({
  system: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET /api/keeper-types - Get all keeper types
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { system, limit, offset } = keeperTypeQuerySchema.parse(req.query);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const where: any = {};
    if (system !== undefined) {
      where.system = system;
    }

    const keeperTypes = await prisma.keeperType.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        Keeper: {
          select: {
            id: true,
            title: true,
            purpose: true,
            Journey: true,
          },
        },
        kip_agent_keeper_types: {
          include: {
            kip_agents: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        keeper_type_engagement_templates: {
          include: {
            engagement_templates: {
              select: {
                id: true,
                label: true,
                slug: true,
                type: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.keeperType.count({ where });

    return res.json({
      keeperTypes: keeperTypes.map(keeperType => ({
        id: keeperType.id,
        name: keeperType.name,
        memoryPattern: keeperType.memoryPattern,
        system: keeperType.system,
        createdAt: keeperType.createdAt,
        keeperCount: keeperType.Keeper.length,
        agentCount: keeperType.kip_agent_keeper_types.length,
        templateCount: keeperType.keeper_type_engagement_templates.length,
        keepers: keeperType.Keeper,
        agents: keeperType.kip_agent_keeper_types.map(akt => akt.kip_agents),
        templates: keeperType.keeper_type_engagement_templates.map(ktet => ktet.engagement_templates),
        capabilities: getKeeperTypeCapabilities(keeperType.name, keeperType.memoryPattern),
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    console.error('Error fetching keeper types:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/keeper-types/:id - Get a specific keeper type by ID
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const keeperType = await prisma.keeperType.findUnique({
      where: { id },
      include: {
        Keeper: {
          include: {
            Journey: {
              select: {
                id: true,
                name: true,
                forward: true,
              },
            },
          },
        },
        kip_agent_keeper_types: {
          include: {
            kip_agents: true,
          },
        },
        keeper_type_engagement_templates: {
          include: {
            engagement_templates: {
              include: {
                engagement_fields: true,
                engagement_styles: true,
              },
            },
          },
        },
      },
    });

    if (!keeperType) {
      return res.status(404).json({ error: 'Keeper type not found' });
    }

    return res.json({
      id: keeperType.id,
      name: keeperType.name,
      memoryPattern: keeperType.memoryPattern,
      system: keeperType.system,
      createdAt: keeperType.createdAt,
      description: getKeeperTypeDescription(keeperType.name),
      capabilities: getKeeperTypeCapabilities(keeperType.name, keeperType.memoryPattern),
      keepers: keeperType.Keeper,
      agents: keeperType.kip_agent_keeper_types.map(akt => akt.kip_agents),
      templates: keeperType.keeper_type_engagement_templates.map(ktet => ktet.engagement_templates),
      stats: {
        totalKeepers: keeperType.Keeper.length,
        totalJourneys: keeperType.Keeper.reduce((sum, keeper) => sum + keeper.Journey.length, 0),
        totalAgents: keeperType.kip_agent_keeper_types.length,
        totalTemplates: keeperType.keeper_type_engagement_templates.length,
      },
    });
  } catch (error) {
    console.error('Error fetching keeper type:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/keeper-types - Create a new keeper type
 */
router.post('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const createKeeperTypeSchema = z.object({
      name: z.string().min(1).max(100),
      memoryPattern: z.string().optional(),
      system: z.boolean().default(false),
    });

    const data = createKeeperTypeSchema.parse(req.body);

    const keeperType = await prisma.keeperType.create({
      data: {
        id: data.name.toLowerCase().replace(/\s+/g, '-'),
        name: data.name,
        memoryPattern: data.memoryPattern,
        system: data.system ?? false,
      },
    });

    return res.status(201).json(keeperType);
  } catch (error) {
    console.error('Error creating keeper type:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function getKeeperTypeDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'DevKeeper': 'Keeper type for technical projects and code collaboration.',
    'StoryKeeper': 'Capture and share meaningful narratives.',
    'BizKeeper': 'Business operations and growth management.',
    'ai-keeper-sole': 'AI-powered memory management with SOLE architecture.',
  };
  return descriptions[name] || `Keeper type for ${name.toLowerCase()} activities.`;
}

function getKeeperTypeCapabilities(name: string, memoryPattern?: string | null): string[] {
  const baseCapabilities: Record<string, string[]> = {
    'DevKeeper': ['Version Control', 'Code Review', 'Technical Documentation', 'Project Management'],
    'StoryKeeper': ['Narrative Creation', 'Story Archiving', 'Character Development', 'Plot Tracking'],
    'BizKeeper': ['Business Planning', 'Growth Tracking', 'Team Management', 'Strategy Development'],
    'ai-keeper-sole': ['Memory Management', 'Reflection Processing', 'Identity Tracking', 'Echo Generation'],
  };

  let capabilities = baseCapabilities[name] || ['Content Management', 'Organization', 'Collaboration'];

  if (memoryPattern === 'SOLE') {
    capabilities.push('SOLE Memory Architecture', 'Reflection Processing', 'Memory Cards');
  }

  return capabilities;
}

export default router;

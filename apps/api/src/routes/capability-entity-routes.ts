/**
 * Capability EntityKind routes — registry CRUD (Pass 1: list, get, PATCH metadata).
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const router = Router();

const patchCapabilitySchema = z
  .object({
    display_label: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type CapabilityUsedByEntry = {
  agentId: string;
  agentName: string;
  agentSlug: string;
  column: 'capabilities' | 'tools' | 'permissions';
};

export type CapabilityEntityRecord = {
  id: string;
  slug: string;
  kind: string;
  display_label: string | null;
  description: string | null;
  chronicle_blocks: string[];
  chronicle_actions: string[];
  domain_id: string | null;
  used_by: CapabilityUsedByEntry[];
  created_at: string;
  updated_at: string;
};

function resolveUsedBy(
  slug: string,
  agents: Array<{
    id: string;
    name: string;
    slug: string;
    capabilities: string[];
    tools: string[];
    permissions: string[];
  }>,
): CapabilityUsedByEntry[] {
  const matches: CapabilityUsedByEntry[] = [];
  for (const agent of agents) {
    if (agent.capabilities.includes(slug)) {
      matches.push({
        agentId: agent.id,
        agentName: agent.name,
        agentSlug: agent.slug,
        column: 'capabilities',
      });
    }
    if (agent.tools.includes(slug)) {
      matches.push({
        agentId: agent.id,
        agentName: agent.name,
        agentSlug: agent.slug,
        column: 'tools',
      });
    }
    if (agent.permissions.includes(slug)) {
      matches.push({
        agentId: agent.id,
        agentName: agent.name,
        agentSlug: agent.slug,
        column: 'permissions',
      });
    }
  }
  return matches;
}

function toCapabilityRecord(
  row: {
    id: string;
    slug: string;
    kind: string;
    display_label: string | null;
    description: string | null;
    chronicle_blocks: string[];
    chronicle_actions: string[];
    domain_id: string | null;
    created_at: Date;
    updated_at: Date;
  },
  usedBy: CapabilityUsedByEntry[],
): CapabilityEntityRecord {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    display_label: row.display_label,
    description: row.description,
    chronicle_blocks: row.chronicle_blocks,
    chronicle_actions: row.chronicle_actions,
    domain_id: row.domain_id,
    used_by: usedBy,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * GET /api/capabilities
 * List platform capabilities (domain_id null) for Nav.
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const domainId = q.domainId;

    const rows = await prisma.capability.findMany({
      where: domainId ? { OR: [{ domain_id: null }, { domain_id: domainId }] } : { domain_id: null },
      orderBy: [{ kind: 'asc' }, { slug: 'asc' }],
    });

    return res.status(200).json(
      rows.map((row) =>
        toCapabilityRecord(row, []),
      ),
    );
  } catch (err) {
    console.error('[capabilities/list]', err);
    return res.status(500).json({ error: 'Failed to list capabilities' });
  }
});

/**
 * GET /api/capabilities/:id
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const row = await prisma.capability.findUnique({ where: { id: req.params.id } });
    if (!row) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const agents = await prisma.kip_agents.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        capabilities: true,
        tools: true,
        permissions: true,
      },
    });

    return res.status(200).json(toCapabilityRecord(row, resolveUsedBy(row.slug, agents)));
  } catch (err) {
    console.error('[capabilities/get]', err);
    return res.status(500).json({ error: 'Failed to fetch capability' });
  }
});

/**
 * PATCH /api/capabilities/:id
 */
router.patch('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = patchCapabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const existing = await prisma.capability.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const updated = await prisma.capability.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        updated_at: new Date(),
      },
    });

    const agents = await prisma.kip_agents.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        capabilities: true,
        tools: true,
        permissions: true,
      },
    });

    return res.status(200).json(toCapabilityRecord(updated, resolveUsedBy(updated.slug, agents)));
  } catch (err) {
    console.error('[capabilities/patch]', err);
    return res.status(500).json({ error: 'Failed to update capability' });
  }
});

export default router;

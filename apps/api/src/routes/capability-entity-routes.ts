/**
 * Capability EntityKind routes — registry CRUD + AgentCapability grants (Pass 2a).
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

const createGrantSchema = z.object({
  agentId: z.string().uuid(),
});

export type CapabilityGrantSource =
  | 'capabilities'
  | 'tools'
  | 'permissions'
  | 'manual';

export type CapabilityUsedByEntry = {
  agentId: string;
  agentName: string;
  agentSlug: string;
  source: CapabilityGrantSource;
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

async function fetchUsedBy(capabilityId: string): Promise<CapabilityUsedByEntry[]> {
  const grants = await prisma.agentCapability.findMany({
    where: { capability_id: capabilityId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [{ agent: { name: 'asc' } }],
  });

  return grants.map((grant) => ({
    agentId: grant.agent.id,
    agentName: grant.agent.name,
    agentSlug: grant.agent.slug,
    source: grant.source as CapabilityGrantSource,
  }));
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
 * POST /api/capabilities/:id/grants
 * Assign capability to agent (source: manual).
 */
router.post('/:id/grants', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = createGrantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const capability = await prisma.capability.findUnique({ where: { id: req.params.id } });
    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const agent = await prisma.kip_agents.findUnique({
      where: { id: parsed.data.agentId },
      select: { id: true },
    });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const existing = await prisma.agentCapability.findUnique({
      where: {
        agent_id_capability_id: {
          agent_id: parsed.data.agentId,
          capability_id: capability.id,
        },
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'Agent already has this capability grant' });
    }

    await prisma.agentCapability.create({
      data: {
        agent_id: parsed.data.agentId,
        capability_id: capability.id,
        source: 'manual',
      },
    });

    const usedBy = await fetchUsedBy(capability.id);
    return res.status(201).json(toCapabilityRecord(capability, usedBy));
  } catch (err) {
    console.error('[capabilities/grants/create]', err);
    return res.status(500).json({ error: 'Failed to create capability grant' });
  }
});

/**
 * DELETE /api/capabilities/:id/grants/:agentId
 */
router.delete('/:id/grants/:agentId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const capability = await prisma.capability.findUnique({ where: { id: req.params.id } });
    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const deleted = await prisma.agentCapability.deleteMany({
      where: {
        capability_id: capability.id,
        agent_id: req.params.agentId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Grant not found' });
    }

    const usedBy = await fetchUsedBy(capability.id);
    return res.status(200).json(toCapabilityRecord(capability, usedBy));
  } catch (err) {
    console.error('[capabilities/grants/delete]', err);
    return res.status(500).json({ error: 'Failed to delete capability grant' });
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

    const usedBy = await fetchUsedBy(row.id);
    return res.status(200).json(toCapabilityRecord(row, usedBy));
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

    const usedBy = await fetchUsedBy(updated.id);
    return res.status(200).json(toCapabilityRecord(updated, usedBy));
  } catch (err) {
    console.error('[capabilities/patch]', err);
    return res.status(500).json({ error: 'Failed to update capability' });
  }
});

export default router;

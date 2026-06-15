/**
 * Library EntityKind routes — Pass 1 (upload + url ingestion).
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import { resolveLibraryChronicleDefaults } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { contextualizeLibraryItem } from '../services/LibraryItemIngestionService.js';
import { diagnosePgVectorExtension } from '../services/LibraryItemEmbeddingService.js';

const router = Router();

const FUNCTIONAL_SOURCE_TYPES = ['upload', 'url'] as const;

const createLibraryItemSchema = z.object({
  domain_id: z.string().min(1),
  source_type: z.enum(FUNCTIONAL_SOURCE_TYPES),
  source_ref: z.string().min(1).max(4000),
  display_label: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  assigned_keeper_id: z.string().nullable().optional(),
  assigned_agent_id: z.string().uuid().nullable().optional(),
  activeKeeperId: z.string().nullable().optional(),
  activeAgentId: z.string().uuid().nullable().optional(),
});

const patchLibraryItemSchema = z
  .object({
    display_label: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    assigned_keeper_id: z.string().nullable().optional(),
    assigned_agent_id: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type LibraryItemRecord = {
  id: string;
  domain_id: string;
  source_type: string;
  source_ref: string;
  display_label: string | null;
  description: string | null;
  agent_perspective: string | null;
  assigned_keeper_id: string | null;
  assigned_agent_id: string | null;
  assigned_keeper_name: string | null;
  assigned_agent_name: string | null;
  chronicle_blocks: string[];
  chronicle_actions: string[];
  has_embedding: boolean;
  created_at: string;
  updated_at: string;
};

type LibraryItemRow = {
  id: string;
  domain_id: string;
  source_type: string;
  source_ref: string;
  display_label: string | null;
  description: string | null;
  agent_perspective: string | null;
  assigned_keeper_id: string | null;
  assigned_agent_id: string | null;
  chronicle_blocks: string[];
  chronicle_actions: string[];
  created_at: Date;
  updated_at: Date;
  assignedKeeper?: { title: string } | null;
  assignedAgent?: { name: string } | null;
};

async function resolveDefaultAssignments(params: {
  domainId: string;
  body: z.infer<typeof createLibraryItemSchema>;
}): Promise<{ keeperId: string | null; agentId: string | null }> {
  let keeperId =
    params.body.assigned_keeper_id ??
    params.body.activeKeeperId ??
    null;

  let agentId =
    params.body.assigned_agent_id ??
    params.body.activeAgentId ??
    null;

  if (!agentId) {
    const domain = await prisma.domain.findUnique({
      where: { id: params.domainId },
      select: { settings: true },
    });
    const settings =
      domain?.settings && typeof domain.settings === 'object' && !Array.isArray(domain.settings)
        ? (domain.settings as Record<string, unknown>)
        : {};
    const primaryAgentId =
      typeof settings.primaryAgentId === 'string' ? settings.primaryAgentId : null;
    if (primaryAgentId) {
      agentId = primaryAgentId;
    } else {
      const kip = await prisma.kip_agents.findUnique({
        where: { slug: 'kip' },
        select: { id: true },
      });
      agentId = kip?.id ?? null;
    }
  }

  if (keeperId) {
    const keeper = await prisma.keeper.findFirst({
      where: { id: keeperId, domainId: params.domainId },
      select: { id: true },
    });
    if (!keeper) keeperId = null;
  }

  if (agentId) {
    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId },
      select: { id: true },
    });
    if (!agent) agentId = null;
  }

  return { keeperId, agentId };
}

async function hasEmbedding(id: string): Promise<boolean> {
  const row = await prisma.libraryItem.findUnique({
    where: { id },
    select: { embedding: true },
  });
  return Boolean(row?.embedding?.length);
}

function toLibraryItemRecord(row: LibraryItemRow, hasEmb = false): LibraryItemRecord {
  return {
    id: row.id,
    domain_id: row.domain_id,
    source_type: row.source_type,
    source_ref: row.source_ref,
    display_label: row.display_label,
    description: row.description,
    agent_perspective: row.agent_perspective,
    assigned_keeper_id: row.assigned_keeper_id,
    assigned_agent_id: row.assigned_agent_id,
    assigned_keeper_name: row.assignedKeeper?.title ?? null,
    assigned_agent_name: row.assignedAgent?.name ?? null,
    chronicle_blocks: row.chronicle_blocks,
    chronicle_actions: row.chronicle_actions,
    has_embedding: hasEmb,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const libraryInclude = {
  assignedKeeper: { select: { title: true } },
  assignedAgent: { select: { name: true } },
} as const;

/**
 * GET /api/library-items/diagnostics/pgvector
 */
router.get('/diagnostics/pgvector', authMiddlewareCompat, async (_req: Request, res: Response) => {
  const diag = await diagnosePgVectorExtension();
  return res.status(200).json({ success: true, data: diag });
});

/**
 * GET /api/library-items?domainId=
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const domainId = typeof req.query.domainId === 'string' ? req.query.domainId : '';
    if (!domainId) {
      return res.status(400).json({ error: 'domainId query parameter is required' });
    }

    const rows = await prisma.libraryItem.findMany({
      where: { domain_id: domainId },
      include: libraryInclude,
      orderBy: [{ created_at: 'desc' }],
    });

    const records = await Promise.all(
      rows.map(async (row) => toLibraryItemRecord(row, await hasEmbedding(row.id))),
    );

    return res.status(200).json(records);
  } catch (err) {
    console.error('[library-items/list]', err);
    return res.status(500).json({ error: 'Failed to list library items' });
  }
});

/**
 * POST /api/library-items
 */
router.post('/', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = createLibraryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: parsed.data.domain_id },
      select: { id: true },
    });
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const defaults = resolveLibraryChronicleDefaults();
    const { keeperId, agentId } = await resolveDefaultAssignments({
      domainId: parsed.data.domain_id,
      body: parsed.data,
    });

    const created = await prisma.libraryItem.create({
      data: {
        domain_id: parsed.data.domain_id,
        source_type: parsed.data.source_type,
        source_ref: parsed.data.source_ref.trim(),
        display_label: parsed.data.display_label?.trim() || null,
        description: parsed.data.description?.trim() || null,
        assigned_keeper_id: keeperId,
        assigned_agent_id: agentId,
        chronicle_blocks: defaults.chronicle_blocks,
        chronicle_actions: defaults.chronicle_actions,
      },
      include: libraryInclude,
    });

    const ingestion = await contextualizeLibraryItem({
      libraryItemId: created.id,
      sourceType: parsed.data.source_type,
      sourceRef: created.source_ref,
      displayLabel: created.display_label,
      assignedAgentId: created.assigned_agent_id,
      userId: req.user?.id,
    });

    const refreshed = await prisma.libraryItem.findUnique({
      where: { id: created.id },
      include: libraryInclude,
    });
    if (!refreshed) {
      return res.status(500).json({ error: 'Failed to reload library item after ingestion' });
    }

    return res.status(201).json({
      ...toLibraryItemRecord(refreshed, ingestion.embeddingStored),
      ingestion,
    });
  } catch (err) {
    console.error('[library-items/create]', err);
    return res.status(500).json({ error: 'Failed to create library item' });
  }
});

/**
 * GET /api/library-items/:id
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const row = await prisma.libraryItem.findUnique({
      where: { id: req.params.id },
      include: libraryInclude,
    });
    if (!row) {
      return res.status(404).json({ error: 'Library item not found' });
    }

    return res.status(200).json(toLibraryItemRecord(row, await hasEmbedding(row.id)));
  } catch (err) {
    console.error('[library-items/get]', err);
    return res.status(500).json({ error: 'Failed to fetch library item' });
  }
});

/**
 * PATCH /api/library-items/:id
 */
router.patch('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = patchLibraryItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const existing = await prisma.libraryItem.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Library item not found' });
    }

    if (parsed.data.assigned_keeper_id) {
      const keeper = await prisma.keeper.findFirst({
        where: { id: parsed.data.assigned_keeper_id, domainId: existing.domain_id },
      });
      if (!keeper) {
        return res.status(400).json({ error: 'assigned_keeper_id must belong to this domain' });
      }
    }

    if (parsed.data.assigned_agent_id) {
      const agent = await prisma.kip_agents.findUnique({
        where: { id: parsed.data.assigned_agent_id },
      });
      if (!agent) {
        return res.status(400).json({ error: 'assigned_agent_id not found' });
      }
    }

    const updated = await prisma.libraryItem.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        updated_at: new Date(),
      },
      include: libraryInclude,
    });

    return res.status(200).json(toLibraryItemRecord(updated, await hasEmbedding(updated.id)));
  } catch (err) {
    console.error('[library-items/patch]', err);
    return res.status(500).json({ error: 'Failed to update library item' });
  }
});

export default router;

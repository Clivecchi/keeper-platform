/**
 * Domain catalog query. The database is the map. No stored duplicate.
 * Pages return titles and ids. Bodies stay on the existing read actions.
 */
import { prisma } from '@keeper/database';
import { dialogAudienceWhere } from './dialogVisibility.js';
import {
  catalogProbeGuidance,
  formatDomainCatalogPrompt,
  isCatalogShelf,
  type CatalogShelf,
  type CatalogShelfItem,
  type DomainCatalogCounts,
} from '@keeper/shared';

export type CatalogShelfPage = {
  shelf: CatalogShelf;
  total: number;
  offset: number;
  limit: number;
  items: CatalogShelfItem[];
};

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return 12;
  return Math.min(20, Math.max(1, Math.floor(limit)));
}

function clampOffset(offset: number | undefined): number {
  if (typeof offset !== 'number' || !Number.isFinite(offset)) return 0;
  return Math.min(500, Math.max(0, Math.floor(offset)));
}

export async function loadDomainCatalogCounts(params: {
  domainId: string;
  userId?: string | null;
}): Promise<DomainCatalogCounts> {
  const { domainId } = params;
  const userId = params.userId ?? null;
  const [dialog, draft, keeper, journey, moment, library] = await Promise.all([
    prisma.dialog.count({
      where: {
        domain_id: domainId,
        is_archived: false,
        AND: [dialogAudienceWhere(userId)],
      },
    }),
    userId
      ? prisma.kip_drafts.count({
          where: { domain_id: domainId, owner_id: userId, status: { notIn: ['archived'] } },
        })
      : Promise.resolve(0),
    prisma.keeper.count({ where: { domainId } }),
    prisma.journey.count({ where: { domainId } }),
    prisma.moment.count({
      where: {
        archived: false,
        OR: [{ domainId }, { Journey: { domainId } }],
      },
    }),
    prisma.libraryItem.count({ where: { domain_id: domainId } }),
  ]);
  return { dialog, draft, keeper, journey, moment, library };
}

export async function loadCatalogShelf(params: {
  domainId: string;
  userId?: string | null;
  shelf: CatalogShelf;
  query?: string;
  offset?: number;
  limit?: number;
}): Promise<CatalogShelfPage> {
  const offset = clampOffset(params.offset);
  const limit = clampLimit(params.limit);
  const query = params.query?.trim() ?? '';
  const contains = query
    ? { contains: query, mode: 'insensitive' as const }
    : undefined;

  if (params.shelf === 'dialog') {
    const where = {
      domain_id: params.domainId,
      is_archived: false,
      AND: [dialogAudienceWhere(params.userId)],
      ...(contains ? { title: contains } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.dialog.count({ where }),
      prisma.dialog.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, title: true, document_status: true, updated_at: true },
      }),
    ]);
    return {
      shelf: 'dialog',
      total,
      offset,
      limit,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title?.trim() || 'Untitled dialog',
        status: row.document_status,
        updatedAt: row.updated_at.toISOString(),
      })),
    };
  }

  if (params.shelf === 'draft') {
    const userId = params.userId ?? '';
    const where = {
      domain_id: params.domainId,
      owner_id: userId,
      status: { notIn: ['archived'] },
      ...(contains ? { title: contains } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.kip_drafts.count({ where }),
      prisma.kip_drafts.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, title: true, kind: true, status: true, updated_at: true },
      }),
    ]);
    return {
      shelf: 'draft',
      total,
      offset,
      limit,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title?.trim() || 'Untitled draft',
        kind: row.kind,
        status: row.status,
        updatedAt: row.updated_at.toISOString(),
      })),
    };
  }

  if (params.shelf === 'keeper') {
    const where = {
      domainId: params.domainId,
      ...(contains ? { title: contains } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.keeper.count({ where }),
      prisma.keeper.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, title: true },
      }),
    ]);
    return {
      shelf: 'keeper',
      total,
      offset,
      limit,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title?.trim() || 'Untitled keeper',
      })),
    };
  }

  if (params.shelf === 'journey') {
    const where = {
      domainId: params.domainId,
      ...(contains ? { name: contains } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.journey.count({ where }),
      prisma.journey.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, name: true, keeperId: true, updatedAt: true },
      }),
    ]);
    return {
      shelf: 'journey',
      total,
      offset,
      limit,
      items: rows.map((row) => ({
        id: row.id,
        title: row.name?.trim() || 'Untitled journey',
        parentId: row.keeperId,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  if (params.shelf === 'moment') {
    const where = {
      archived: false,
      OR: [{ domainId: params.domainId }, { Journey: { domainId: params.domainId } }],
      ...(contains ? { title: contains } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.moment.count({ where }),
      prisma.moment.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true, title: true, journeyId: true, updatedAt: true },
      }),
    ]);
    return {
      shelf: 'moment',
      total,
      offset,
      limit,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title?.trim() || 'Untitled moment',
        ...(row.journeyId ? { parentId: row.journeyId } : {}),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  const where = {
    domain_id: params.domainId,
    ...(contains ? { display_label: contains } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.libraryItem.count({ where }),
    prisma.libraryItem.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: limit,
      select: { id: true, display_label: true, source_type: true, updated_at: true },
    }),
  ]);
  return {
    shelf: 'library',
    total,
    offset,
    limit,
    items: rows.map((row) => ({
      id: row.id,
      title: row.display_label?.trim() || row.id,
      kind: row.source_type,
      updatedAt: row.updated_at.toISOString(),
    })),
  };
}

export async function buildDomainAwarenessPrompt(params: {
  domainId: string;
  userId?: string | null;
  humanTurn?: string | null;
}): Promise<string> {
  let counts: DomainCatalogCounts | null = null;
  try {
    counts = await loadDomainCatalogCounts(params);
  } catch {
    counts = null;
  }
  return formatDomainCatalogPrompt({
    counts,
    probeLine: catalogProbeGuidance(params.humanTurn),
  });
}

export function parseCatalogShelf(value: unknown): CatalogShelf | null {
  return typeof value === 'string' && isCatalogShelf(value) ? value : null;
}

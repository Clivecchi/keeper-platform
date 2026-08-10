/**
 * Cross-entity nav index — Dialogs, Drafts, Keepers, Library.
 * Same assembly family as buildKipEnvironmentContext.domainIndex (+ draftsDirectory).
 */

import { prisma } from '@keeper/database';

export type DomainNavIndexItem = {
  kind: 'dialog' | 'draft' | 'keeper' | 'library';
  id: string;
  title: string;
  subtitle?: string;
  tier?: 'dialog' | 'chatter';
  updatedAt: string;
};

export type DomainNavIndex = {
  domainId: string;
  items: DomainNavIndexItem[];
};

export async function buildDomainNavIndex(domainId: string): Promise<DomainNavIndex> {
  const [dialogs, drafts, keepers, libraryItems] = await Promise.all([
    prisma.dialog.findMany({
      where: { domain_id: domainId, is_archived: false },
      orderBy: { updated_at: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        title_source: true,
        document_status: true,
        updated_at: true,
      },
    }),
    prisma.kip_drafts.findMany({
      where: {
        domain_id: domainId,
        status: { notIn: ['promoted', 'archived'] },
      },
      orderBy: { updated_at: 'desc' },
      take: 40,
      select: { id: true, title: true, kind: true, status: true, updated_at: true },
    }),
    prisma.keeper.findMany({
      where: { domainId },
      take: 40,
      select: { id: true, title: true, purpose: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.libraryItem.findMany({
      where: { domain_id: domainId },
      orderBy: { updated_at: 'desc' },
      take: 40,
      select: {
        id: true,
        display_label: true,
        source_type: true,
        updated_at: true,
      },
    }),
  ]);

  const items: DomainNavIndexItem[] = [
    ...dialogs.map((d) => ({
      kind: 'dialog' as const,
      id: d.id,
      title: d.title?.trim() || 'Untitled dialog',
      subtitle: d.document_status,
      tier: d.title_source === 'auto_generated' ? ('chatter' as const) : ('dialog' as const),
      updatedAt: d.updated_at.toISOString(),
    })),
    ...drafts.map((d) => ({
      kind: 'draft' as const,
      id: d.id,
      title: d.title?.trim() || 'Untitled draft',
      subtitle: d.kind,
      updatedAt: d.updated_at.toISOString(),
    })),
    ...keepers.map((k) => ({
      kind: 'keeper' as const,
      id: k.id,
      title: k.title?.trim() || 'Untitled keeper',
      subtitle: k.purpose?.slice(0, 80) || undefined,
      updatedAt: k.updatedAt.toISOString(),
    })),
    ...libraryItems.map((item) => ({
      kind: 'library' as const,
      id: item.id,
      title: item.display_label?.trim() || item.id,
      subtitle: item.source_type,
      updatedAt: item.updated_at.toISOString(),
    })),
  ];

  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { domainId, items };
}

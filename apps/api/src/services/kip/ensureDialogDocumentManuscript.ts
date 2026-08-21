/**
 * Ensure a named Dialog has a document_manuscript to receive Points.
 * Named Dialogs already render as Documents; the manuscript row is created
 * lazily on first Point write rather than at Dialog create.
 */

import { prisma, type Prisma } from '@keeper/database';
import { DOCUMENT_MANUSCRIPT_KIND } from './registerDialogDocumentComponent.js';

export type EnsureDialogDocumentManuscriptParams = {
  domainId: string;
  dialogId: string;
  dialogTitle?: string;
  userId: string;
  agentId?: string | null;
};

export type EnsureDialogDocumentManuscriptResult = {
  id: string;
  created: boolean;
};

function slugifyManuscriptKey(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `manuscript-${base || 'dialog'}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensureDialogDocumentManuscript(
  params: EnsureDialogDocumentManuscriptParams,
): Promise<EnsureDialogDocumentManuscriptResult | null> {
  const existing = await prisma.kip_drafts.findFirst({
    where: {
      domain_id: params.domainId,
      dialog_id: params.dialogId,
      kind: DOCUMENT_MANUSCRIPT_KIND,
      status: { notIn: ['promoted', 'archived'] },
    },
    select: { id: true },
    orderBy: { updated_at: 'desc' },
  });
  if (existing?.id) {
    return { id: existing.id, created: false };
  }

  const title = params.dialogTitle?.trim() || 'Document';
  const now = new Date();
  const created = await prisma.kip_drafts.create({
    data: {
      domain_id: params.domainId,
      owner_id: params.userId,
      kind: DOCUMENT_MANUSCRIPT_KIND,
      key: slugifyManuscriptKey(title),
      title: `${title} · manuscript`,
      summary: 'Dialog Document',
      status: 'draft',
      spec_json: { points: [] } as Prisma.InputJsonValue,
      dialog_id: params.dialogId,
      agent_id: params.agentId ?? undefined,
      created_at: now,
      updated_at: now,
    },
    select: { id: true },
  });

  return { id: created.id, created: true };
}

/**
 * Register a non-manuscript draft as an explicit Dialog Document component.
 * Distinct from Nav-only kip_drafts.dialog_id association.
 */

import { prisma, type Prisma } from '@keeper/database';
import {
  parseDocumentComponentDeclarations,
  type DocumentComponentDeclaration,
} from '@keeper/shared';

export const DOCUMENT_MANUSCRIPT_KIND = 'document_manuscript';

export type RegisterDocumentComponentResult =
  | {
      ok: true;
      components: DocumentComponentDeclaration[];
      draft: {
        id: string;
        title: string;
        kind: string;
        status: string;
        summary: string | null;
      };
      created: boolean;
    }
  | {
      ok: false;
      error:
        | 'DIALOG_NOT_FOUND'
        | 'DRAFT_NOT_FOUND'
        | 'MANUSCRIPT_NOT_ALLOWED'
        | 'DOMAIN_MISMATCH';
      message: string;
    };

export async function registerDialogDocumentComponent(params: {
  domainId: string;
  dialogId: string;
  draftId: string;
  label?: string | null;
  userId?: string;
}): Promise<RegisterDocumentComponentResult> {
  const draftId = params.draftId.trim();
  if (!draftId) {
    return { ok: false, error: 'DRAFT_NOT_FOUND', message: 'draftId is required' };
  }

  const dialog = await prisma.dialog.findFirst({
    where: {
      id: params.dialogId,
      domain_id: params.domainId,
      ...(params.userId
        ? {
            OR: [
              { available_to: { has: 'admin' } },
              { user_id: params.userId, available_to: { has: 'keeper' } },
            ],
          }
        : {}),
    },
    select: { id: true, document_components: true },
  });
  if (!dialog) {
    return { ok: false, error: 'DIALOG_NOT_FOUND', message: 'Dialog not found' };
  }

  const draft = await prisma.kip_drafts.findFirst({
    where: { id: draftId, domain_id: params.domainId },
    select: {
      id: true,
      title: true,
      kind: true,
      status: true,
      summary: true,
      dialog_id: true,
    },
  });
  if (!draft) {
    return { ok: false, error: 'DRAFT_NOT_FOUND', message: 'Draft not found in this domain' };
  }
  if (draft.kind === DOCUMENT_MANUSCRIPT_KIND) {
    return {
      ok: false,
      error: 'MANUSCRIPT_NOT_ALLOWED',
      message:
        'document_manuscript drafts are Document Point storage — not registerable as components',
    };
  }

  const existing = parseDocumentComponentDeclarations(dialog.document_components);
  const already = existing.some((row) => row.draftId === draft.id);
  const label =
    typeof params.label === 'string' && params.label.trim()
      ? params.label.trim()
      : undefined;

  let next = existing;
  if (!already) {
    const maxOrder = existing.reduce(
      (max, row) => Math.max(max, row.order ?? 0),
      -1,
    );
    next = [
      ...existing,
      {
        draftId: draft.id,
        order: maxOrder + 1,
        ...(label ? { label } : {}),
      },
    ];
    await prisma.dialog.update({
      where: { id: dialog.id },
      data: {
        document_components: next as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Best-effort Nav association — does not alone mean Document membership.
  if (!draft.dialog_id) {
    await prisma.kip_drafts.update({
      where: { id: draft.id },
      data: { dialog_id: dialog.id },
    });
  }

  return {
    ok: true,
    components: next,
    draft: {
      id: draft.id,
      title: draft.title,
      kind: draft.kind,
      status: draft.status,
      summary: draft.summary ?? null,
    },
    created: !already,
  };
}

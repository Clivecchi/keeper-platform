/**
 * Load Dialog Document for Chronicle UI — Forward/Step/Paths + manuscript drafts
 * with full Points (spec) + registered Document component drafts.
 * One round-trip; no sessions, no domain-wide draft list.
 */

import { prisma } from '@keeper/database';
import {
  normalizeDraftSpecJson,
  parseDocumentComponentDeclarations,
  parseDocumentPathDeclarations,
  type DocumentComponentDraft,
} from '@keeper/shared';
import { DOCUMENT_MANUSCRIPT_KIND } from './registerDialogDocumentComponent.js';

export type ChronicleManuscriptDraft = {
  id: string;
  kind: string;
  key: string;
  title: string;
  status: string;
  summary: string | null;
  updatedAt: Date;
  dialogId: string;
  dialog_id: string;
  spec: ReturnType<typeof normalizeDraftSpecJson>;
};

export type ChronicleDialogDocument = {
  dialogId: string;
  title?: string;
  status?: string;
  forward?: { title: string; description: string };
  step?: { title: string; body: string };
  paths: ReturnType<typeof parseDocumentPathDeclarations>;
  manuscripts: ChronicleManuscriptDraft[];
  /** Non-manuscript drafts explicitly registered on Dialog.document_components. */
  components: DocumentComponentDraft[];
};

export async function loadDialogDocumentForChronicle(
  dialogId: string,
  domainId: string,
  options?: {
    /** When set, enforce Dialog audience visibility for this user. */
    userId?: string;
  },
): Promise<ChronicleDialogDocument | null> {
  const userId = options?.userId;
  const dialog = await prisma.dialog.findFirst({
    where: {
      id: dialogId,
      domain_id: domainId,
      ...(userId
        ? {
            OR: [
              { available_to: { has: 'admin' } },
              { user_id: userId, available_to: { has: 'keeper' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      document_status: true,
      forward_title: true,
      forward_description: true,
      step_title: true,
      step_body: true,
      document_paths: true,
      document_components: true,
    },
  });
  if (!dialog) return null;

  const forwardTitle = dialog.forward_title?.trim() ?? '';
  const forwardDescription = dialog.forward_description?.trim() ?? '';
  const stepTitle = dialog.step_title?.trim() ?? '';
  const stepBody = dialog.step_body?.trim() ?? '';
  const componentDecls = parseDocumentComponentDeclarations(dialog.document_components);

  // Dialog audience already authorized above — do not re-filter manuscripts by owner
  // (agent-created rows may not match the viewing user's id).
  const manuscripts = await prisma.kip_drafts.findMany({
    where: {
      dialog_id: dialogId,
      domain_id: domainId,
      kind: DOCUMENT_MANUSCRIPT_KIND,
      status: { notIn: ['promoted', 'archived'] },
    },
    select: {
      id: true,
      kind: true,
      key: true,
      title: true,
      status: true,
      summary: true,
      updated_at: true,
      dialog_id: true,
      spec_json: true,
    },
    orderBy: { updated_at: 'desc' },
    take: 5,
  });

  let components: DocumentComponentDraft[] = [];
  if (componentDecls.length > 0) {
    const draftIds = componentDecls.map((row) => row.draftId);
    const rows = await prisma.kip_drafts.findMany({
      where: {
        domain_id: domainId,
        id: { in: draftIds },
        kind: { not: DOCUMENT_MANUSCRIPT_KIND },
        status: { notIn: ['archived'] },
      },
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        summary: true,
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    components = componentDecls
      .map((decl) => {
        const row = byId.get(decl.draftId);
        if (!row) return null;
        return {
          draftId: row.id,
          title: row.title,
          kind: row.kind,
          status: row.status,
          summary: row.summary ?? null,
          ...(decl.order !== undefined ? { order: decl.order } : {}),
          ...(decl.label ? { label: decl.label } : {}),
        } satisfies DocumentComponentDraft;
      })
      .filter((row): row is DocumentComponentDraft => row != null);
  }

  return {
    dialogId: dialog.id,
    ...(dialog.title?.trim() ? { title: dialog.title.trim() } : {}),
    ...(dialog.document_status ? { status: dialog.document_status } : {}),
    ...(forwardTitle && forwardDescription
      ? { forward: { title: forwardTitle, description: forwardDescription } }
      : {}),
    ...(stepTitle && stepBody
      ? { step: { title: stepTitle, body: stepBody } }
      : {}),
    paths: parseDocumentPathDeclarations(dialog.document_paths),
    manuscripts: manuscripts.map((row) => ({
      id: row.id,
      kind: row.kind,
      key: row.key,
      title: row.title,
      status: row.status,
      summary: row.summary ?? null,
      updatedAt: row.updated_at,
      dialogId: row.dialog_id ?? dialogId,
      dialog_id: row.dialog_id ?? dialogId,
      spec: normalizeDraftSpecJson(row.spec_json),
    })),
    components,
  };
}

/**
 * Review & Reorganize — Keeper owns proposal state, Apply, and persistence.
 * The Lead proposes. This module stores the difference and Applies it.
 */

import { prisma, type Prisma } from '@keeper/database';

type ReorganizeDb = {
  dialog: typeof prisma.dialog;
  kip_drafts: typeof prisma.kip_drafts;
};
import {
  applyReorganizeToPoints,
  canonicalizeDraftSpecJson,
  coerceDocumentForwardProposal,
  coerceDocumentTitleProposal,
  DOCUMENT_REORGANIZE_SPEC_KEY,
  hasDocumentIdentityProposal,
  isDocumentReorganizeRestatement,
  normalizeDocumentReorganizeProposal,
  parseDocumentPathDeclarations,
  parseDraftPoints,
  parseDocumentReorganizeProposal,
  setDraftPointsInSpec,
  type DocumentReorganizeProposal,
} from '@keeper/shared';
import { ensureDialogDocumentManuscript } from './ensureDialogDocumentManuscript.js';

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function loadDialog(domainId: string, dialogId: string, db: ReorganizeDb = prisma) {
  return db.dialog.findFirst({
    where: { id: dialogId, domain_id: domainId, is_archived: false },
    select: {
      id: true,
      title: true,
      document_paths: true,
    },
  });
}

async function loadManuscript(domainId: string, dialogId: string, db: ReorganizeDb = prisma) {
  return db.kip_drafts.findFirst({
    where: {
      domain_id: domainId,
      dialog_id: dialogId,
      kind: 'document_manuscript',
      status: { notIn: ['promoted', 'archived'] },
    },
    select: { id: true, spec_json: true },
    orderBy: { updated_at: 'desc' },
  });
}

export type ReorganizeStoreOk = {
  ok: true;
  proposal: DocumentReorganizeProposal;
  openDumpRepaired?: boolean;
  oneSectionDumpRepaired?: boolean;
  restatement?: boolean;
};

export type ReorganizeStoreErr = {
  ok: false;
  status: number;
  error: string;
  message: string;
};

export type ReorganizeStoreResult = ReorganizeStoreOk | ReorganizeStoreErr;

export async function storeDocumentReorganizeProposal(input: {
  domainId: string;
  dialogId: string;
  userId: string;
  raw: unknown;
  proposedBy?: string;
  db?: ReorganizeDb;
}): Promise<ReorganizeStoreResult> {
  const db = input.db ?? prisma;
  const dialog = await loadDialog(input.domainId, input.dialogId, db);
  if (!dialog) {
    return { ok: false, status: 404, error: 'DIALOG_NOT_FOUND', message: 'Dialog not found.' };
  }

  let manuscript = await loadManuscript(input.domainId, input.dialogId, db);
  if (!manuscript) {
    await ensureDialogDocumentManuscript({
      domainId: input.domainId,
      dialogId: input.dialogId,
      dialogTitle: dialog.title,
      userId: input.userId,
    });
    manuscript = await loadManuscript(input.domainId, input.dialogId, db);
  }
  if (!manuscript) {
    return {
      ok: false,
      status: 500,
      error: 'MANUSCRIPT_MISSING',
      message: 'Could not open the Document manuscript.',
    };
  }

  const currentPoints = parseDraftPoints(manuscript.spec_json);
  const identityOnly = hasDocumentIdentityProposal({
    title: coerceDocumentTitleProposal(input.raw),
    forward: coerceDocumentForwardProposal(input.raw),
  });
  if (
    currentPoints.filter((point) => !point.referencesPointId?.trim()).length === 0
    && !identityOnly
  ) {
    return {
      ok: false,
      status: 400,
      error: 'DOCUMENT_EMPTY',
      message: 'Review & Reorganize needs an existing Document with Points — or a title / Forward to propose.',
    };
  }

  const normalized = normalizeDocumentReorganizeProposal({
    raw: input.raw,
    currentPoints,
    currentSections: parseDocumentPathDeclarations(dialog.document_paths),
    proposedBy: input.proposedBy,
  });
  if (normalized.ok === false) {
    return { ok: false, status: 400, error: 'INVALID_PROPOSAL', message: normalized.error };
  }

  const nextSpec = canonicalizeDraftSpecJson({
    ...canonicalizeDraftSpecJson(manuscript.spec_json),
    [DOCUMENT_REORGANIZE_SPEC_KEY]: normalized.proposal,
  });
  await db.kip_drafts.update({
    where: { id: manuscript.id },
    data: { spec_json: asJson(nextSpec), updated_at: new Date() },
  });

  return {
    ok: true,
    proposal: normalized.proposal,
    openDumpRepaired: normalized.openDumpRepaired,
    oneSectionDumpRepaired: normalized.oneSectionDumpRepaired,
    restatement: isDocumentReorganizeRestatement(
      normalized.proposal,
      parseDocumentPathDeclarations(dialog.document_paths),
    ),
  };
}

export async function applyDocumentReorganizeProposal(input: {
  domainId: string;
  dialogId: string;
}): Promise<ReorganizeStoreResult> {
  const dialog = await loadDialog(input.domainId, input.dialogId);
  if (!dialog) {
    return { ok: false, status: 404, error: 'DIALOG_NOT_FOUND', message: 'Dialog not found.' };
  }
  const manuscript = await loadManuscript(input.domainId, input.dialogId);
  if (!manuscript) {
    return {
      ok: false,
      status: 404,
      error: 'MANUSCRIPT_NOT_FOUND',
      message: 'Document manuscript not found.',
    };
  }

  const stored = parseDocumentReorganizeProposal(
    (canonicalizeDraftSpecJson(manuscript.spec_json) as Record<string, unknown>)[
      DOCUMENT_REORGANIZE_SPEC_KEY
    ],
  );
  if (!stored) {
    return {
      ok: false,
      status: 404,
      error: 'NO_PROPOSAL',
      message: 'There is no Review & Reorganize proposal to apply.',
    };
  }

  const currentPoints = parseDraftPoints(manuscript.spec_json);
  const nextPoints = applyReorganizeToPoints({
    currentPoints,
    proposal: stored,
  });
  const cleared = canonicalizeDraftSpecJson(setDraftPointsInSpec(manuscript.spec_json, nextPoints));
  const { [DOCUMENT_REORGANIZE_SPEC_KEY]: _drop, ...rest } = cleared as Record<string, unknown>;

  const dialogData: {
    document_paths: Prisma.InputJsonValue;
    title?: string;
    title_source?: string;
    forward_title?: string | null;
    forward_description?: string | null;
  } = { document_paths: asJson(stored.sections) };
  const proposedTitle = stored.title?.trim();
  if (proposedTitle) {
    dialogData.title = proposedTitle;
    dialogData.title_source = 'user_set';
  }
  if (stored.forward) {
    if (stored.forward.title !== undefined) {
      dialogData.forward_title = stored.forward.title.trim() || null;
    }
    if (stored.forward.description !== undefined) {
      dialogData.forward_description = stored.forward.description.trim() || null;
    }
  }

  await prisma.$transaction([
    prisma.dialog.update({
      where: { id: dialog.id },
      data: dialogData,
    }),
    prisma.kip_drafts.update({
      where: { id: manuscript.id },
      data: { spec_json: asJson({ ...rest, points: nextPoints }), updated_at: new Date() },
    }),
  ]);

  return { ok: true, proposal: stored };
}

export async function dismissDocumentReorganizeProposal(input: {
  domainId: string;
  dialogId: string;
}): Promise<ReorganizeStoreResult | { ok: true; proposal: null }> {
  const manuscript = await loadManuscript(input.domainId, input.dialogId);
  if (!manuscript) {
    return {
      ok: false,
      status: 404,
      error: 'MANUSCRIPT_NOT_FOUND',
      message: 'Document manuscript not found.',
    };
  }
  const stored = parseDocumentReorganizeProposal(
    (canonicalizeDraftSpecJson(manuscript.spec_json) as Record<string, unknown>)[
      DOCUMENT_REORGANIZE_SPEC_KEY
    ],
  );
  const cleared = canonicalizeDraftSpecJson(manuscript.spec_json);
  const { [DOCUMENT_REORGANIZE_SPEC_KEY]: _drop, ...rest } = cleared as Record<string, unknown>;
  await prisma.kip_drafts.update({
    where: { id: manuscript.id },
    data: { spec_json: asJson(rest), updated_at: new Date() },
  });
  return { ok: true, proposal: stored };
}

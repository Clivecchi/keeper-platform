/**
 * Human author writes on a Dialog Document — fields + manuscript Points.
 * Does not go through agent merge (which refuses to delete or overwrite accepted Points).
 */

import { prisma, type Prisma } from '@keeper/database';
import {
  appendDraftPointToSpec,
  composeAuthoredPoint,
  createDocumentSection,
  createDraftPoint,
  findDraftPoint,
  isOpenSectionId,
  parseDocumentPathDeclarations,
  parseDraftPoints,
  removeDraftPointFromSpec,
  setDraftPointsInSpec,
  updateDraftPointInSpec,
} from '@keeper/shared';
import { ensureDialogDocumentManuscript } from './ensureDialogDocumentManuscript.js';

export type AuthorDialogDocumentOk = {
  ok: true;
  pointId?: string;
};

export type AuthorDialogDocumentErr = {
  ok: false;
  status: number;
  error: string;
  message: string;
};

export type AuthorDialogDocumentResult = AuthorDialogDocumentOk | AuthorDialogDocumentErr;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function loadDialog(domainId: string, dialogId: string) {
  return prisma.dialog.findFirst({
    where: { id: dialogId, domain_id: domainId, is_archived: false },
    select: { id: true, title: true, domain_id: true },
  });
}

async function loadManuscript(domainId: string, dialogId: string) {
  return prisma.kip_drafts.findFirst({
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

async function writeManuscriptPoints(
  manuscriptId: string,
  spec: unknown,
): Promise<void> {
  await prisma.kip_drafts.update({
    where: { id: manuscriptId },
    data: { spec_json: asJson(spec), updated_at: new Date() },
  });
}

export async function authorCreateDocumentPoint(input: {
  domainId: string;
  dialogId: string;
  userId: string;
  title?: string;
  content?: string;
  sectionId?: string | null;
  proposedBy?: string;
}): Promise<AuthorDialogDocumentResult> {
  const dialog = await loadDialog(input.domainId, input.dialogId);
  if (!dialog) {
    return { ok: false, status: 404, error: 'DIALOG_NOT_FOUND', message: 'Dialog not found.' };
  }

  const composed = composeAuthoredPoint(input.title ?? '', input.content ?? '');
  if (!composed.content) {
    return {
      ok: false,
      status: 400,
      error: 'POINT_REQUIRED',
      message: 'A Point needs a title or a body.',
    };
  }

  const manuscript =
    (await loadManuscript(input.domainId, input.dialogId))
    ?? (await ensureDialogDocumentManuscript({
      domainId: input.domainId,
      dialogId: input.dialogId,
      dialogTitle: dialog.title,
      userId: input.userId,
    }).then((row) => (row ? loadManuscript(input.domainId, input.dialogId) : null)));

  if (!manuscript) {
    return {
      ok: false,
      status: 500,
      error: 'MANUSCRIPT_MISSING',
      message: 'Could not open the Document manuscript.',
    };
  }

  const sectionId = isOpenSectionId(input.sectionId) ? undefined : input.sectionId?.trim();
  const point = createDraftPoint({
    content: composed.content,
    ...(composed.prelude ? { prelude: composed.prelude } : {}),
    ...(sectionId ? { pathGroupId: sectionId } : {}),
    proposedBy: input.proposedBy?.trim() || 'Author',
    status: 'accepted',
  });
  const next = appendDraftPointToSpec(manuscript.spec_json, point);
  await writeManuscriptPoints(manuscript.id, next);
  return { ok: true, pointId: point.id };
}

export async function authorUpdateDocumentPoint(input: {
  domainId: string;
  dialogId: string;
  pointId: string;
  title?: string;
  content?: string;
  sectionId?: string | null;
}): Promise<AuthorDialogDocumentResult> {
  const manuscript = await loadManuscript(input.domainId, input.dialogId);
  if (!manuscript) {
    return { ok: false, status: 404, error: 'MANUSCRIPT_NOT_FOUND', message: 'Document manuscript not found.' };
  }
  const existing = findDraftPoint(manuscript.spec_json, input.pointId);
  if (!existing) {
    return { ok: false, status: 404, error: 'POINT_NOT_FOUND', message: 'Point not found.' };
  }

  let spec: unknown = manuscript.spec_json;
  if (input.title !== undefined || input.content !== undefined) {
    const composed = composeAuthoredPoint(
      input.title ?? existing.prelude ?? '',
      input.content ?? existing.content,
    );
    if (!composed.content) {
      return {
        ok: false,
        status: 400,
        error: 'POINT_REQUIRED',
        message: 'A Point needs a title or a body.',
      };
    }
    const rewritten = updateDraftPointInSpec(spec, input.pointId, {
      content: composed.content,
      prelude: composed.prelude,
    });
    spec = asJson(rewritten.spec);
  }

  if (input.sectionId !== undefined) {
    const points = parseDraftPoints(spec).map((point) => {
      if (point.id !== input.pointId) return point;
      if (isOpenSectionId(input.sectionId)) {
        const { pathGroupId: _drop, ...rest } = point;
        return { ...rest, updatedAt: new Date().toISOString() };
      }
      return {
        ...point,
        pathGroupId: input.sectionId?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
    });
    spec = asJson(setDraftPointsInSpec(spec, points));
  }

  await writeManuscriptPoints(manuscript.id, spec);
  return { ok: true };
}

export async function authorDeleteDocumentPoint(input: {
  domainId: string;
  dialogId: string;
  pointId: string;
}): Promise<AuthorDialogDocumentResult> {
  const manuscript = await loadManuscript(input.domainId, input.dialogId);
  if (!manuscript) {
    return { ok: false, status: 404, error: 'MANUSCRIPT_NOT_FOUND', message: 'Document manuscript not found.' };
  }
  const { spec, removed } = removeDraftPointFromSpec(manuscript.spec_json, input.pointId);
  if (!removed) {
    return { ok: false, status: 404, error: 'POINT_NOT_FOUND', message: 'Point not found.' };
  }
  await writeManuscriptPoints(manuscript.id, spec);
  return { ok: true };
}

export async function authorReorderDocumentPoints(input: {
  domainId: string;
  dialogId: string;
  pointIds: string[];
}): Promise<AuthorDialogDocumentResult> {
  const manuscript = await loadManuscript(input.domainId, input.dialogId);
  if (!manuscript) {
    return { ok: false, status: 404, error: 'MANUSCRIPT_NOT_FOUND', message: 'Document manuscript not found.' };
  }
  const existing = parseDraftPoints(manuscript.spec_json);
  const byId = new Map(existing.map((point) => [point.id, point]));
  const ordered = input.pointIds
    .map((id) => byId.get(id))
    .filter((point): point is NonNullable<typeof point> => Boolean(point));
  for (const point of existing) {
    if (!ordered.some((row) => row.id === point.id)) ordered.push(point);
  }
  await writeManuscriptPoints(
    manuscript.id,
    setDraftPointsInSpec(manuscript.spec_json, ordered),
  );
  return { ok: true };
}

export async function authorClearSectionMembership(input: {
  domainId: string;
  dialogId: string;
  sectionId: string;
}): Promise<void> {
  const manuscript = await loadManuscript(input.domainId, input.dialogId);
  if (!manuscript) return;
  const next = parseDraftPoints(manuscript.spec_json).map((point) => {
    if (point.pathGroupId !== input.sectionId) return point;
    const { pathGroupId: _drop, ...rest } = point;
    return rest;
  });
  await writeManuscriptPoints(
    manuscript.id,
    setDraftPointsInSpec(manuscript.spec_json, next),
  );
}

/**
 * Resolve a named Section on a Dialog Document, creating it when the title is new.
 * Returns pathGroupId, or undefined for Open / missing Dialog.
 */
export async function ensureDialogDocumentSection(
  tx: Prisma.TransactionClient,
  input: {
    domainId: string;
    dialogId: string;
    sectionId?: string | null;
    sectionTitle?: string | null;
  },
): Promise<string | undefined> {
  const sectionId = input.sectionId?.trim() || undefined;
  const sectionTitle = input.sectionTitle?.trim() || undefined;
  if (isOpenSectionId(sectionId) && !sectionTitle) return undefined;

  const dialog = await tx.dialog.findFirst({
    where: { id: input.dialogId, domain_id: input.domainId, is_archived: false },
    select: { id: true, document_paths: true },
  });
  if (!dialog) return undefined;

  const paths = parseDocumentPathDeclarations(dialog.document_paths);
  if (sectionId && !isOpenSectionId(sectionId)) {
    const byId = paths.find((path) => path.id === sectionId);
    if (byId) return byId.id;
  }
  if (sectionTitle) {
    const byTitle = paths.find(
      (path) => path.title.toLowerCase() === sectionTitle.toLowerCase(),
    );
    if (byTitle) return byTitle.id;
    const created = createDocumentSection(paths, sectionTitle);
    await tx.dialog.update({
      where: { id: dialog.id },
      data: { document_paths: asJson(created.paths) },
    });
    return created.section.id;
  }
  return undefined;
}

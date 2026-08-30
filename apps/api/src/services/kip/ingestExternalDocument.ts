/**
 * Ingest external markdown as a Dialog-backed Document (Points + real session).
 * Never creates a Library item. Attach to an existing Dialog or create a new one.
 */

import { prisma, type Prisma } from '@keeper/database';
import {
  canonicalizeDraftSpecJson,
  INGEST_MAX_MARKDOWN_CHARS,
  markdownToDraftPoints,
  parseDocumentPathDeclarations,
  parseDraftPoints,
  planIngestAttachSection,
} from '@keeper/shared';
import { DOCUMENT_MANUSCRIPT_KIND } from './registerDialogDocumentComponent.js';
import { resolveDomainLeadAgentFromDomain } from '../domains/resolveDomainLeadAgent.js';
import { ensureDialogGlossCarrier } from './ensureDialogGlossCarrier.js';

const DEFAULT_SOURCE = 'External';

export type IngestExternalDocumentInput = {
  domainId: string;
  userId: string;
  markdown: string;
  title?: string | null;
  source?: string | null;
  /** When set, extend that Dialog's manuscript instead of creating a new Dialog. */
  dialogId?: string | null;
};

export type IngestExternalDocumentResult = {
  created: boolean;
  dialogId: string;
  dialogTitle: string;
  manuscriptId: string;
  pointCount: number;
  appendedCount: number;
  sessionId: string;
  truncated: boolean;
};

export type IngestExternalDocumentErrorCode =
  | 'EMPTY_MARKDOWN'
  | 'MARKDOWN_TOO_LARGE'
  | 'NO_POINTS'
  | 'DIALOG_NOT_FOUND'
  | 'DOMAIN_NOT_FOUND'
  | 'NO_LEAD_AGENT';

export class IngestExternalDocumentError extends Error {
  readonly code: IngestExternalDocumentErrorCode;

  constructor(code: IngestExternalDocumentErrorCode, message: string) {
    super(message);
    this.name = 'IngestExternalDocumentError';
    this.code = code;
  }
}

function slugifyKey(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `ingest-${base || 'writing'}-${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveLeadAgentId(domainId: string): Promise<string> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { slug: true, frame_json: true, settings: true },
  });
  if (!domain) {
    throw new IngestExternalDocumentError('DOMAIN_NOT_FOUND', 'Domain not found');
  }
  const lead = await resolveDomainLeadAgentFromDomain(prisma, domain);
  if (lead?.id) return lead.id;
  const kip = await prisma.kip_agents.findUnique({
    where: { slug: 'kip' },
    select: { id: true },
  });
  if (!kip?.id) {
    throw new IngestExternalDocumentError(
      'NO_LEAD_AGENT',
      'No domain lead agent (and Kip is missing)',
    );
  }
  return kip.id;
}

async function authorizeDialog(
  domainId: string,
  dialogId: string,
  userId: string,
): Promise<{ id: string; title: string; document_paths: unknown } | null> {
  return prisma.dialog.findFirst({
    where: {
      id: dialogId,
      domain_id: domainId,
      is_archived: false,
      OR: [
        { available_to: { has: 'admin' } },
        { user_id: userId, available_to: { has: 'keeper' } },
      ],
    },
    select: { id: true, title: true, document_paths: true },
  });
}

export async function ingestExternalDocument(
  input: IngestExternalDocumentInput,
): Promise<IngestExternalDocumentResult> {
  const markdown = input.markdown.replace(/\r\n/g, '\n').trim();
  if (!markdown) {
    throw new IngestExternalDocumentError('EMPTY_MARKDOWN', 'Paste or upload some writing first.');
  }
  if (markdown.length > INGEST_MAX_MARKDOWN_CHARS) {
    throw new IngestExternalDocumentError(
      'MARKDOWN_TOO_LARGE',
      `Writing is too long (max ${INGEST_MAX_MARKDOWN_CHARS.toLocaleString()} characters).`,
    );
  }

  const source = input.source?.trim() || DEFAULT_SOURCE;
  const parsed = markdownToDraftPoints(markdown, { proposedBy: source });
  if (parsed.points.length === 0) {
    throw new IngestExternalDocumentError(
      'NO_POINTS',
      'Could not find any sections to bring in.',
    );
  }

  const title = input.title?.trim() || parsed.title;
  const agentId = await resolveLeadAgentId(input.domainId);
  const attachId = input.dialogId?.trim() || null;

  let created = false;
  let dialogId: string;
  let dialogTitle: string;
  let attachSectionTitle: string | null = null;

  if (attachId) {
    const existing = await authorizeDialog(input.domainId, attachId, input.userId);
    if (!existing) {
      throw new IngestExternalDocumentError('DIALOG_NOT_FOUND', 'That conversation was not found.');
    }
    dialogId = existing.id;
    dialogTitle = existing.title;
    const planned = planIngestAttachSection(
      parseDocumentPathDeclarations(existing.document_paths),
      input.title?.trim() || parsed.title,
      `Brought in from ${source}.`,
    );
    attachSectionTitle = planned.section.title;
    parsed.points = parsed.points.map((point) => ({
      ...point,
      pathGroupId: planned.section.id,
    }));
    await prisma.dialog.update({
      where: { id: dialogId },
      data: {
        document_paths: planned.paths as Prisma.InputJsonValue,
        step_title: 'Writing added',
        step_body: `${parsed.points.length} point${parsed.points.length === 1 ? '' : 's'} brought in — sitting in “${planned.section.title}”.`,
      },
    });
  } else {
    const dialog = await prisma.dialog.create({
      data: {
        title,
        title_source: 'user_set',
        domain_id: input.domainId,
        user_id: null,
        available_to: ['admin'],
        context: { board: 'domain', frame: '', subject: 'ingest' },
        forward_title: title,
        forward_description: `Writing brought in from outside Keeper (${source}).`,
        step_title: 'Brought in',
        step_body: `${parsed.points.length} section${parsed.points.length === 1 ? '' : 's'} started this conversation.`,
      },
    });
    created = true;
    dialogId = dialog.id;
    dialogTitle = dialog.title;
  }

  const manuscript = await prisma.kip_drafts.findFirst({
    where: {
      domain_id: input.domainId,
      dialog_id: dialogId,
      kind: DOCUMENT_MANUSCRIPT_KIND,
      status: { notIn: ['promoted', 'archived'] },
    },
    orderBy: { updated_at: 'desc' },
  });

  const existingPoints = manuscript ? parseDraftPoints(manuscript.spec_json) : [];
  const nextSpec = canonicalizeDraftSpecJson({
    points: [...existingPoints, ...parsed.points],
  });
  const now = new Date();

  let manuscriptId: string;
  if (manuscript) {
    const nextVersion = await prisma.kip_draft_versions
      .count({ where: { draft_id: manuscript.id } })
      .then((n) => n + 1);
    await prisma.kip_draft_versions.create({
      data: {
        draft_id: manuscript.id,
        version: nextVersion,
        spec_json: (manuscript.spec_json ?? {}) as Prisma.InputJsonValue,
        title: manuscript.title,
        summary: manuscript.summary ?? null,
        status: manuscript.status,
      },
    });
    await prisma.kip_drafts.update({
      where: { id: manuscript.id },
      data: {
        spec_json: nextSpec as Prisma.InputJsonValue,
        updated_at: now,
        dialog_id: dialogId,
      },
    });
    manuscriptId = manuscript.id;
    if (!created && !attachSectionTitle) {
      await prisma.dialog.update({
        where: { id: dialogId },
        data: {
          step_title: 'Writing added',
          step_body: `${parsed.points.length} point${parsed.points.length === 1 ? '' : 's'} brought in from outside Keeper.`,
        },
      });
    }
  } else {
    const createdDraft = await prisma.kip_drafts.create({
      data: {
        domain_id: input.domainId,
        owner_id: input.userId,
        kind: DOCUMENT_MANUSCRIPT_KIND,
        key: slugifyKey(title),
        title: `${title} · writing`,
        summary: `Brought in from ${source}`,
        status: 'draft',
        spec_json: nextSpec as Prisma.InputJsonValue,
        dialog_id: dialogId,
        agent_id: agentId,
        created_at: now,
        updated_at: now,
      },
    });
    manuscriptId = createdDraft.id;
  }

  let sessionId: string;
  if (!created) {
    const existingSession = await prisma.kip_sessions.findFirst({
      where: { dialog_id: dialogId, is_archived: false },
      orderBy: { updated_at: 'desc' },
      select: { id: true },
    });
    sessionId = existingSession?.id
      ?? (
        await prisma.kip_sessions.create({
          data: {
            agent_id: agentId,
            user_id: input.userId,
            dialog_id: dialogId,
            session_name: dialogTitle,
          },
          select: { id: true },
        })
      ).id;
    if (existingSession?.id) {
      await prisma.kip_sessions.update({
        where: { id: existingSession.id },
        data: { updated_at: new Date() },
      });
    }
  } else {
    sessionId = (
      await prisma.kip_sessions.create({
        data: {
          agent_id: agentId,
          user_id: input.userId,
          dialog_id: dialogId,
          session_name: dialogTitle,
        },
        select: { id: true },
      })
    ).id;
  }

  await prisma.kip_messages.create({
    data: {
      session_id: sessionId,
      sender: 'user',
      role: 'user',
      content: created
        ? `Brought in writing from outside Keeper.\n\n${parsed.points.length} section${parsed.points.length === 1 ? '' : 's'} started this conversation.`
        : `Brought in writing from outside Keeper.\n\nAdded ${parsed.points.length} section${parsed.points.length === 1 ? '' : 's'} to this conversation.`,
      metadata: {
        ingest: true,
        source,
        appendedCount: parsed.points.length,
        truncated: parsed.truncated,
      } as Prisma.InputJsonValue,
    },
  });

  await ensureDialogGlossCarrier({
    domainId: input.domainId,
    dialogId,
    userId: input.userId,
    agentId,
  });

  const finalCount = existingPoints.length + parsed.points.length;
  return {
    created,
    dialogId,
    dialogTitle,
    manuscriptId,
    pointCount: finalCount,
    appendedCount: parsed.points.length,
    sessionId,
    truncated: parsed.truncated,
  };
}

export function ingestErrorStatus(code: IngestExternalDocumentErrorCode): number {
  switch (code) {
    case 'DIALOG_NOT_FOUND':
    case 'DOMAIN_NOT_FOUND':
      return 404;
    case 'NO_LEAD_AGENT':
      return 500;
    default:
      return 400;
  }
}

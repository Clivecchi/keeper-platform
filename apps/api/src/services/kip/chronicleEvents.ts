/**
 * Dialog-scoped Chronicle History persistence and mapping.
 * History is a quick review: named session chapters + Document keeps — not a turn log.
 * Intentionally separate from the Realm-wide feed projection.
 */

import { prisma } from '@keeper/database';
import type { Prisma } from '@prisma/client';
import {
  isChronicleEventType,
  type ChronicleEvent,
  type ChronicleEventAnchor,
  type ChronicleEventType,
} from '@keeper/shared';

/** History card title — topic-shaped, scannable. */
export const CHRONICLE_TITLE_MAX = 56;
/** History card body — one takeaway line. */
export const CHRONICLE_SUMMARY_MAX = 120;

type ChronicleEventRow = {
  id: string;
  dialogId: string;
  domainId: string;
  actor: string;
  actorSlug: string | null;
  eventType: string;
  title: string;
  summary: string;
  anchor: unknown;
  parentEventId: string | null;
  createdAt: Date;
};

export type CreateChronicleEventInput = {
  dialogId: string;
  domainId: string;
  actor: string;
  actorSlug?: string;
  eventType: ChronicleEventType;
  title: string;
  summary: string;
  anchor?: ChronicleEventAnchor;
  parentEventId?: string | null;
  sessionId?: string | null;
  messageId?: string | null;
};

export type ConsultedChronicleAgent = {
  actor: string;
  actorSlug?: string;
  summary: string;
  sessionId?: string | null;
};

/** Draft mutations that merit a History "Kept" / Document row. */
export const CHRONICLE_KEPT_ACTION_TYPES = [
  'draft.update',
  'draft.point.accept',
  'draft.point.promote',
] as const;

export type ChronicleKeptActionType = (typeof CHRONICLE_KEPT_ACTION_TYPES)[number];

export function isChronicleKeptActionType(value: string): value is ChronicleKeptActionType {
  return (CHRONICLE_KEPT_ACTION_TYPES as readonly string[]).includes(value);
}

function trimTo(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength).trim();
}

/** First sentence / clause, capped for History scan. */
export function firstTakeaway(text: string, maxLength: number = CHRONICLE_SUMMARY_MAX): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const sentence = normalized
    .split(/(?<=[.!?])\s+/)[0]
    ?.replace(/^["'`]+|["'`]+$/g, '')
    .trim() ?? normalized;
  return trimTo(sentence.replace(/[.!?]+$/, ''), maxLength);
}

function asAnchor(value: unknown): ChronicleEventAnchor | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as ChronicleEventAnchor;
}

export function mapChronicleEventRow(row: ChronicleEventRow): ChronicleEvent {
  return {
    id: row.id,
    dialogId: row.dialogId,
    domainId: row.domainId,
    actor: row.actor,
    ...(row.actorSlug ? { actorSlug: row.actorSlug } : {}),
    eventType: isChronicleEventType(row.eventType) ? row.eventType : 'session',
    title: row.title,
    summary: row.summary,
    timestamp: row.createdAt.toISOString(),
    ...(asAnchor(row.anchor) ? { anchor: asAnchor(row.anchor) } : {}),
    parentEventId: row.parentEventId,
  };
}

export function groupChronicleEvents(rows: ChronicleEventRow[]): ChronicleEvent[] {
  const events = rows.map(mapChronicleEventRow);
  const byId = new Map(events.map((event) => [event.id, event]));
  const roots: ChronicleEvent[] = [];

  for (const event of events) {
    if (event.parentEventId) {
      const parent = byId.get(event.parentEventId);
      if (parent) {
        parent.children = [...(parent.children ?? []), event];
        continue;
      }
    }
    roots.push(event);
  }

  return roots;
}

export async function createChronicleEvent(input: CreateChronicleEventInput): Promise<ChronicleEvent> {
  const data: Prisma.ChronicleEventUncheckedCreateInput = {
    dialogId: input.dialogId,
    domainId: input.domainId,
    actor: trimTo(input.actor, 120),
    eventType: input.eventType,
    title: trimTo(input.title, CHRONICLE_TITLE_MAX),
    summary: trimTo(input.summary, CHRONICLE_SUMMARY_MAX),
    ...(input.actorSlug ? { actorSlug: trimTo(input.actorSlug, 120) } : {}),
    ...(input.anchor ? { anchor: input.anchor as Prisma.InputJsonValue } : {}),
    ...(input.parentEventId ? { parentEventId: input.parentEventId } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.messageId ? { messageId: input.messageId } : {}),
  };
  const row = await prisma.chronicleEvent.create({
    data,
  });
  return mapChronicleEventRow(row);
}

/**
 * Uses the same admin/keeper Dialog audience contract as the Document loader.
 */
export async function listChronicleEventsForDialog(input: {
  domainId: string;
  dialogId: string;
  userId: string;
}): Promise<ChronicleEvent[] | null> {
  const dialog = await prisma.dialog.findFirst({
    where: {
      id: input.dialogId,
      domain_id: input.domainId,
      OR: [
        { available_to: { has: 'admin' } },
        { user_id: input.userId, available_to: { has: 'keeper' } },
      ],
    },
    select: { id: true },
  });
  if (!dialog) return null;

  // Flat list — client nests via parentEventId (avoids double-group wiping children).
  const rows = await prisma.chronicleEvent.findMany({
    where: { domainId: input.domainId, dialogId: input.dialogId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapChronicleEventRow);
}

/** Short consult chapter title + one-line summary (not full reply dumps). */
export function buildConsultChapterMeta(input: {
  userMessage: string;
  consultedActors: string[];
}): { title: string; summary: string } {
  const topic = firstTakeaway(input.userMessage, CHRONICLE_TITLE_MAX) || 'Cast consult';
  const names = input.consultedActors.filter(Boolean);
  const summary =
    names.length > 0
      ? trimTo(`Consulted ${names.join(', ')}.`, CHRONICLE_SUMMARY_MAX)
      : 'Consulted the cast.';
  return { title: topic, summary };
}

export async function recordConsultFanoutEvents(input: {
  domainId: string;
  dialogId: string;
  leadActor: string;
  leadActorSlug?: string;
  turnTitle: string;
  turnSummary: string;
  sessionId?: string | null;
  consultedAgents: ConsultedChronicleAgent[];
}): Promise<ChronicleEvent | null> {
  if (input.consultedAgents.length < 2) return null;

  const parent = await createChronicleEvent({
    domainId: input.domainId,
    dialogId: input.dialogId,
    actor: input.leadActor,
    actorSlug: input.leadActorSlug,
    eventType: 'session',
    title: input.turnTitle,
    summary: input.turnSummary,
    anchor: { dialogId: input.dialogId, entityId: input.sessionId ?? undefined, entityKind: 'session' },
    sessionId: input.sessionId,
  });
  await Promise.all(
    input.consultedAgents.map((agent) =>
      createChronicleEvent({
        domainId: input.domainId,
        dialogId: input.dialogId,
        actor: agent.actor,
        actorSlug: agent.actorSlug,
        eventType: 'session',
        title: trimTo(`${agent.actor} consulted`, CHRONICLE_TITLE_MAX),
        summary: firstTakeaway(agent.summary) || `${agent.actor} contributed.`,
        parentEventId: parent.id,
        anchor: { dialogId: input.dialogId, entityId: agent.sessionId ?? undefined, entityKind: 'session' },
        sessionId: agent.sessionId,
      }),
    ),
  );
  return parent;
}

/** Title/summary for Document keep / promote History rows. */
export function buildKeptChronicleMeta(input: {
  actionType: string;
  actor: string;
  draftTitle: string;
  message?: string | null;
}): { title: string; summary: string; eventType: 'moment' | 'structural' } | null {
  if (!isChronicleKeptActionType(input.actionType)) return null;

  const draftLabel = trimTo(input.draftTitle, 40) || 'Document';
  const takeaway = firstTakeaway(input.message ?? '');

  if (input.actionType === 'draft.point.promote') {
    return {
      eventType: 'structural',
      title: 'Promoted to Moment',
      summary: takeaway || trimTo(`${input.actor} kept a Moment from ${draftLabel}.`, CHRONICLE_SUMMARY_MAX),
    };
  }
  if (input.actionType === 'draft.point.accept') {
    return {
      eventType: 'moment',
      title: 'Kept in Document',
      summary: takeaway || trimTo(`${input.actor} accepted a Point in ${draftLabel}.`, CHRONICLE_SUMMARY_MAX),
    };
  }
  // draft.update
  return {
    eventType: 'moment',
    title: 'Document updated',
    summary: takeaway || trimTo(`${input.actor} updated ${draftLabel}.`, CHRONICLE_SUMMARY_MAX),
  };
}

export async function recordMomentEvent(input: Omit<CreateChronicleEventInput, 'eventType'>): Promise<ChronicleEvent> {
  return createChronicleEvent({ ...input, eventType: 'moment' });
}

export async function recordStructuralEvent(input: Omit<CreateChronicleEventInput, 'eventType'>): Promise<ChronicleEvent> {
  return createChronicleEvent({ ...input, eventType: 'structural' });
}

/**
 * Topic-shaped meta when an auto-named session gets its real name.
 * Returns null when the session already has an authored name.
 */
export function deriveSessionCloseMeta(input: {
  agentName: string;
  replyText: string;
  existingName?: string | null;
  userMessage?: string | null;
}): { title: string; summary: string } | null {
  const existingName = input.existingName?.trim() ?? '';
  if (existingName && !/^session with\s+/i.test(existingName)) return null;

  // Prefer the user's topic cue when it is substantive; else first reply takeaway.
  const fromUser = firstTakeaway(input.userMessage ?? '', CHRONICLE_TITLE_MAX);
  const fromReply = firstTakeaway(input.replyText, CHRONICLE_TITLE_MAX);
  const title = (fromUser.length >= 8 ? fromUser : fromReply) || `${input.agentName} session`;
  if (title.length < 8 && !fromReply) return null;

  const summarySource = fromReply || fromUser;
  const summary = summarySource
    ? trimTo(
        /\b(ed|was|were|did|made|built|saved|updated|created|kept|reviewed)\b/i.test(summarySource)
          ? `${summarySource}.`
          : `${input.agentName} worked ${summarySource.charAt(0).toLowerCase()}${summarySource.slice(1)}.`,
        CHRONICLE_SUMMARY_MAX,
      )
    : trimTo(`${input.agentName} session.`, CHRONICLE_SUMMARY_MAX);

  return {
    title: trimTo(title, CHRONICLE_TITLE_MAX),
    summary,
  };
}

/**
 * Idempotently replaces only auto-generated session names.
 */
export async function closeSessionWithAuthoredMeta(input: {
  sessionId: string;
  agentId: string;
  title: string;
  summary: string;
}): Promise<boolean> {
  const updated = await prisma.kip_sessions.updateMany({
    where: {
      id: input.sessionId,
      agent_id: input.agentId,
      OR: [
        { session_name: null },
        { session_name: '' },
        { session_name: { startsWith: 'Session with', mode: 'insensitive' } },
      ],
    },
    data: {
      session_name: trimTo(input.title, CHRONICLE_TITLE_MAX),
      summary: trimTo(input.summary, CHRONICLE_SUMMARY_MAX),
      updated_at: new Date(),
    },
  });
  return updated.count > 0;
}

/** Title/summary for a session chapter History row (when a session is first named). */
export function buildSessionChapterMeta(input: {
  actor: string;
  userMessage?: string | null;
  replyText?: string | null;
  closeMeta?: { title: string; summary: string } | null;
}): { title: string; summary: string } | null {
  if (input.closeMeta?.title.trim() && input.closeMeta.summary.trim()) {
    return {
      title: trimTo(input.closeMeta.title, CHRONICLE_TITLE_MAX),
      summary: trimTo(input.closeMeta.summary, CHRONICLE_SUMMARY_MAX),
    };
  }
  return deriveSessionCloseMeta({
    agentName: input.actor,
    replyText: input.replyText ?? '',
    userMessage: input.userMessage,
    existingName: null,
  });
}

/**
 * @deprecated Use buildSessionChapterMeta — turn-level History rows are retired.
 */
export const buildSessionTurnMeta = buildSessionChapterMeta;

/**
 * Persist one History row when a Dialog session is first named (chapter), not per turn.
 */
export async function recordSessionChapterEvent(input: {
  domainId: string;
  dialogId: string;
  actor: string;
  actorSlug?: string;
  title: string;
  summary: string;
  sessionId?: string | null;
}): Promise<ChronicleEvent | null> {
  const title = trimTo(input.title, CHRONICLE_TITLE_MAX);
  const summary = trimTo(input.summary, CHRONICLE_SUMMARY_MAX);
  if (!title || !summary) return null;

  return createChronicleEvent({
    domainId: input.domainId,
    dialogId: input.dialogId,
    actor: input.actor,
    actorSlug: input.actorSlug,
    eventType: 'session',
    title,
    summary,
    anchor: {
      dialogId: input.dialogId,
      entityId: input.sessionId ?? undefined,
      entityKind: 'session',
    },
    sessionId: input.sessionId,
  });
}

/**
 * @deprecated Use recordSessionChapterEvent — per-turn session History is retired.
 */
export async function recordSessionTurnEvent(input: {
  domainId: string;
  dialogId: string;
  actor: string;
  actorSlug?: string;
  userMessage: string;
  replyText: string;
  sessionId?: string | null;
  closeMeta?: { title: string; summary: string } | null;
}): Promise<ChronicleEvent | null> {
  const meta = buildSessionChapterMeta({
    actor: input.actor,
    userMessage: input.userMessage,
    replyText: input.replyText,
    closeMeta: input.closeMeta,
  });
  if (!meta) return null;
  return recordSessionChapterEvent({
    domainId: input.domainId,
    dialogId: input.dialogId,
    actor: input.actor,
    actorSlug: input.actorSlug,
    title: meta.title,
    summary: meta.summary,
    sessionId: input.sessionId,
  });
}

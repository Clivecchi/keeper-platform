/**
 * Dialog-scoped Chronicle History persistence and mapping.
 * This is intentionally separate from the Realm-wide feed projection.
 */

import { prisma } from '@keeper/database';
import type { Prisma } from '@prisma/client';
import {
  isChronicleEventType,
  type ChronicleEvent,
  type ChronicleEventAnchor,
  type ChronicleEventType,
} from '@keeper/shared';

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

function trimTo(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength).trim();
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
    title: trimTo(input.title, 300),
    summary: trimTo(input.summary, 1000),
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
        title: `${agent.actor} consulted`,
        summary: agent.summary,
        parentEventId: parent.id,
        anchor: { dialogId: input.dialogId, entityId: agent.sessionId ?? undefined, entityKind: 'session' },
        sessionId: agent.sessionId,
      }),
    ),
  );
  return parent;
}

export async function recordMomentEvent(input: Omit<CreateChronicleEventInput, 'eventType'>): Promise<ChronicleEvent> {
  return createChronicleEvent({ ...input, eventType: 'moment' });
}

export async function recordStructuralEvent(input: Omit<CreateChronicleEventInput, 'eventType'>): Promise<ChronicleEvent> {
  return createChronicleEvent({ ...input, eventType: 'structural' });
}

export function deriveSessionCloseMeta(input: {
  agentName: string;
  replyText: string;
  existingName?: string | null;
}): { title: string; summary: string } | null {
  const existingName = input.existingName?.trim() ?? '';
  if (existingName && !/^session with\s+/i.test(existingName)) return null;

  const sentence = input.replyText
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)[0]
    ?.replace(/^["'`]+|["'`]+$/g, '')
    .trim();
  if (!sentence || sentence.length < 8) return null;

  const title = trimTo(sentence.replace(/[.!?]+$/, ''), 72);
  const pastTense = /\b(ed|was|were|did|made|built|saved|updated|created|kept|reviewed)\b/i.test(sentence)
    ? sentence
    : `${input.agentName} addressed ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  return {
    title: title || `${input.agentName} session`,
    summary: trimTo(pastTense.replace(/[.!?]+$/, '.'), 140),
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
      session_name: trimTo(input.title, 72),
      summary: trimTo(input.summary, 140),
      updated_at: new Date(),
    },
  });
  return updated.count > 0;
}

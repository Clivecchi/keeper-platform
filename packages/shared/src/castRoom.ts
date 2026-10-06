/**
 * Progressive Cast Room — factual trace and the turn-scoped trail projected from it.
 * Trace records what happened. It does not score relevance or decide consequence.
 */

export const CAST_ROOM_CONTRIBUTION_CAP = 2;

export const CAST_ROOM_EVENT_WHATS = [
  'spoke',
  'offered',
  'directed',
  'contributed',
  'acted',
  'resolved',
  'presented',
] as const;

export type CastRoomEventWhat = (typeof CAST_ROOM_EVENT_WHATS)[number];

export type CastRoomEvent = {
  v: 1;
  id: string;
  at: string;
  actor: { kind: 'human' | 'agent' | 'runtime'; slug?: string; id?: string };
  what: CastRoomEventWhat;
  where: {
    humanTurnId: string;
    dialogId?: string;
    sessionId?: string;
    messageId?: string;
    domainId?: string;
  };
  /** Short fact: offer line, aim, or receipt label. Not a meaning. */
  label?: string;
  refs?: Array<{ kind: string; id: string }>;
};

export type CastRoomOfferLine = {
  slug: string;
  label: string;
  offer: string;
};

export type CastRoomEngage = {
  slug: string;
  aim: string;
};

export type CastRoomConsumption = {
  role: 'offer' | 'contribution' | 'lead';
  slug: string;
  offeringId: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
  estimatedCost: null;
};

export type CastRoomWire = {
  phase: 'direct' | 'present' | 'record';
  trail?: string;
  offers?: CastRoomOfferLine[];
  decision?: string;
  trace?: CastRoomEvent[];
  consumption?: CastRoomConsumption[];
  allowEngage?: boolean;
};

const WHAT_SET = new Set<string>(CAST_ROOM_EVENT_WHATS);

export function parseCastRoomEngage(value: unknown): CastRoomEngage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const slug = typeof record.slug === 'string' ? record.slug.trim().toLowerCase() : '';
  const aim = typeof record.aim === 'string' ? record.aim.trim() : '';
  if (!slug || !aim) return null;
  return { slug, aim };
}

export function parseCastRoomEvents(value: unknown): CastRoomEvent[] {
  if (!Array.isArray(value)) return [];
  const events: CastRoomEvent[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const actor = record.actor;
    const where = record.where;
    if (!actor || typeof actor !== 'object' || Array.isArray(actor)) continue;
    if (!where || typeof where !== 'object' || Array.isArray(where)) continue;
    const actorRecord = actor as Record<string, unknown>;
    const whereRecord = where as Record<string, unknown>;
    const what = typeof record.what === 'string' ? record.what : '';
    const kind = actorRecord.kind;
    const humanTurnId = typeof whereRecord.humanTurnId === 'string' ? whereRecord.humanTurnId : '';
    if (record.v !== 1 || typeof record.id !== 'string' || typeof record.at !== 'string') continue;
    if (!WHAT_SET.has(what)) continue;
    if (kind !== 'human' && kind !== 'agent' && kind !== 'runtime') continue;
    if (!humanTurnId) continue;
    events.push({
      v: 1,
      id: record.id,
      at: record.at,
      actor: {
        kind,
        ...(typeof actorRecord.slug === 'string' ? { slug: actorRecord.slug } : {}),
        ...(typeof actorRecord.id === 'string' ? { id: actorRecord.id } : {}),
      },
      what: what as CastRoomEventWhat,
      where: {
        humanTurnId,
        ...(typeof whereRecord.dialogId === 'string' ? { dialogId: whereRecord.dialogId } : {}),
        ...(typeof whereRecord.sessionId === 'string' ? { sessionId: whereRecord.sessionId } : {}),
        ...(typeof whereRecord.messageId === 'string' ? { messageId: whereRecord.messageId } : {}),
        ...(typeof whereRecord.domainId === 'string' ? { domainId: whereRecord.domainId } : {}),
      },
      ...(typeof record.label === 'string' && record.label.trim()
        ? { label: record.label.trim() }
        : {}),
    });
  }
  return events;
}

export function parseCastRoomWire(value: unknown): CastRoomWire | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const phase = record.phase;
  if (phase !== 'direct' && phase !== 'present' && phase !== 'record') return null;
  const offers = Array.isArray(record.offers)
    ? record.offers.flatMap((row) => {
        if (!row || typeof row !== 'object') return [];
        const offerRow = row as Record<string, unknown>;
        const slug = typeof offerRow.slug === 'string' ? offerRow.slug.trim().toLowerCase() : '';
        const label = typeof offerRow.label === 'string' ? offerRow.label.trim() : slug;
        const offer = typeof offerRow.offer === 'string' ? offerRow.offer.trim() : '';
        if (!slug) return [];
        return [{ slug, label, offer }];
      })
    : undefined;
  return {
    phase,
    ...(typeof record.trail === 'string' ? { trail: record.trail } : {}),
    ...(offers ? { offers } : {}),
    ...(typeof record.decision === 'string' ? { decision: record.decision } : {}),
    ...(record.allowEngage === false ? { allowEngage: false } : record.allowEngage === true ? { allowEngage: true } : {}),
    trace: parseCastRoomEvents(record.trace),
    consumption: Array.isArray(record.consumption)
      ? record.consumption.flatMap((row) => {
          if (!row || typeof row !== 'object') return [];
          const item = row as Record<string, unknown>;
          const role = item.role;
          if (role !== 'offer' && role !== 'contribution' && role !== 'lead') return [];
          const slug = typeof item.slug === 'string' ? item.slug : '';
          const offeringId = typeof item.offeringId === 'string' ? item.offeringId : '';
          if (!slug || !offeringId) return [];
          return [{
            role,
            slug,
            offeringId,
            promptTokens: typeof item.promptTokens === 'number' ? item.promptTokens : null,
            completionTokens: typeof item.completionTokens === 'number' ? item.completionTokens : null,
            latencyMs: typeof item.latencyMs === 'number' ? item.latencyMs : null,
            estimatedCost: null,
          } satisfies CastRoomConsumption];
        })
      : [],
  };
}

/** This turn's events, plus the previous turn's contributed / acted / resolved facts. */
export function projectCastRoomTrail(
  current: readonly CastRoomEvent[],
  previous: readonly CastRoomEvent[] = [],
): string {
  const prior = previous.filter(
    (event) => event.what === 'contributed' || event.what === 'acted' || event.what === 'resolved',
  );
  const rows = [...prior, ...current].sort((a, b) => a.at.localeCompare(b.at));
  if (rows.length === 0) return '(no trail yet)';
  return rows
    .map((event) => {
      const who = event.actor.slug || event.actor.kind;
      const label = event.label ? ` — ${event.label}` : '';
      return `${event.at} ${who} ${event.what}${label}`;
    })
    .join('\n');
}

/** One factual line for the Trace under a Lead message. */
export function formatCastRoomTraceLine(event: CastRoomEvent): string {
  const who = event.actor.slug
    || (event.actor.kind === 'human' ? 'You' : event.actor.kind === 'runtime' ? 'Keeper' : 'Lead');
  return event.label ? `${who} ${event.what} — ${event.label}` : `${who} ${event.what}`;
}

/**
 * Place action receipts on the Trace before the turn resolves.
 * Uses the existing `acted` event. Does not grant new authority.
 */
export function withActionReceiptsOnTrace(
  trace: readonly CastRoomEvent[],
  receipts: ReadonlyArray<{ type?: unknown; status?: unknown; message?: unknown }>,
  humanTurnId: string,
  actorSlug?: string,
): CastRoomEvent[] {
  if (!humanTurnId.trim()) return [...trace];
  const acted = receipts.flatMap((row) => {
    const type = typeof row.type === 'string' ? row.type.trim() : '';
    if (!type) return [];
    const status = typeof row.status === 'string' ? row.status.trim() : '';
    const message = typeof row.message === 'string' ? row.message.trim() : '';
    const label = [type, status, message].filter(Boolean).join(' — ').slice(0, 180);
    return [castRoomEvent({
      actor: { kind: 'agent', ...(actorSlug ? { slug: actorSlug } : {}) },
      what: 'acted',
      humanTurnId,
      label,
    })];
  });
  if (acted.length === 0) return [...trace];
  const next = [...trace];
  const insertAt = next.findIndex((event) => event.what === 'resolved' || event.what === 'presented');
  if (insertAt === -1) return [...next, ...acted];
  next.splice(insertAt, 0, ...acted);
  return next;
}

export function castRoomEvent(params: {
  actor: CastRoomEvent['actor'];
  what: CastRoomEventWhat;
  humanTurnId: string;
  label?: string;
  dialogId?: string;
  sessionId?: string;
  domainId?: string;
}): CastRoomEvent {
  return {
    v: 1,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: params.actor,
    what: params.what,
    where: {
      humanTurnId: params.humanTurnId,
      ...(params.dialogId ? { dialogId: params.dialogId } : {}),
      ...(params.sessionId ? { sessionId: params.sessionId } : {}),
      ...(params.domainId ? { domainId: params.domainId } : {}),
    },
    ...(params.label?.trim() ? { label: params.label.trim() } : {}),
  };
}

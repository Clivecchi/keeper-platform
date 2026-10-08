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

export const AGENCY_LOOP_OUTCOMES = [
  'completed',
  'blocked',
  'unfinished',
  'rejected',
  'undirected',
] as const;

export type AgencyLoopOutcome = (typeof AGENCY_LOOP_OUTCOMES)[number];

export const LEAD_ASSESSMENT_EVIDENCE = ['receipt', 'observation', 'none'] as const;
export const LEAD_ASSESSMENT_OUTCOMES = ['completed', 'blocked', 'unfinished'] as const;

/** Lead judgment of one contribution. Not a Trace event and not a mutation. */
export type LeadAssessment = {
  addressesAim: boolean;
  evidence: (typeof LEAD_ASSESSMENT_EVIDENCE)[number];
  outcome: (typeof LEAD_ASSESSMENT_OUTCOMES)[number];
};

export const RECEIPT_STANDINGS = [
  'proposed',
  'executed',
  'persisted',
  'failed',
  'blocked',
] as const;

export type ReceiptStanding = (typeof RECEIPT_STANDINGS)[number];

/** What a tool receipt actually is. Verified is an assessment, not a standing. */
export type ClassifiedReceipt = {
  type: string;
  status: string;
  standing: ReceiptStanding;
  message?: string;
};

export type CastRoomAssignment = {
  directionId: string;
  aim: string;
  slug: string;
  reply: string;
  receipts: ClassifiedReceipt[];
};

export type CastRoomWire = {
  phase: 'direct' | 'present' | 'record' | 'evaluate';
  trail?: string;
  offers?: CastRoomOfferLine[];
  decision?: string;
  trace?: CastRoomEvent[];
  consumption?: CastRoomConsumption[];
  allowEngage?: boolean;
  /** Present pass: whether the aim was met. Presentation is separate. */
  outcome?: AgencyLoopOutcome;
  resolved?: boolean;
  assignment?: CastRoomAssignment;
};

export const CAST_ROOM_DIRECTION_REF = 'direction';
export const CAST_ROOM_CONTRIBUTION_REF = 'contribution';

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
    const refs = parseCastRoomRefs(record.refs);
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
      ...(refs?.length ? { refs } : {}),
    });
  }
  return events;
}

export function parseCastRoomWire(value: unknown): CastRoomWire | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const phase = record.phase;
  if (phase !== 'direct' && phase !== 'present' && phase !== 'record' && phase !== 'evaluate') return null;
  const outcome = typeof record.outcome === 'string' && (AGENCY_LOOP_OUTCOMES as readonly string[]).includes(record.outcome)
    ? record.outcome as AgencyLoopOutcome
    : undefined;
  const assignment = parseCastRoomAssignment(record.assignment);
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
    ...(outcome ? { outcome } : {}),
    ...(record.resolved === true ? { resolved: true } : record.resolved === false ? { resolved: false } : {}),
    ...(assignment ? { assignment } : {}),
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

function formatTrailRows(events: readonly CastRoomEvent[]): string {
  return [...events]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((event) => {
      const who = event.actor.slug || event.actor.kind;
      const label = event.label ? ` — ${event.label}` : '';
      return `${event.at} ${who} ${event.what}${label}`;
    })
    .join('\n');
}

/**
 * Prior contributions stay visible and are labeled as history.
 * They are not this turn's assignment.
 */
export function projectCastRoomTrail(
  current: readonly CastRoomEvent[],
  previous: readonly CastRoomEvent[] = [],
): string {
  const prior = previous.filter(
    (event) => event.what === 'contributed' || event.what === 'acted' || event.what === 'resolved',
  );
  const priorBlock = prior.length
    ? `PRIOR TURN (historical only — not this assignment):\n${formatTrailRows(prior)}`
    : 'PRIOR TURN (historical only — not this assignment): (none)';
  const currentBlock = current.length
    ? `THIS TURN:\n${formatTrailRows(current)}`
    : 'THIS TURN: (no events yet)';
  return `${priorBlock}\n${currentBlock}`;
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
  refs?: Array<{ kind: string; id: string }>;
}): CastRoomEvent {
  const refs = params.refs?.filter((ref) => ref.kind.trim() && ref.id.trim());
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
    ...(refs?.length ? { refs } : {}),
  };
}

function parseCastRoomRefs(value: unknown): Array<{ kind: string; id: string }> | undefined {
  if (!Array.isArray(value)) return undefined;
  const refs: Array<{ kind: string; id: string }> = [];
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const kind = typeof record.kind === 'string' ? record.kind.trim() : '';
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!kind || !id) continue;
    refs.push({ kind, id });
  }
  return refs.length ? refs : undefined;
}

function parseClassifiedReceipt(value: unknown): ClassifiedReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const type = typeof record.type === 'string' ? record.type.trim() : '';
  const standing = typeof record.standing === 'string' ? record.standing : '';
  if (!type || !(RECEIPT_STANDINGS as readonly string[]).includes(standing)) return null;
  const status = typeof record.status === 'string' ? record.status.trim() : standing;
  const message = typeof record.message === 'string' ? record.message.trim() : '';
  return {
    type,
    status,
    standing: standing as ReceiptStanding,
    ...(message ? { message } : {}),
  };
}

function parseCastRoomAssignment(value: unknown): CastRoomAssignment | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const directionId = typeof record.directionId === 'string' ? record.directionId.trim() : '';
  const aim = typeof record.aim === 'string' ? record.aim.trim() : '';
  const slug = typeof record.slug === 'string' ? record.slug.trim().toLowerCase() : '';
  if (!directionId || !aim || !slug) return undefined;
  const reply = typeof record.reply === 'string' ? record.reply : '';
  const receipts = Array.isArray(record.receipts)
    ? record.receipts.flatMap((row) => {
        const receipt = parseClassifiedReceipt(row);
        return receipt ? [receipt] : [];
      })
    : [];
  return { directionId, aim, slug, reply, receipts };
}

/** A contribution belongs to this direction only when both the turn and the direction id match. */
export function contributionMatchesDirection(
  contribution: CastRoomEvent,
  direction: CastRoomEvent,
): boolean {
  if (contribution.what !== 'contributed' || direction.what !== 'directed') return false;
  if (contribution.where.humanTurnId !== direction.where.humanTurnId) return false;
  return contribution.refs?.some(
    (ref) => ref.kind === CAST_ROOM_DIRECTION_REF && ref.id === direction.id,
  ) === true;
}

const PROPOSAL_RECEIPTS = new Set([
  'draft.update.propose',
  'treatment.propose',
  'document.reorganize.propose',
]);

const PERSISTED_RECEIPTS = new Set([
  'draft.create',
  'draft.update',
  'draft.point.accept',
  'draft.point.rewrite',
  'gloss.append',
  'sole.save',
  'story.save',
  'document.orientation.update',
]);

/** Propose success is a proposal. A tool success is execution. Neither is verification. */
export function classifyActionReceipt(row: {
  type?: unknown;
  status?: unknown;
  message?: unknown;
}): ClassifiedReceipt | null {
  const type = typeof row.type === 'string' ? row.type.trim() : '';
  if (!type) return null;
  const status = typeof row.status === 'string' ? row.status.trim() : '';
  const message = typeof row.message === 'string' ? row.message.trim() : '';
  let standing: ReceiptStanding = 'executed';
  if (status === 'error') standing = 'failed';
  else if (status === 'skipped' || status === 'blocked') standing = 'blocked';
  else if (PROPOSAL_RECEIPTS.has(type)) standing = 'proposed';
  else if (PERSISTED_RECEIPTS.has(type)) standing = 'persisted';
  return {
    type,
    status: status || 'unknown',
    standing,
    ...(message ? { message: message.slice(0, 180) } : {}),
  };
}

export function parseLeadAssessment(value: unknown): LeadAssessment | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const evidence = typeof record.evidence === 'string' ? record.evidence : '';
  const outcome = typeof record.outcome === 'string' ? record.outcome : '';
  if (typeof record.addressesAim !== 'boolean') return null;
  if (!(LEAD_ASSESSMENT_EVIDENCE as readonly string[]).includes(evidence)) return null;
  if (!(LEAD_ASSESSMENT_OUTCOMES as readonly string[]).includes(outcome)) return null;
  return {
    addressesAim: record.addressesAim,
    evidence: evidence as LeadAssessment['evidence'],
    outcome: outcome as LeadAssessment['outcome'],
  };
}

/**
 * Completed means the contribution addresses the aim and carries evidence.
 * A proposal receipt completes the aim only when the human asked for that artifact.
 */
export function aimIsSatisfied(params: {
  assessment: LeadAssessment | null;
  receipts: readonly ClassifiedReceipt[];
  artifactRequested: boolean;
}): boolean {
  const assessment = params.assessment;
  if (!assessment?.addressesAim) return false;
  if (assessment.outcome !== 'completed') return false;
  if (assessment.evidence === 'none') return false;
  const live = params.receipts.filter(
    (receipt) => receipt.standing === 'proposed'
      || receipt.standing === 'executed'
      || receipt.standing === 'persisted',
  );
  const onlyProposals = live.length > 0 && live.every((receipt) => receipt.standing === 'proposed');
  if (onlyProposals && !params.artifactRequested) return false;
  if (assessment.evidence === 'observation') return true;
  if (assessment.evidence === 'receipt') {
    return live.some((receipt) =>
      receipt.standing === 'executed'
      || receipt.standing === 'persisted'
      || (receipt.standing === 'proposed' && params.artifactRequested),
    );
  }
  return false;
}

export function continueOrPresent(params: {
  contributionsUsed: number;
  cap?: number;
  hasSubstance: boolean;
  correlated: boolean;
  failed: boolean;
  satisfied: boolean;
  leadBlocked: boolean;
}): { step: 'direct' | 'present'; resolve: boolean; outcome: AgencyLoopOutcome } {
  const cap = params.cap ?? CAST_ROOM_CONTRIBUTION_CAP;
  const budget = params.contributionsUsed < cap;
  if (params.satisfied && params.correlated) {
    return { step: 'present', resolve: true, outcome: 'completed' };
  }
  if (params.leadBlocked) {
    return { step: 'present', resolve: false, outcome: 'blocked' };
  }
  if (!params.correlated || params.failed || !params.hasSubstance) {
    return budget
      ? { step: 'direct', resolve: false, outcome: 'rejected' }
      : { step: 'present', resolve: false, outcome: 'rejected' };
  }
  return budget
    ? { step: 'direct', resolve: false, outcome: 'unfinished' }
    : { step: 'present', resolve: false, outcome: 'unfinished' };
}

/** The aim is the assignment. Prior trail is context and cannot replace it. */
export function buildSpecialistAssignmentBlock(params: {
  aim: string;
  directionId: string;
  priorTrail: string;
}): string {
  return [
    'THIS ASSIGNMENT — answer this aim. It is the only task for this contribution.',
    'A previous contribution, a session receipt, or an older investigation is not this assignment.',
    `Direction: ${params.directionId}`,
    `Aim: ${params.aim}`,
    '',
    params.priorTrail,
    'Report what you did for this aim. Do not report prior-turn work as this result.',
    'If you run a tool, the receipt is evidence. A receipt for a different object does not answer the aim.',
  ].join('\n');
}

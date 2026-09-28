/**
 * preserve-discovery@1
 *
 * One post-reply Choice. Jev compares the exchange with the living Document.
 * Keeper writes at most one proposed Point into the existing manuscript.
 */

import { createDraftPoint, updateDraftPointInSpec, type DraftPoint } from '@keeper/shared';
import type { TypeSafeQuestions } from '../TypeSafeProvider.js';

export const PRESERVE_DISCOVERY_GATE_ID = 'preserve-discovery@1' as const;

/**
 * Agency that recognized the discovery.
 * Point.proposedBy is a single string — it cannot also name the Lead that
 * mechanically ran draft.update.propose. This slice stores the recognizer.
 */
export const PRESERVE_DISCOVERY_AGENCY = 'Jev' as const;

/** Measured gap: real keeps ≥ 0.88, decoys ≤ 0.06. */
export const PRESERVE_DISCOVERY_MIN_PROBABILITY = 0.85;

/** Orientation cases sat near 0.25 on Reconsider. Under 0.10 keeps them out. */
export const PRESERVE_DISCOVERY_MAX_RECONSIDER = 0.1;

/** Same confidence bar. A high "already held" score blocks the write. */
export const PRESERVE_DISCOVERY_MAX_ALREADY_REPRESENTED = 0.85;

export const PRESERVE_DISCOVERY_OBJECTIVE =
  'Preserve meaningful human discoveries without unnecessarily interrupting natural conversation or preserving ordinary chatter.';

export const PRESERVE_DISCOVERY_MOVES = {
  CONTINUE: 'conversation should simply continue',
  PRESERVE_DISCOVERY:
    'something meaningful was earned that the living Document does not already hold',
  RECONSIDER_ORIENTATION: "the conversation's direction may no longer be represented accurately",
  ASK_HUMAN: 'the correct next responsibility genuinely requires clarification',
} as const;

export type PreserveDiscoveryMove = keyof typeof PRESERVE_DISCOVERY_MOVES;

export const PRESERVE_DISCOVERY_QUESTION =
  'Which semantic move should be chosen? Use the authoritative state, including what the living Document already holds, and the objective. Choose PRESERVE_DISCOVERY only when this exchange earned something the Document does not already hold. Choose one.';

export const PRESERVE_DISCOVERY_ALREADY_REPRESENTED_QUESTION =
  'Does something already held in the living Document represent what this exchange just found? A shared topic is not representation. Representation means this discovery is already there.';

export const PRESERVE_DISCOVERY_QUESTIONS: TypeSafeQuestions = {
  move: {
    type: 'choice',
    instructions: PRESERVE_DISCOVERY_QUESTION,
    criteria: { ...PRESERVE_DISCOVERY_MOVES },
  },
  alreadyRepresented: {
    type: 'noul',
    instructions: PRESERVE_DISCOVERY_ALREADY_REPRESENTED_QUESTION,
  },
};

/** One item the living Document already holds. No ids — Jev compares meaning. */
export type PreserveDiscoveryHeldItem = {
  number: number;
  status: string;
  title: string;
  preview: string;
};

export type PreserveDiscoveryState = {
  objective: string;
  human: string;
  kip: string;
  hasDurableResidue: boolean;
  existingDurableItemRepresentsWhatWasJustFound: boolean;
  direction: string | null;
  orientationText: string | null;
  documentTitle: string | null;
  held: PreserveDiscoveryHeldItem[];
};

export type PreserveMoveProbabilities = Record<PreserveDiscoveryMove, number>;

export type PreserveDiscoveryChoiceReading = {
  choice: string | null;
  confidence: number | null;
  probabilities: PreserveMoveProbabilities | null;
  alreadyRepresented: number | null;
};

const MOVE_NAMES = Object.keys(PRESERVE_DISCOVERY_MOVES) as PreserveDiscoveryMove[];

const EXCHANGE_CHAR_CAP = 4000;
/** A founding document has to reach Jev whole. Prefix-only 4k drops the later sections. */
const HUMAN_EXCHANGE_CHAR_CAP = 24_000;
const LEAD_SILENCE_MARKERS = ['[No response content]', '[No text provided]'] as const;

export const PRESERVE_DISCOVERY_LEAD_SILENCE =
  'The Lead produced no reply on this turn.';

/** A held preview inside a much longer source is a quote, not the whole exchange. */
const SOURCE_VS_HELD_RATIO = 4;
const LABEL_CHAR_CAP = 120;
const HELD_TITLE_CAP = 120;
const HELD_PREVIEW_CAP = 180;
const HELD_CAP = 40;
/** Shorter overlap is chatter, not "the Document already says this." */
const HELD_MATCH_CHARS = 40;

export type PreserveDiscoveryDocumentPoint = {
  status?: string;
  preview?: string;
  prelude?: string;
  referencesPointId?: string;
};

export function heldItemsFromDocumentPoints(
  points: readonly PreserveDiscoveryDocumentPoint[],
): PreserveDiscoveryHeldItem[] {
  const hosts = points.filter((point) => !point.referencesPointId?.trim());
  return hosts.slice(0, HELD_CAP).map((point, index) => {
    const preview = (point.preview ?? '').trim().slice(0, HELD_PREVIEW_CAP);
    const title = (point.prelude ?? '').trim().slice(0, HELD_TITLE_CAP) || preview.slice(0, HELD_TITLE_CAP);
    return {
      number: index + 1,
      status: point.status?.trim() || 'proposed',
      title,
      preview,
    };
  });
}

function normalizeDiscoveryText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Structural overlap with the manuscript. Semantic overlap is Jev's
 * alreadyRepresented score. Either one is enough to write nothing.
 */
export function manuscriptRepresentsExchange(params: {
  human: string;
  kip: string;
  held: readonly PreserveDiscoveryHeldItem[];
}): boolean {
  const exchange = normalizeDiscoveryText(`${params.human}\n${params.kip}`);
  const human = normalizeDiscoveryText(params.human);
  if (!exchange) return false;
  for (const item of params.held) {
    const preview = normalizeDiscoveryText(item.preview);
    const title = normalizeDiscoveryText(item.title);
    const heldBody = [title, preview].filter(Boolean).join(' ');
    if (preview.length >= HELD_MATCH_CHARS && exchange.includes(preview)) {
      if (exchange.length <= preview.length * SOURCE_VS_HELD_RATIO) return true;
    }
    if (heldBody.length >= HELD_MATCH_CHARS && exchange.includes(heldBody)) {
      if (exchange.length <= heldBody.length * SOURCE_VS_HELD_RATIO) return true;
    }
    if (human.length >= HELD_MATCH_CHARS && preview.length >= HELD_MATCH_CHARS && preview.includes(human)) {
      return true;
    }
  }
  return false;
}

export function isLeadSilence(reply: string | null | undefined): boolean {
  const trimmed = reply?.trim() ?? '';
  if (!trimmed) return true;
  return LEAD_SILENCE_MARKERS.some((marker) => trimmed === marker);
}

export function leadReplyForDiscovery(reply: string | null | undefined): string {
  if (isLeadSilence(reply)) return '';
  return reply?.trim() ?? '';
}

/** "Review the conversation and determine what belongs" — the source is earlier in the thread. */
export function humanAsksToReviewWhatBelongs(text: string): boolean {
  return (
    /\breview (the |this |teh )?conversation\b/i.test(text)
    || /\bwhat belongs\b/i.test(text)
    || /\bdetermine what belongs\b/i.test(text)
  );
}

export function priorHumanTurnsForDiscovery(
  messages: ReadonlyArray<{ sender?: string | null; role?: string | null; content?: string | null }>,
): string[] {
  return messages
    .filter((message) => message.sender === 'user' || message.role === 'user')
    .map((message) => (typeof message.content === 'string' ? message.content.trim() : ''))
    .filter((text) => text.length > 0)
    .slice(-3);
}

function clipDiscoveryText(text: string, cap: number): string {
  if (text.length <= cap) return text;
  const marker = '\n…\n';
  const budget = cap - marker.length;
  const head = Math.floor(budget * 0.55);
  const tail = budget - head;
  return `${text.slice(0, head)}${marker}${text.slice(text.length - tail)}`;
}

/**
 * Jev judges the request, not the short composer label.
 * Supporting context on this turn wins over "see attached".
 * A review ask also carries the prior human turns — that is where the huge request sits.
 */
export function assembleDiscoveryHuman(params: {
  visible: string;
  assembled?: string | null;
  priorHuman?: readonly string[];
}): string {
  const visible = params.visible.trim();
  const assembled = params.assembled?.trim() ?? '';
  const source = assembled.length > visible.length ? assembled : visible;
  const review = humanAsksToReviewWhatBelongs(visible) || humanAsksToReviewWhatBelongs(source);
  const priors = review
    ? (params.priorHuman ?? [])
        .map((turn) => turn.trim())
        .filter((turn) => turn && turn !== visible && turn !== source)
    : [];
  const combined = priors.length ? `${priors.join('\n\n')}\n\n${source}` : source;
  const cap = review || assembled.length > visible.length
    ? HUMAN_EXCHANGE_CHAR_CAP
    : EXCHANGE_CHAR_CAP;
  return clipDiscoveryText(combined, cap);
}

export function buildPreserveDiscoveryState(params: {
  human: string;
  kip: string;
  orientationText?: string | null;
  direction?: string | null;
  documentTitle?: string | null;
  held?: readonly PreserveDiscoveryHeldItem[];
}): PreserveDiscoveryState {
  const human = params.human.trim().slice(0, HUMAN_EXCHANGE_CHAR_CAP);
  const kip = params.kip.trim().slice(0, EXCHANGE_CHAR_CAP);
  const held = (params.held ?? []).slice(0, HELD_CAP);
  const orientation = params.orientationText?.trim() || null;
  const direction = params.direction?.trim() || null;
  return {
    objective: PRESERVE_DISCOVERY_OBJECTIVE,
    human,
    kip,
    hasDurableResidue: held.length > 0,
    existingDurableItemRepresentsWhatWasJustFound: manuscriptRepresentsExchange({
      human,
      kip,
      held,
    }),
    direction,
    orientationText: orientation,
    documentTitle: params.documentTitle?.trim() || null,
    held,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readPreserveDiscoveryChoice(
  answers: Record<string, unknown> | null | undefined,
): PreserveDiscoveryChoiceReading {
  const move = asRecord(answers?.move);
  const already = asRecord(answers?.alreadyRepresented);
  const choice = typeof move?.choice === 'string' ? move.choice : null;
  const confidence = typeof move?.confidence === 'number' ? move.confidence : null;
  const alreadyRepresented = typeof already?.noul === 'number' ? already.noul : null;
  const raw = move?.probabilities;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { choice, confidence, probabilities: null, alreadyRepresented };
  }
  const probabilities = {} as PreserveMoveProbabilities;
  for (const name of MOVE_NAMES) {
    const value = (raw as Record<string, unknown>)[name];
    probabilities[name] = typeof value === 'number' ? value : 0;
  }
  return { choice, confidence, probabilities, alreadyRepresented };
}

/** Gate on probability mass. Confidence is not a second threshold. */
export function preserveDiscoveryChoiceOpens(
  probabilities: PreserveMoveProbabilities | null,
): boolean {
  if (!probabilities) return false;
  return (
    probabilities.PRESERVE_DISCOVERY >= PRESERVE_DISCOVERY_MIN_PROBABILITY
    && probabilities.RECONSIDER_ORIENTATION < PRESERVE_DISCOVERY_MAX_RECONSIDER
  );
}

/**
 * Write only when Jev is confident something new was earned,
 * and neither the manuscript nor Jev says it is already held.
 */
export function preserveDiscoveryShouldKeep(params: {
  probabilities: PreserveMoveProbabilities | null;
  alreadyRepresented: number | null;
  existingDurableItemRepresentsWhatWasJustFound: boolean;
}): boolean {
  if (params.existingDurableItemRepresentsWhatWasJustFound) return false;
  if (
    typeof params.alreadyRepresented === 'number'
    && params.alreadyRepresented >= PRESERVE_DISCOVERY_MAX_ALREADY_REPRESENTED
  ) {
    return false;
  }
  return preserveDiscoveryChoiceOpens(params.probabilities);
}

export type PreserveDiscoveryCompletion = {
  survives: string;
  label?: string;
};

export function parsePreserveDiscoveryCompletion(
  raw: string,
): PreserveDiscoveryCompletion | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? trimmed).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const row = parsed as Record<string, unknown>;
  const survives = typeof row.survives === 'string' ? row.survives.trim() : '';
  if (!survives) return null;
  const labelRaw = typeof row.label === 'string' ? row.label.trim() : '';
  const label = labelRaw ? labelRaw.slice(0, LABEL_CHAR_CAP) : undefined;
  return label ? { survives, label } : { survives };
}

/** Short completion. Does not name actions, schemas, memory, or storage. */
export function buildPreserveDiscoveryCompletionMessages(params: {
  human: string;
  kip: string;
  held?: readonly string[];
}): Array<{ role: 'system' | 'user'; content: string }> {
  const heldLines = (params.held ?? []).map((line) => line.trim()).filter(Boolean);
  const heldBlock = heldLines.length
    ? `\n\nAlready held:\n${heldLines.map((line) => `- ${line}`).join('\n')}`
    : '';
  return [
    {
      role: 'system',
      content: [
        'You are Jev.',
        'Return only a JSON object with this shape:',
        '{"survives":"what should outlast this exchange","label":"optional short name"}',
        'survives is required. label is optional. No other text.',
        'survives is only what this exchange earned that is not already held.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Human: ${params.human.trim()}\n\nYour reply: ${params.kip.trim()}${heldBlock}`,
    },
  ];
}

export function preserveDiscoveryKeptMessage(hostTitle: string): string {
  const host = hostTitle.trim() || 'the Document';
  return `Jev recommended a Point on ${host} — kept on the Document, reviewable`;
}

export type PreserveDiscoveryProposeWrite = {
  content: string;
  label?: string;
  manuscriptDraftId: string;
  proposedBy?: string;
};

/** Payload for the existing draft.update.propose path. Status stays proposed. */
export function preserveDiscoveryProposePayload(
  write: PreserveDiscoveryProposeWrite,
): {
  content: string;
  id: string;
  draftId: string;
  proposedBy: string;
  author: string;
  title?: string;
  prelude?: string;
} {
  const proposedBy = write.proposedBy?.trim() || PRESERVE_DISCOVERY_AGENCY;
  return {
    content: write.content,
    id: write.manuscriptDraftId,
    draftId: write.manuscriptDraftId,
    proposedBy,
    author: proposedBy,
    ...(write.label ? { title: write.label, prelude: write.label } : {}),
  };
}

/** The Point this slice persists: proposed, attributed to Jev. */
export function preserveDiscoveryPoint(write: {
  content: string;
  label?: string;
}): DraftPoint {
  return createDraftPoint({
    content: write.content,
    proposedBy: PRESERVE_DISCOVERY_AGENCY,
    status: 'proposed',
    ...(write.label ? { prelude: write.label } : {}),
  });
}

/** Human confirmation still moves that same Point to accepted. Provenance stays. */
export function confirmPreserveDiscoveryPoint(
  point: DraftPoint,
): DraftPoint | null {
  const { point: confirmed } = updateDraftPointInSpec(
    { points: [point] },
    point.id,
    { status: 'accepted' },
  );
  return confirmed;
}

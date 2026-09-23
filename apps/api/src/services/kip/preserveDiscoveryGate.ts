/**
 * preserve-discovery@1
 *
 * One post-reply Choice. Keeper gates on that distribution.
 * Kip returns only what should survive. Keeper writes one proposed Point.
 */

import type { TypeSafeQuestions } from '../TypeSafeProvider.js';

export const PRESERVE_DISCOVERY_GATE_ID = 'preserve-discovery@1' as const;

/** Measured gap: real keeps ≥ 0.88, decoys ≤ 0.06. */
export const PRESERVE_DISCOVERY_MIN_PROBABILITY = 0.85;

/** Orientation cases sat near 0.25 on Reconsider. Under 0.10 keeps them out. */
export const PRESERVE_DISCOVERY_MAX_RECONSIDER = 0.1;

export const PRESERVE_DISCOVERY_OBJECTIVE =
  'Preserve meaningful human discoveries without unnecessarily interrupting natural conversation or preserving ordinary chatter.';

export const PRESERVE_DISCOVERY_MOVES = {
  CONTINUE: 'conversation should simply continue',
  PRESERVE_DISCOVERY: 'something meaningful should survive this exchange',
  RECONSIDER_ORIENTATION: "the conversation's direction may no longer be represented accurately",
  ASK_HUMAN: 'the correct next responsibility genuinely requires clarification',
} as const;

export type PreserveDiscoveryMove = keyof typeof PRESERVE_DISCOVERY_MOVES;

export const PRESERVE_DISCOVERY_QUESTION =
  'Which semantic move should be chosen? Use the authoritative state and the objective. Choose one.';

export const PRESERVE_DISCOVERY_QUESTIONS: TypeSafeQuestions = {
  move: {
    type: 'choice',
    instructions: PRESERVE_DISCOVERY_QUESTION,
    criteria: { ...PRESERVE_DISCOVERY_MOVES },
  },
};

export type PreserveDiscoveryState = {
  objective: string;
  human: string;
  kip: string;
  hasDurableResidue: boolean;
  existingDurableItemRepresentsWhatWasJustFound: boolean;
  direction: string | null;
  orientationText: string | null;
};

export type PreserveMoveProbabilities = Record<PreserveDiscoveryMove, number>;

export type PreserveDiscoveryChoiceReading = {
  choice: string | null;
  confidence: number | null;
  probabilities: PreserveMoveProbabilities | null;
};

const MOVE_NAMES = Object.keys(PRESERVE_DISCOVERY_MOVES) as PreserveDiscoveryMove[];

const EXCHANGE_CHAR_CAP = 4000;
const LABEL_CHAR_CAP = 120;

export function buildPreserveDiscoveryState(params: {
  human: string;
  kip: string;
  orientationText?: string | null;
}): PreserveDiscoveryState {
  return {
    objective: PRESERVE_DISCOVERY_OBJECTIVE,
    human: params.human.trim().slice(0, EXCHANGE_CHAR_CAP),
    kip: params.kip.trim().slice(0, EXCHANGE_CHAR_CAP),
    hasDurableResidue: false,
    existingDurableItemRepresentsWhatWasJustFound: false,
    direction: null,
    orientationText: params.orientationText?.trim() || null,
  };
}

export function readPreserveDiscoveryChoice(
  answers: Record<string, unknown> | null | undefined,
): PreserveDiscoveryChoiceReading {
  const move = answers?.move;
  if (!move || typeof move !== 'object' || Array.isArray(move)) {
    return { choice: null, confidence: null, probabilities: null };
  }
  const row = move as Record<string, unknown>;
  const choice = typeof row.choice === 'string' ? row.choice : null;
  const confidence = typeof row.confidence === 'number' ? row.confidence : null;
  const raw = row.probabilities;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { choice, confidence, probabilities: null };
  }
  const probabilities = {} as PreserveMoveProbabilities;
  for (const name of MOVE_NAMES) {
    const value = (raw as Record<string, unknown>)[name];
    probabilities[name] = typeof value === 'number' ? value : 0;
  }
  return { choice, confidence, probabilities };
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

export type PreserveDiscoveryDraftRow = {
  kind: string;
  pointCount: number;
};

/**
 * v0 safety restriction. Any durable item keeps the gate shut.
 * An empty manuscript is a draft row, not “already preserved.”
 */
export function preserveDiscoveryResidueVeto(
  rows: readonly PreserveDiscoveryDraftRow[],
): 'manuscript_points' | 'durable_draft' | null {
  const manuscriptPoints = rows
    .filter((row) => row.kind === 'document_manuscript')
    .reduce((sum, row) => sum + row.pointCount, 0);
  if (manuscriptPoints > 0) return 'manuscript_points';
  if (rows.length > 0) return 'durable_draft';
  return null;
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
  agentName: string;
  human: string;
  kip: string;
}): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: [
        `You are ${params.agentName}.`,
        'Return only a JSON object with this shape:',
        '{"survives":"what should outlast this exchange","label":"optional short name"}',
        'survives is required. label is optional. No other text.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Human: ${params.human.trim()}\n\nYour reply: ${params.kip.trim()}`,
    },
  ];
}

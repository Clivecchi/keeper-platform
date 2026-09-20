/**
 * TypeSafe shadow judgment for Document-related Turns.
 * Records Choice/Noul evidence. Does not authorize or execute Document mutation.
 */

import {
  buildDocumentTurnPostureState,
  DOCUMENT_TURN_POSTURE_QUESTIONS,
  parseDocumentTurnPostureAnswers,
  shouldShadowDocumentTurnPosture,
  type DocumentTurnPostureParsedAnswers,
  type DocumentTurnPostureState,
} from '@keeper/shared';
import { TYPESAFE_DEFAULT_MODEL, TYPESAFE_SYSTEMONE_URL } from '../TypeSafeProvider.js';
import { runTypeSafeEvaluateAction } from '../TypeSafeEvaluateService.js';

export type DocumentTurnPostureShadowRecord = {
  source: 'typesafe_shadow';
  executed: false;
  authorized: false;
  model: string | null;
  ok: boolean;
  errorCode?: string;
  message?: string;
  invocation: {
    url: string;
    model: string;
    questions: typeof DOCUMENT_TURN_POSTURE_QUESTIONS;
    state: DocumentTurnPostureState;
  };
  answers: Record<string, unknown> | null;
  parsed: DocumentTurnPostureParsedAnswers;
};

/** Persisted on Lead orchestration so later Turns can compare Jev vs Cast vs synthesis. */
export type SystemOneLeadOrientationDelivery = {
  audience: 'lead';
  suppliedToLead: boolean;
  suppliedToCast: false;
  eligible: boolean;
  available: boolean;
  model: string | null;
  errorCode?: string;
};

const NESTED_CAST_PROMPT_PATTERN =
  /^\[(?:Director delegation|Agent Echo —|Platform collaboration —)/i;

/**
 * Lead Director turn only. Cast consults (including Ceox as a Lead-role voice)
 * must not receive System One orientation in this V0.
 */
export function shouldSupplySystemOneOrientationToLead(params: {
  ephemeral?: boolean;
  input?: string | null;
}): boolean {
  if (params.ephemeral === true) return false;
  const input = params.input?.trim() ?? '';
  return !NESTED_CAST_PROMPT_PATTERN.test(input);
}

function formatProbabilities(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const rows = Object.entries(value as Record<string, unknown>)
    .filter(([, probability]) => typeof probability === 'number')
    .map(([label, probability]) => `${label} ${probability}`);
  return rows.length ? rows.join(', ') : null;
}

function formatNoul(value: unknown): string {
  return typeof value === 'number' ? String(value) : 'unavailable';
}

/**
 * Distinct read-only block for Lead. Not Cast synthesis. Not an execute switch.
 */
export function buildSystemOneLeadOrientationBlock(
  shadow: DocumentTurnPostureShadowRecord | null,
): string | null {
  if (!shadow) return null;

  const header = [
    '[System One orientation — Lead only]',
    'This is orientation to the scene, not the script for the performance.',
    'It is not authorization. It is not an execution switch.',
    'It does not choose Cast, route a model, or authorize an action.',
    'Cast members have not seen this block. Their Agency is independent.',
    'If you report System One values, quote only what is listed below.',
    'Do not infer, recreate, summarize, or fabricate TypeSafe values.',
  ];

  if (!shadow.ok || !shadow.answers) {
    return [
      ...header,
      '',
      'Available: no',
      `Model: ${shadow.model ?? 'unavailable'}`,
      shadow.errorCode ? `Reason: ${shadow.errorCode}` : null,
      shadow.message ? `Message: ${shadow.message}` : null,
      'If asked for System One values, say: No System One result was available to me for this Turn.',
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');
  }

  const answers = shadow.answers;
  const turn = answers.turnPosture;
  const turnRecord = turn && typeof turn === 'object' && !Array.isArray(turn)
    ? (turn as Record<string, unknown>)
    : null;
  const probabilities = formatProbabilities(turnRecord?.probabilities);
  const questions = shadow.invocation.questions;

  return [
    ...header,
    '',
    'Available: yes — a System One result WAS returned for this Turn.',
    'Quote these values in any System One Orientation section. Do not say that no result was available.',
    `Model: ${shadow.model ?? 'unavailable'}`,
    '',
    `Choice turnPosture — ${questions.turnPosture.instructions}`,
    `  choice: ${typeof turnRecord?.choice === 'string' ? turnRecord.choice : 'unavailable'}`,
    `  confidence: ${typeof turnRecord?.confidence === 'number' ? turnRecord.confidence : 'unavailable'}`,
    probabilities ? `  probabilities: ${probabilities}` : '  probabilities: unavailable',
    '',
    `Noul documentReorganizationRequested — ${questions.documentReorganizationRequested.instructions}`,
    `  noul: ${formatNoul(
      answers.documentReorganizationRequested
      && typeof answers.documentReorganizationRequested === 'object'
      && !Array.isArray(answers.documentReorganizationRequested)
        ? (answers.documentReorganizationRequested as Record<string, unknown>).noul
        : null,
    )}`,
    '',
    `Noul documentMutationRequested — ${questions.documentMutationRequested.instructions}`,
    `  noul: ${formatNoul(
      answers.documentMutationRequested
      && typeof answers.documentMutationRequested === 'object'
      && !Array.isArray(answers.documentMutationRequested)
        ? (answers.documentMutationRequested as Record<string, unknown>).noul
        : null,
    )}`,
  ].join('\n');
}

export function buildSystemOneLeadOrientationDelivery(
  shadow: DocumentTurnPostureShadowRecord | null,
  suppliedToLead: boolean,
): SystemOneLeadOrientationDelivery {
  return {
    audience: 'lead',
    suppliedToLead,
    suppliedToCast: false,
    eligible: shadow != null,
    available: shadow?.ok === true && shadow.answers != null,
    model: shadow?.model ?? null,
    ...(shadow?.errorCode ? { errorCode: shadow.errorCode } : {}),
  };
}

export async function evaluateDocumentTurnPostureShadow(params: {
  turn: string;
  dialogTitle?: string | null;
  documentInContext?: boolean;
  documentPointCount?: number | null;
  domainId?: string | null;
  userId?: string | null;
}): Promise<DocumentTurnPostureShadowRecord | null> {
  const state = buildDocumentTurnPostureState({
    turn: params.turn,
    dialogTitle: params.dialogTitle,
    documentInContext: params.documentInContext,
    documentPointCount: params.documentPointCount,
  });
  if (!shouldShadowDocumentTurnPosture(state.phraseSignal)) return null;

  const invocation = {
    url: TYPESAFE_SYSTEMONE_URL,
    model: TYPESAFE_DEFAULT_MODEL,
    questions: DOCUMENT_TURN_POSTURE_QUESTIONS,
    state,
  };

  const outcome = await runTypeSafeEvaluateAction({
    payload: {
      state,
      questions: DOCUMENT_TURN_POSTURE_QUESTIONS,
      model: TYPESAFE_DEFAULT_MODEL,
    },
    domainId: params.domainId,
    userId: params.userId,
  });

  if (outcome.ok === false) {
    return {
      source: 'typesafe_shadow',
      executed: false,
      authorized: false,
      model: TYPESAFE_DEFAULT_MODEL,
      ok: false,
      errorCode: outcome.errorCode,
      message: outcome.message,
      invocation,
      answers: null,
      parsed: parseDocumentTurnPostureAnswers(null),
    };
  }

  return {
    source: 'typesafe_shadow',
    executed: false,
    authorized: false,
    model: outcome.model,
    ok: true,
    invocation,
    answers: outcome.answers,
    parsed: parseDocumentTurnPostureAnswers(outcome.answers),
  };
}

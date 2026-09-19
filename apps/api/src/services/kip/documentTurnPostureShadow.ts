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

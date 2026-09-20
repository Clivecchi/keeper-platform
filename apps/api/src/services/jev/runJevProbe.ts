/**
 * Evaluate typed questions over supplied evidence via TypeSafe / Jev.
 * CLI (Code X-ray) and the Kip `jev.probe` action are consumers of this core.
 */

import {
  evaluateTypeSafe,
  isQuestionMap,
  parseTypeSafeEvaluatePayload,
  TYPESAFE_DEFAULT_MODEL,
  type TypeSafeQuestions,
} from '../TypeSafeProvider.js';
import type {
  JevParsedAnswer,
  JevProbeFailure,
  JevProbeOutcome,
  JevProbeRequest,
} from './types.js';

export function hasJevProbeEvidence(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && !value.trim()) return false;
  return true;
}

export function buildJevProbeState(evidence: unknown, context?: unknown): unknown {
  if (context === undefined) return evidence;
  return { context, evidence };
}

function readProbabilities(row: Record<string, unknown>): Record<string, number> | null {
  if (!row.probabilities || typeof row.probabilities !== 'object' || Array.isArray(row.probabilities)) {
    return null;
  }
  const entries = Object.entries(row.probabilities as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export function parseJevRawAnswer(
  raw: unknown,
): Omit<JevParsedAnswer, 'questionId' | 'question'> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const confidence = typeof row.confidence === 'number' ? row.confidence : null;
  const probabilities = readProbabilities(row);

  if (row.type === 'noul' && typeof row.noul === 'number') {
    return { type: 'noul', answer: row.noul, confidence, probabilities };
  }
  if (row.type === 'choice' && typeof row.choice === 'string') {
    return { type: 'choice', answer: row.choice, confidence, probabilities };
  }
  if (row.type === 'score' && typeof row.score === 'number') {
    return { type: 'score', answer: row.score, confidence, probabilities };
  }
  if (typeof row.choice === 'string') {
    return { type: 'choice', answer: row.choice, confidence, probabilities };
  }
  if (typeof row.noul === 'number') {
    return { type: 'noul', answer: row.noul, confidence, probabilities };
  }
  if (typeof row.score === 'number') {
    return { type: 'score', answer: row.score, confidence, probabilities };
  }
  return null;
}

export function evaluationsFromTypeSafe(
  rawAnswers: Record<string, unknown> | null | undefined,
  questions: TypeSafeQuestions,
): JevParsedAnswer[] {
  if (!rawAnswers) return [];
  const evaluations: JevParsedAnswer[] = [];
  for (const [questionId, question] of Object.entries(questions)) {
    const parsed = parseJevRawAnswer(rawAnswers[questionId]);
    if (!parsed) continue;
    evaluations.push({
      questionId,
      question: question.instructions,
      ...parsed,
    });
  }
  return evaluations;
}

export function parseJevProbePayload(
  payload: unknown,
): { ok: true; request: JevProbeRequest } | { ok: false; errorCode: 'INVALID_QUESTIONS'; message: string } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      ok: false,
      errorCode: 'INVALID_QUESTIONS',
      message: 'jev.probe requires a payload object',
    };
  }
  const row = payload as Record<string, unknown>;
  const evidence = row.evidence !== undefined ? row.evidence : row.state;
  if (!hasJevProbeEvidence(evidence)) {
    return {
      ok: false,
      errorCode: 'INVALID_QUESTIONS',
      message: 'evidence is required for jev.probe (state is accepted as an alias)',
    };
  }

  const parsed = parseTypeSafeEvaluatePayload({
    ...row,
    state: evidence,
  });
  if (parsed.ok === false) {
    return {
      ok: false,
      errorCode: 'INVALID_QUESTIONS',
      message: parsed.message.replace(/typesafe\.evaluate/g, 'jev.probe'),
    };
  }

  return {
    ok: true,
    request: {
      evidence: parsed.request.state,
      questions: parsed.request.questions,
      context: row.context,
      model: parsed.request.model,
    },
  };
}

export async function runJevProbe(params: {
  evidence: unknown;
  questions: TypeSafeQuestions;
  context?: unknown;
  model?: string;
  apiKey?: string | null;
}): Promise<JevProbeOutcome> {
  if (!hasJevProbeEvidence(params.evidence)) {
    return {
      ok: false,
      errorCode: 'INVALID_QUESTIONS',
      message: 'evidence is required for jev.probe',
    };
  }
  if (!isQuestionMap(params.questions) || Object.keys(params.questions).length === 0) {
    return {
      ok: false,
      errorCode: 'INVALID_QUESTIONS',
      message: 'jev.probe needs a questions map',
    };
  }

  const model = params.model?.trim() || TYPESAFE_DEFAULT_MODEL;
  const outcome = await evaluateTypeSafe({
    state: buildJevProbeState(params.evidence, params.context),
    questions: params.questions,
    model,
    apiKey: params.apiKey,
  });

  if (outcome.ok === false) {
    return outcome satisfies JevProbeFailure;
  }

  return {
    ok: true,
    model: outcome.model,
    answers: outcome.answers,
    evaluations: evaluationsFromTypeSafe(outcome.answers, params.questions),
    formatted: outcome.formatted,
    usage: outcome.usage,
  };
}

export type { JevAnswerType, JevParsedAnswer, JevProbeOutcome, JevProbeRequest };

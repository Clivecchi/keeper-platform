/**
 * Jev Probe — typed evaluation over supplied evidence.
 * Reusable core extracted from the Code X-ray harness.
 * Does not persist a Probe, schedule a run, or create an Evaluation object.
 */

import type { TypeSafeQuestions, TypeSafeUsage } from '../TypeSafeProvider.js';

export const JEV_PROBE_ACTION = 'jev.probe';
export const JEV_PROBE_CAPABILITY = 'jev.probe';

export type JevAnswerType = 'noul' | 'choice' | 'score';

export type JevParsedAnswer = {
  questionId: string;
  question: string;
  type: JevAnswerType;
  answer: string | number;
  confidence: number | null;
  probabilities: Record<string, number> | null;
};

export type JevProbeRequest = {
  evidence: unknown;
  questions: TypeSafeQuestions;
  context?: unknown;
  model: string;
};

export type JevProbeSuccess = {
  ok: true;
  model: string;
  answers: Record<string, unknown>;
  evaluations: JevParsedAnswer[];
  formatted: string;
  usage?: TypeSafeUsage;
};

export type JevProbeFailure = {
  ok: false;
  errorCode: 'MISSING_API_KEY' | 'INVALID_QUESTIONS' | 'PROVIDER_ERROR';
  message: string;
};

export type JevProbeOutcome = JevProbeSuccess | JevProbeFailure;

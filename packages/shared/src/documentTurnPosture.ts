/**
 * TypeSafe / System One shadow primitives for Document-related Turns.
 * Shadow only — mention/detection ≠ semantic intent ≠ authorization ≠ execution.
 */

import {
  detectReorganizeDetection,
  type ReorganizeDetection,
} from './documentReorganizeIntent.js';

export const DOCUMENT_TURN_POSTURE_CHOICES = [
  'explore',
  'question',
  'direct',
  'approve',
  'reject',
  'diagnose',
  'no_match',
] as const;

export type DocumentTurnPostureChoice = (typeof DOCUMENT_TURN_POSTURE_CHOICES)[number];

export type DocumentTurnPostureQuestions = {
  turnPosture: {
    type: 'choice';
    instructions: string;
    criteria: Record<DocumentTurnPostureChoice, string>;
  };
  documentReorganizationRequested: {
    type: 'noul';
    instructions: string;
  };
  documentMutationRequested: {
    type: 'noul';
    instructions: string;
  };
};

export const DOCUMENT_TURN_POSTURE_QUESTIONS: DocumentTurnPostureQuestions = {
  turnPosture: {
    type: 'choice',
    instructions:
      'What is the human doing on this Turn? Classify posture, not topic. Mentioning Review & Reorganize, asking about a prior proposal, or forbidding a change is not a direct.',
    criteria: {
      explore: 'Thinking aloud or discussing architecture without asking for a Document change',
      question: 'Asking for explanation or interpretation',
      direct: 'Instructing the Lead to reorganize or otherwise change the Document now',
      approve: 'Approving or applying an existing proposal',
      reject: 'Refusing or forbidding a change',
      diagnose: 'Inspecting a prior Turn or asking for an execution trace',
      no_match: 'Not a Document-direction Turn',
    },
  },
  documentReorganizationRequested: {
    type: 'noul',
    instructions:
      'Did the human request Review & Reorganize / a Document reorganization on this Turn? Mentioning, diagnosing, or forbidding the operation is not a request.',
  },
  documentMutationRequested: {
    type: 'noul',
    instructions:
      'Did the human request any mutation of accepted Document state on this Turn (propose, apply, move Points, rename)? Discussing or diagnosing a mutation is not a request.',
  },
};

export type DocumentTurnPostureState = {
  turn: string;
  dialogTitle: string | null;
  documentInContext: boolean;
  documentPointCount: number | null;
  phraseSignal: ReorganizeDetection;
  note: string;
};

export const DOCUMENT_TURN_POSTURE_STATE_NOTE =
  'Phrase signal is mention/detection only. It is not authorization and must not be treated as proof of human direction.';

export function buildDocumentTurnPostureState(params: {
  turn: string;
  dialogTitle?: string | null;
  documentInContext?: boolean;
  documentPointCount?: number | null;
}): DocumentTurnPostureState {
  return {
    turn: params.turn,
    dialogTitle: params.dialogTitle?.trim() || null,
    documentInContext: params.documentInContext === true,
    documentPointCount:
      typeof params.documentPointCount === 'number' ? params.documentPointCount : null,
    phraseSignal: detectReorganizeDetection(params.turn),
    note: DOCUMENT_TURN_POSTURE_STATE_NOTE,
  };
}

export type DocumentTurnPostureCorpusFamily = 'false_positive' | 'genuine_positive' | 'apply';

export type DocumentTurnPostureCorpusCase = {
  id: string;
  family: DocumentTurnPostureCorpusFamily;
  label: string;
  text: string;
  expectedMention: boolean;
  expectedEstablishedDirection: boolean;
};

export const DOCUMENT_TURN_POSTURE_CORPUS: DocumentTurnPostureCorpusCase[] = [
  {
    id: 'fp-same-thing',
    family: 'false_positive',
    label: 'Model and Provider are not the same thing',
    text: 'One additional distinction I think matters for the Registry: Model and Provider are not the same thing. A model may eventually be available through multiple connected providers.',
    expectedMention: true,
    expectedEstablishedDirection: false,
  },
  {
    id: 'fp-do-not-reorganize',
    family: 'false_positive',
    label: 'Do not reorganize',
    text: 'Do not reorganize, propose, apply, or modify anything in response to this Turn.',
    expectedMention: true,
    expectedEstablishedDirection: false,
  },
  {
    id: 'fp-interpret-review',
    family: 'false_positive',
    label: 'What did you interpret as requesting Review & Reorganize?',
    text: 'What user instruction did you interpret as requesting Review & Reorganize?',
    expectedMention: true,
    expectedEstablishedDirection: false,
  },
  {
    id: 'fp-nothing-changed',
    family: 'false_positive',
    label: 'Nothing changed',
    text: 'Nothing changed.',
    expectedMention: true,
    expectedEstablishedDirection: false,
  },
  {
    id: 'fp-thats-useless',
    family: 'false_positive',
    label: "That's useless",
    text: "That's useless.",
    expectedMention: true,
    expectedEstablishedDirection: false,
  },
  {
    id: 'gp-reorganize-named',
    family: 'genuine_positive',
    label: 'Reorganize Finding the Plot',
    text: 'Reorganize Finding the Plot.',
    expectedMention: true,
    expectedEstablishedDirection: true,
  },
  {
    id: 'gp-review-propose',
    family: 'genuine_positive',
    label: 'Review this Document and propose a better organization',
    text: 'Review this Document and propose a better organization.',
    expectedMention: true,
    expectedEstablishedDirection: true,
  },
  {
    id: 'apply-yes',
    family: 'apply',
    label: 'Yes, apply that reorganization',
    text: 'Yes, apply that reorganization.',
    expectedMention: true,
    expectedEstablishedDirection: false,
  },
];

export type DocumentTurnPostureParsedAnswers = {
  turnPosture: {
    choice: string | null;
    confidence: number | null;
  };
  documentReorganizationRequested: {
    noul: number | null;
  };
  documentMutationRequested: {
    noul: number | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseDocumentTurnPostureAnswers(
  answers: Record<string, unknown> | null | undefined,
): DocumentTurnPostureParsedAnswers {
  const turn = asRecord(answers?.turnPosture);
  const reorg = asRecord(answers?.documentReorganizationRequested);
  const mutation = asRecord(answers?.documentMutationRequested);
  return {
    turnPosture: {
      choice: typeof turn?.choice === 'string' ? turn.choice : null,
      confidence: typeof turn?.confidence === 'number' ? turn.confidence : null,
    },
    documentReorganizationRequested: {
      noul: typeof reorg?.noul === 'number' ? reorg.noul : null,
    },
    documentMutationRequested: {
      noul: typeof mutation?.noul === 'number' ? mutation.noul : null,
    },
  };
}

export function shouldShadowDocumentTurnPosture(detection: ReorganizeDetection): boolean {
  return detection.mention || detection.establishedDirection;
}

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../TypeSafeEvaluateService.js', () => ({
  runTypeSafeEvaluateAction: vi.fn(),
}));

import { runTypeSafeEvaluateAction } from '../TypeSafeEvaluateService.js';
import {
  buildSystemOneLeadOrientationBlock,
  buildSystemOneLeadOrientationDelivery,
  evaluateDocumentTurnPostureShadow,
  resolveHumanTurnSystemOne,
  shouldSupplySystemOneOrientationToLead,
  type DocumentTurnPostureShadowRecord,
} from './documentTurnPostureShadow.js';

const evaluate = vi.mocked(runTypeSafeEvaluateAction);

describe('evaluateDocumentTurnPostureShadow', () => {
  afterEach(() => {
    evaluate.mockReset();
  });

  it('does not call TypeSafe on an unrelated turn', async () => {
    const result = await evaluateDocumentTurnPostureShadow({
      turn: 'Hey Ceox, what is up?',
    });
    expect(result).toBeNull();
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('records Choice/Noul probabilities and stays shadow-only', async () => {
    evaluate.mockResolvedValue({
      ok: true,
      model: 'jev-latest',
      answers: {
        turnPosture: { type: 'choice', choice: 'diagnose', confidence: 0.88 },
        documentReorganizationRequested: { type: 'noul', noul: 0.03 },
        documentMutationRequested: { type: 'noul', noul: 0.02 },
      },
      formatted: 'turnPosture: diagnose',
    });

    const result = await evaluateDocumentTurnPostureShadow({
      turn: 'Do not reorganize, propose, apply, or modify anything in response to this Turn.',
      dialogTitle: 'Finding the Plot',
      documentInContext: true,
      documentPointCount: 141,
    });

    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(result?.ok).toBe(true);
    expect(result?.executed).toBe(false);
    expect(result?.authorized).toBe(false);
    expect(result?.parsed.turnPosture.choice).toBe('diagnose');
    expect(result?.parsed.turnPosture.confidence).toBe(0.88);
    expect(result?.parsed.documentReorganizationRequested.noul).toBe(0.03);
    expect(result?.invocation.state.phraseSignal.establishedDirection).toBe(false);
  });
});

describe('System One Lead orientation V0', () => {
  const successfulShadow = {
    source: 'typesafe_shadow',
    executed: false,
    authorized: false,
    model: 'jev-1.13.0',
    ok: true,
    invocation: {
      url: 'https://api.typesafe.ai/v1/systemone',
      model: 'jev-latest',
      questions: {
        turnPosture: {
          type: 'choice',
          instructions: 'What is the human doing on this Turn?',
          criteria: {},
        },
        documentReorganizationRequested: {
          type: 'noul',
          instructions: 'Did the human request a Document reorganization?',
        },
        documentMutationRequested: {
          type: 'noul',
          instructions: 'Did the human request a Document mutation?',
        },
      },
      state: {
        turn: 'Do not reorganize Finding the Plot.',
        dialogTitle: 'Finding the Plot',
        documentInContext: true,
        documentPointCount: 141,
        phraseSignal: {
          signal: 'mentioned',
          mention: true,
          establishedDirection: false,
          matched: ['reorganize named document'],
          blockedReason: 'negation',
        },
        note: 'Phrase signal is mention/detection only.',
      },
    },
    answers: {
      turnPosture: {
        type: 'choice',
        choice: 'diagnose',
        confidence: 0.58,
        probabilities: { diagnose: 0.65, explore: 0.13, question: 0.08 },
      },
      documentReorganizationRequested: { type: 'noul', noul: 0.05 },
      documentMutationRequested: { type: 'noul', noul: 0.08 },
    },
    parsed: {
      turnPosture: { choice: 'diagnose', confidence: 0.58 },
      documentReorganizationRequested: { noul: 0.05 },
      documentMutationRequested: { noul: 0.08 },
    },
  } as unknown as DocumentTurnPostureShadowRecord;

  it('does not supply orientation to Cast consults or ephemeral runs', () => {
    expect(shouldSupplySystemOneOrientationToLead({ ephemeral: true, input: 'hello' })).toBe(false);
    expect(
      shouldSupplySystemOneOrientationToLead({
        input: '[Director delegation — Ceox on the Build board]\nThe user addressed Ceox.',
      }),
    ).toBe(false);
    expect(shouldSupplySystemOneOrientationToLead({ input: 'Cast, talk this through with me.' })).toBe(
      true,
    );
  });

  it('quotes actual Jev primitives and forbids fabrication', () => {
    const block = buildSystemOneLeadOrientationBlock(successfulShadow);
    expect(block).toContain('[System One orientation — Lead only]');
    expect(block).toContain('not the script');
    expect(block).toContain('not authorization');
    expect(block).toContain('Cast members have not seen this block');
    expect(block).toContain('Available: yes');
    expect(block).toContain('WAS returned for this Turn');
    expect(block).not.toContain('No System One result was available to me for this Turn.');
    expect(block).toContain('Model: jev-1.13.0');
    expect(block).toContain('choice: diagnose');
    expect(block).toContain('confidence: 0.58');
    expect(block).toContain('diagnose 0.65');
    expect(block).toContain('noul: 0.05');
    expect(block).toContain('noul: 0.08');
    expect(block).not.toContain('authorize an action unless');
    const delivery = buildSystemOneLeadOrientationDelivery(successfulShadow, true);
    expect(delivery.audience).toBe('lead');
    expect(delivery.suppliedToLead).toBe(true);
    expect(delivery.suppliedToCast).toBe(false);
    expect(delivery.available).toBe(true);
    expect(delivery.eligible).toBe(true);
  });

  it('says unavailable when TypeSafe did not return answers', () => {
    const failed: DocumentTurnPostureShadowRecord = {
      ...successfulShadow,
      ok: false,
      errorCode: 'MISSING_API_KEY',
      message: 'TypeSafe key is not configured',
      answers: null,
    };
    const block = buildSystemOneLeadOrientationBlock(failed);
    expect(block).toContain('Available: no');
    expect(block).toContain('Reason: MISSING_API_KEY');
    expect(block).toContain('No System One result was available to me for this Turn.');
    expect(buildSystemOneLeadOrientationBlock(null)).toBeNull();
    const delivery = buildSystemOneLeadOrientationDelivery(failed, true);
    expect(delivery.available).toBe(false);
    expect(delivery.suppliedToLead).toBe(true);
    expect(delivery.errorCode).toBe('MISSING_API_KEY');
  });
});

describe('Human Turn System One binding', () => {
  afterEach(() => {
    evaluate.mockReset();
  });

  it('evaluates Jev once for a Lead Turn and reuses the same record on later Lead passes', async () => {
    evaluate.mockResolvedValue({
      ok: true,
      model: 'jev-1.13.0',
      answers: {
        turnPosture: { type: 'choice', choice: 'explore', confidence: 0.89 },
        documentReorganizationRequested: { type: 'noul', noul: 0.07 },
        documentMutationRequested: { type: 'noul', noul: 0.09 },
      },
      formatted: 'turnPosture: explore',
    });
    const humanText = 'Cast, talk this through with me. Do not reorganize Finding the Plot.';
    const first = await resolveHumanTurnSystemOne({
      input: humanText,
      evaluate: () => evaluateDocumentTurnPostureShadow({ turn: humanText }),
    });
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(first.evaluatedOnce).toBe(true);
    expect(first.delivery.suppliedToLead).toBe(true);
    expect(first.delivery.suppliedToCast).toBe(false);
    const firstBlock = buildSystemOneLeadOrientationBlock(
      first.shadow as unknown as DocumentTurnPostureShadowRecord,
    );
    expect(firstBlock).toContain('choice: explore');
    expect(firstBlock).toContain('confidence: 0.89');
    expect(firstBlock).toContain('noul: 0.07');
    expect(firstBlock).toContain('noul: 0.09');

    const later = await resolveHumanTurnSystemOne({
      input: '[Orchestration context — Kip after Cast performance]\nThe human\'s direction...',
      existing: first,
      evaluate: () => evaluateDocumentTurnPostureShadow({
        turn: '[Orchestration context — Kip after Cast performance]',
      }),
    });
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(later.shadow).toBe(first.shadow);
    expect(later.delivery).toEqual(first.delivery);
    expect(
      buildSystemOneLeadOrientationBlock(later.shadow as unknown as DocumentTurnPostureShadowRecord),
    ).toBe(firstBlock);
  });

  it('does not evaluate or supply orientation for the Cast consult in the same Turn', async () => {
    const binding = await resolveHumanTurnSystemOne({
      ephemeral: true,
      input: [
        '[Director delegation — Cloud on the Build board]',
        'The user addressed Cloud (Cast member pinned on the Build board).',
        'Kip (Lead) relayed:',
        '"Cast, talk this through with me. Do not reorganize Finding the Plot."',
      ].join('\n'),
      evaluate: () => evaluateDocumentTurnPostureShadow({
        turn: 'Cast, talk this through with me. Do not reorganize Finding the Plot.',
      }),
    });
    expect(evaluate).not.toHaveBeenCalled();
    expect(binding.evaluatedOnce).toBe(false);
    expect(binding.shadow).toBeNull();
    expect(binding.delivery.suppliedToLead).toBe(false);
    expect(binding.delivery.suppliedToCast).toBe(false);
    expect(buildSystemOneLeadOrientationBlock(null)).toBeNull();
  });
});

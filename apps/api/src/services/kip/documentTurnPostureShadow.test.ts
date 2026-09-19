import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../TypeSafeEvaluateService.js', () => ({
  runTypeSafeEvaluateAction: vi.fn(),
}));

import { runTypeSafeEvaluateAction } from '../TypeSafeEvaluateService.js';
import { evaluateDocumentTurnPostureShadow } from './documentTurnPostureShadow.js';

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

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/TypeSafeEvaluateService.js', () => ({
  runTypeSafeEvaluateAction: vi.fn(),
}));

vi.mock('../services/kip/loadDialogDocumentForAgent.js', () => ({
  loadDialogDocumentForAgent: vi.fn(),
}));

vi.mock('../services/kip/ensureDialogDocumentManuscript.js', () => ({
  ensureDialogDocumentManuscript: vi.fn(),
}));

vi.mock('../services/executeRegisteredChat.js', () => ({
  executeRegisteredChat: vi.fn(),
}));

vi.mock('../config/index.js', () => ({
  getModelCapabilities: () => ({ jsonMode: true }),
  resolveExecutionPlan: () => ({
    offering: { provider: 'openai', modelId: 'test-model' },
  }),
}));

vi.mock('../services/ModelProviderService.js', () => ({
  ModelProviderService: {
    getDefaultSettings: () => ({ model: 'test-model' }),
  },
}));

import { executeRegisteredChat } from '../services/executeRegisteredChat.js';
import { runTypeSafeEvaluateAction } from '../services/TypeSafeEvaluateService.js';
import { ensureDialogDocumentManuscript } from '../services/kip/ensureDialogDocumentManuscript.js';
import { loadDialogDocumentForAgent } from '../services/kip/loadDialogDocumentForAgent.js';
import { runPreserveDiscoveryTurn } from '../services/kip/preserveDiscoveryTurn.js';

const evaluate = vi.mocked(runTypeSafeEvaluateAction);
const loadDocument = vi.mocked(loadDialogDocumentForAgent);
const ensureManuscript = vi.mocked(ensureDialogDocumentManuscript);
const complete = vi.mocked(executeRegisteredChat);

const NEW_DISCOVERY =
  'A proposed Point is already kept by the Agency that recognized it.';
const HELD_API =
  'Railway hosts the API and the web app talks to it through the existing routes.';

function document(points: Array<Record<string, unknown>> = []) {
  return {
    dialogId: 'dialog-1',
    title: 'Becoming Together',
    titleSource: 'user_set',
    forwardAuthored: true,
    forward: { title: 'Keep what is earned', description: 'The story in progress' },
    orientation: { body: 'We are learning how Keeper keeps.' },
    paths: [],
    points,
  };
}

function jev(preserve: number, already = 0.04) {
  return {
    ok: true as const,
    model: 'jev-latest',
    answers: {
      move: {
        choice: preserve >= 0.85 ? 'PRESERVE_DISCOVERY' : 'CONTINUE',
        confidence: preserve,
        probabilities: {
          CONTINUE: preserve >= 0.85 ? 0.05 : 0.9,
          PRESERVE_DISCOVERY: preserve,
          RECONSIDER_ORIENTATION: 0.02,
          ASK_HUMAN: 0.01,
        },
      },
      alreadyRepresented: { type: 'noul', noul: already },
    },
    formatted: 'move',
  };
}

describe('preserve-discovery turn', () => {
  afterEach(() => {
    evaluate.mockReset();
    loadDocument.mockReset();
    ensureManuscript.mockReset();
    complete.mockReset();
  });

  function run(input: string, executePoint = vi.fn()) {
    return runPreserveDiscoveryTurn({
      isLead: true,
      domainId: 'domain-1',
      userId: 'user-1',
      dialogId: 'dialog-1',
      agentId: 'lead-agent',
      agentName: 'Kip',
      input,
      kipReply: 'That belongs in the story if the Document does not already hold it.',
      actionResults: [],
      executePoint,
    });
  }

  it('respects a human prohibition and does not call Jev', async () => {
    const result = await run("Don't write this down.");
    expect(result.record.reason).toBe('constrained');
    expect(result.results).toEqual([]);
    expect(evaluate).not.toHaveBeenCalled();
    expect(loadDocument).not.toHaveBeenCalled();
  });

  it('earns the first Point on an empty Document', async () => {
    loadDocument.mockResolvedValue(document() as never);
    evaluate.mockResolvedValue(jev(0.91) as never);
    complete.mockResolvedValue({
      response: {
        success: true,
        content: JSON.stringify({ survives: NEW_DISCOVERY, label: 'Agency keeps' }),
      },
    } as never);
    ensureManuscript.mockResolvedValue({ id: 'manuscript-1', created: true });
    const executePoint = vi.fn(async () => [
      {
        type: 'draft.update.propose',
        status: 'success',
        message: 'Proposed Point — tap Accept to keep it',
        data: { hostTitle: 'Becoming Together', point: { status: 'proposed', proposedBy: 'Jev' } },
      },
    ]);

    const result = await run(NEW_DISCOVERY, executePoint);

    expect(result.record.reason).toBe('satisfied');
    expect(result.record.satisfied).toBe(true);
    expect(executePoint).toHaveBeenCalledTimes(1);
    expect(executePoint).toHaveBeenCalledWith(expect.objectContaining({
      content: NEW_DISCOVERY,
      label: 'Agency keeps',
      manuscriptDraftId: 'manuscript-1',
      proposedBy: 'Jev',
    }));
    expect(result.results[0]?.message).toMatch(/Jev recommended/);
    expect(result.results[0]?.message).not.toMatch(/accept to keep/i);
    const state = evaluate.mock.calls[0]?.[0] as { payload: { state: { hasDurableResidue: boolean; held: unknown[] } } };
    expect(state.payload.state.hasDurableResidue).toBe(false);
    expect(state.payload.state.held).toEqual([]);
  });

  it('earns another Point when the Document already holds something else', async () => {
    loadDocument.mockResolvedValue(document([
      {
        id: 'p1',
        status: 'accepted',
        type: 'general',
        preview: HELD_API,
        prelude: 'Railway hosts the API',
        rewritable: false,
      },
    ]) as never);
    evaluate.mockResolvedValue(jev(0.9, 0.07) as never);
    complete.mockResolvedValue({
      response: {
        success: true,
        content: JSON.stringify({ survives: NEW_DISCOVERY, label: 'Agency keeps' }),
      },
    } as never);
    ensureManuscript.mockResolvedValue({ id: 'manuscript-1', created: false });
    const executePoint = vi.fn(async () => [
      { type: 'draft.update.propose', status: 'success', message: 'old', data: {} },
    ]);

    const result = await run(NEW_DISCOVERY, executePoint);

    expect(result.record.satisfied).toBe(true);
    expect(executePoint).toHaveBeenCalledTimes(1);
    const state = evaluate.mock.calls[0]?.[0] as {
      payload: {
        state: {
          hasDurableResidue: boolean;
          existingDurableItemRepresentsWhatWasJustFound: boolean;
          held: Array<{ title: string }>;
          direction: string;
        };
      };
    };
    expect(state.payload.state.hasDurableResidue).toBe(true);
    expect(state.payload.state.existingDurableItemRepresentsWhatWasJustFound).toBe(false);
    expect(state.payload.state.held[0]?.title).toBe('Railway hosts the API');
    expect(state.payload.state.direction).toContain('Keep what is earned');
    expect(result.results[0]?.message).not.toMatch(/accept to keep/i);
  });

  it('writes nothing when an existing Point already represents the exchange', async () => {
    loadDocument.mockResolvedValue(document([
      {
        id: 'p1',
        status: 'proposed',
        type: 'general',
        preview: NEW_DISCOVERY,
        prelude: 'Agency keeps',
        rewritable: true,
      },
    ]) as never);
    evaluate.mockResolvedValue(jev(0.97, 0.2) as never);
    const executePoint = vi.fn();

    const result = await run(NEW_DISCOVERY, executePoint);

    expect(result.record.reason).toBe('already_represented');
    expect(result.record.satisfied).toBe(false);
    expect(result.results).toEqual([]);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
    expect(executePoint).not.toHaveBeenCalled();
  });

  it('writes nothing when Jev says the Document already holds the discovery', async () => {
    loadDocument.mockResolvedValue(document([
      {
        id: 'p1',
        status: 'accepted',
        type: 'general',
        preview: HELD_API,
        prelude: 'Railway hosts the API',
        rewritable: false,
      },
    ]) as never);
    evaluate.mockResolvedValue(jev(0.93, 0.91) as never);
    const executePoint = vi.fn();

    const result = await run(
      'The hosting choice is still Railway, said a different way.',
      executePoint,
    );

    expect(result.record.reason).toBe('already_represented');
    expect(executePoint).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it('writes nothing for an ordinary exchange', async () => {
    loadDocument.mockResolvedValue(document() as never);
    evaluate.mockResolvedValue(jev(0.06, 0.03) as never);
    const executePoint = vi.fn();

    const result = await run('How is your day going?', executePoint);

    expect(result.record.reason).toBe('below_threshold');
    expect(result.results).toEqual([]);
    expect(result.notice).toBeNull();
    expect(executePoint).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
});

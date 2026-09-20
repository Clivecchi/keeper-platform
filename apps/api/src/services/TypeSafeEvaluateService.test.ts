import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/resolveProviderApiKey.js', () => ({
  resolveProviderApiKey: vi.fn(),
}));
vi.mock('../lib/resolveDomainProviderApiKey.js', () => ({
  resolveDomainProviderApiKeyWithSource: vi.fn(),
}));

import { resolveProviderApiKey } from '../lib/resolveProviderApiKey.js';
import { runTypeSafeEvaluateAction, typesafeEvaluatePromptBlock } from './TypeSafeEvaluateService.js';

const resolveKey = vi.mocked(resolveProviderApiKey);

describe('TypeSafeEvaluateService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resolveKey.mockReset();
  });

  it('teaches agents that TypeSafe is a tool, not a model', () => {
    const prompt = typesafeEvaluatePromptBlock();
    expect(prompt).toContain('typesafe.evaluate');
    expect(prompt).toContain('not an agent');
    expect(prompt).toContain('Do not set model_provider to typesafe');
    expect(prompt).toContain('Natural-language questions are valid');
    expect(prompt).toContain('"questions":["Could an unauthenticated caller list journeys across domains?"]');
  });

  it('evaluates with the Railway key and returns answers', async () => {
    resolveKey.mockResolvedValue('ts-tool-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          model: 'jev-latest',
          answers: { should_keep: { type: 'noul', noul: 0.81 } },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const outcome = await runTypeSafeEvaluateAction({
      payload: {
        state: 'Point: Stage is the room, not the story.',
        questions: {
          should_keep: { type: 'noul', instructions: 'Should this Point be kept?' },
        },
      },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.formatted).toContain('should_keep: 0.810');
      expect(outcome.model).toBe('jev-latest');
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the key and questions are missing', async () => {
    resolveKey.mockResolvedValue(null);
    const missingKey = await runTypeSafeEvaluateAction({
      payload: {
        state: 'A decision.',
        question: 'Is this clear?',
      },
    });
    expect(missingKey).toMatchObject({ ok: false, errorCode: 'MISSING_API_KEY' });

    const invalid = await runTypeSafeEvaluateAction({ payload: { state: 'A decision.' } });
    expect(invalid).toMatchObject({ ok: false, errorCode: 'INVALID_QUESTIONS' });
  });

  it('evaluates a natural-language question string array', async () => {
    resolveKey.mockResolvedValue('ts-tool-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          model: 'jev-latest',
          answers: { q1: { type: 'noul', noul: 0.74 } },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const outcome = await runTypeSafeEvaluateAction({
      payload: {
        state: 'GET /api/journeys: domainId is optional.',
        questions: ['Could an unauthenticated caller list journeys across domains?'],
      },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.formatted).toContain('q1: 0.740');
    }
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      questions: Record<string, { type: string; instructions: string }>;
    };
    expect(body.questions.q1).toMatchObject({
      type: 'noul',
      instructions: 'Could an unauthenticated caller list journeys across domains?',
    });
  });
});

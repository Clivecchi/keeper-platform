import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildJevProbeState,
  evaluationsFromTypeSafe,
  parseJevProbePayload,
  parseJevRawAnswer,
  runJevProbe,
} from './runJevProbe.js';

describe('Jev Probe core', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses Choice, Noul, and Score with confidence preserved', () => {
    expect(
      parseJevRawAnswer({
        type: 'choice',
        choice: 'yes',
        confidence: 0.88,
        probabilities: { yes: 0.9, no: 0.1 },
      }),
    ).toMatchObject({ type: 'choice', answer: 'yes', confidence: 0.88 });

    expect(parseJevRawAnswer({ type: 'noul', noul: 0.81 })).toMatchObject({
      type: 'noul',
      answer: 0.81,
    });

    expect(
      parseJevRawAnswer({ type: 'score', score: 0.64, confidence: 0.7 }),
    ).toMatchObject({ type: 'score', answer: 0.64, confidence: 0.7 });
  });

  it('accepts evidence or state and optionally wraps context', () => {
    const fromEvidence = parseJevProbePayload({
      evidence: { path: 'journeys.ts', code: 'GET /' },
      questions: {
        domainScoped: { type: 'choice', instructions: 'Domain scoped?', criteria: { yes: 'Yes', no: 'No' } },
      },
      context: { architecture: 'Domain-scoped' },
    });
    expect(fromEvidence.ok).toBe(true);
    if (fromEvidence.ok) {
      expect(fromEvidence.request.evidence).toMatchObject({ path: 'journeys.ts' });
      expect(fromEvidence.request.context).toEqual({ architecture: 'Domain-scoped' });
    }

    const fromState = parseJevProbePayload({
      state: 'Point: Stage is the room.',
      question: 'Should this Point be kept?',
    });
    expect(fromState.ok).toBe(true);

    expect(parseJevProbePayload({ questions: { q1: { type: 'noul', instructions: 'Ready?' } } })).toMatchObject({
      ok: false,
      errorCode: 'INVALID_QUESTIONS',
    });

    expect(buildJevProbeState({ code: 'x' }, { architecture: 'y' })).toEqual({
      context: { architecture: 'y' },
      evidence: { code: 'x' },
    });
  });

  it('returns parsed evaluations from TypeSafe answers', () => {
    const evaluations = evaluationsFromTypeSafe(
      {
        domainScoped: { type: 'choice', choice: 'yes', confidence: 0.91 },
        ready: { type: 'noul', noul: 0.4 },
      },
      {
        domainScoped: { type: 'choice', instructions: 'Domain scoped?', criteria: { yes: 'Yes', no: 'No' } },
        ready: { type: 'noul', instructions: 'Ready?' },
      },
    );
    expect(evaluations).toHaveLength(2);
    expect(evaluations[0]).toMatchObject({
      questionId: 'domainScoped',
      answer: 'yes',
      confidence: 0.91,
    });
    expect(evaluations[1]).toMatchObject({ questionId: 'ready', answer: 0.4 });
  });

  it('runs one TypeSafe call over evidence and returns evaluations', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          model: 'jev-latest',
          answers: {
            domainScoped: { type: 'choice', choice: 'yes', confidence: 0.93 },
          },
          usage: { input_tokens: 12, output_tokens: 0, total_tokens: 12 },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const outcome = await runJevProbe({
      evidence: { path: 'apps/api/src/api/journeys.ts', code: 'GET / requires domainId or keeperId.' },
      context: { architecture: 'Domain-scoped' },
      questions: {
        domainScoped: {
          type: 'choice',
          instructions: 'Does this list require Domain scope?',
          criteria: { yes: 'Requires Domain', no: 'Unscoped', unclear: 'Cannot tell' },
        },
      },
      apiKey: 'ts-test-key',
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.evaluations[0]).toMatchObject({
        questionId: 'domainScoped',
        answer: 'yes',
        confidence: 0.93,
      });
      expect(outcome.usage?.input_tokens).toBe(12);
    }
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.state).toEqual({
      context: { architecture: 'Domain-scoped' },
      evidence: { path: 'apps/api/src/api/journeys.ts', code: 'GET / requires domainId or keeperId.' },
    });
  });

  it('fails closed without a key', async () => {
    const outcome = await runJevProbe({
      evidence: 'a route',
      questions: { q1: { type: 'noul', instructions: 'Ready?' } },
      apiKey: null,
    });
    expect(outcome).toMatchObject({ ok: false, errorCode: 'MISSING_API_KEY' });
  });
});

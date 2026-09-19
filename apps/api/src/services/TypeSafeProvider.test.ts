import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  conversationToState,
  parseTypeSafeEvaluatePayload,
  resolveTypeSafeRequest,
  TypeSafeProvider,
} from './TypeSafeProvider.js';

describe('TypeSafeProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('joins conversation into state and uses default decision questions', () => {
    const request = resolveTypeSafeRequest(
      [
        { role: 'system', content: 'You are Kip.' },
        { role: 'user', content: 'Should we keep this Point?' },
      ],
      { model: 'jev-latest' },
    );
    expect(String(request.state)).toContain('Should we keep this Point?');
    expect(request.questions.kind?.type).toBe('choice');
    expect(request.questions.is_clear?.type).toBe('noul');
  });

  it('accepts a JSON System One payload on the last user message', () => {
    const request = resolveTypeSafeRequest(
      [
        {
          role: 'user',
          content: JSON.stringify({
            state: 'Help, payouts failed',
            questions: {
              is_urgent: { type: 'noul', instructions: 'Does this convey urgency?' },
            },
          }),
        },
      ],
      { model: 'jev-1.13.0' },
    );
    expect(request.state).toBe('Help, payouts failed');
    expect(request.questions.is_urgent?.type).toBe('noul');
  });

  it('posts to systemone and returns formatted answers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          model: 'jev-1.13.0',
          answers: {
            is_urgent: { type: 'noul', noul: 0.92 },
          },
          usage: { input_tokens: 12, output_tokens: 3 },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await TypeSafeProvider.callModel(
      [{ role: 'user', content: 'Help, payouts failed' }],
      { model: 'jev-latest' },
      'ts-test-key',
    );

    expect(result.success).toBe(true);
    expect(result.content).toContain('is_urgent: 0.920');
    expect(result.model).toBe('jev-1.13.0');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer ts-test-key' });
  });

  it('conversationToState skips empty messages', () => {
    expect(conversationToState([{ role: 'user', content: '  ' }])).toBe('');
  });

  it('parses a questions map and a shorthand question', () => {
    const mapped = parseTypeSafeEvaluatePayload({
      state: 'Point: Stage is the room.',
      questions: { should_keep: { type: 'noul', instructions: 'Keep this Point?' } },
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.request.questions.should_keep?.type).toBe('noul');
    }

    const short = parseTypeSafeEvaluatePayload({
      state: 'Point: Stage is the room.',
      question: 'Is this ready to keep?',
      type: 'noul',
    });
    expect(short.ok).toBe(true);
    if (short.ok) {
      expect(short.request.questions.q1?.type).toBe('noul');
    }

    expect(parseTypeSafeEvaluatePayload({ questions: {} }).ok).toBe(false);
  });
});

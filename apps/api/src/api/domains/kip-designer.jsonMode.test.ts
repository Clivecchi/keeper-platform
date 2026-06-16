import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getModelCapabilities } from '../../config/index.js';
import { generateFrameSliceWithTogether } from '../../services/structure/togetherFrameSlice.js';

describe('structure Together frame generation', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"frame_title":"Test"}' } }] }),
    });
    process.env.TOGETHER_API_KEY = 'together-test-key-abcdefghijklmnopqrstuvwxyz';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TOGETHER_API_KEY;
  });

  it('marks Meta-Llama-3.1-8B-Instruct-Turbo as jsonMode capable', () => {
    const caps = getModelCapabilities('together-ai', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo');
    expect(caps.jsonMode).toBe(true);
  });

  it('always sends response_format with schema from structure service', async () => {
    const schema = { type: 'object', properties: { frame_title: { type: 'string' } } };
    await generateFrameSliceWithTogether({
      systemPrompt: 'author frame json',
      userPrompt: 'produce cover frame',
      jsonSchema: schema,
    });

    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent.response_format).toEqual({ type: 'json_object', schema });
  });
});

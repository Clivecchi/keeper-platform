import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getModelCapabilities } from '../../config/index.js';

describe('kip-designer Together JSON gating', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not send response_format when together-ai default jsonMode is false', async () => {
    const caps = getModelCapabilities('together-ai', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo');
    expect(caps.jsonMode).toBe(false);

    const body: Record<string, unknown> = {
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      messages: [{ role: 'user', content: 'test' }],
    };
    if (caps.jsonMode) {
      body.response_format = { type: 'json_object', schema: {} };
    }

    await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent.response_format).toBeUndefined();
  });
});

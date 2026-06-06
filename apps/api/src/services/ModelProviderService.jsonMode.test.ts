import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();

vi.mock('openai', () => ({
  OpenAI: class {
    chat = {
      completions: {
        create: createMock,
      },
    };
  },
}));

import { ModelProviderService } from './ModelProviderService.js';
import { getSettingsForModel } from '../config/modelCatalog.js';

describe('ModelProviderService jsonMode gating', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
      model: 'test-model',
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    process.env.OPENAI_API_KEY = 'sk-test-key-abcdefghijklmnopqrstuvwxyz';
    process.env.STABILIZE_MODE = '1';
  });

  async function callOpenAI(model: string, jsonMode = true) {
    return ModelProviderService.callModel({
      messages: [{ role: 'user', content: 'hi' }],
      settings: getSettingsForModel('openai', model),
      provider: 'openai',
      jsonMode,
    });
  }

  it('does not send response_format for gpt-4 when jsonMode is requested', async () => {
    await callOpenAI('gpt-4');
    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.response_format).toBeUndefined();
  });

  it('does not send response_format for gpt-3.5-turbo when jsonMode is requested', async () => {
    await callOpenAI('gpt-3.5-turbo');
    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.response_format).toBeUndefined();
  });

  it('sends response_format for gpt-4o when jsonMode is requested', async () => {
    await callOpenAI('gpt-4o');
    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.response_format).toEqual({ type: 'json_object' });
  });
});

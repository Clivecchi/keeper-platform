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

describe('ModelProviderService together-ai', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'Hello from Llama' } }],
      model: 'meta-llama/Llama-3-8b-chat-hf',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    process.env.TOGETHER_API_KEY = 'together-test-key-abcdefghijklmnopqrstuvwxyz';
    process.env.STABILIZE_MODE = '1';
  });

  it('calls Together AI chat completions with OpenAI-compatible client', async () => {
    const model = 'meta-llama/Llama-3-8b-chat-hf';
    const result = await ModelProviderService.callModel({
      messages: [{ role: 'user', content: 'Say hi' }],
      settings: getSettingsForModel('together-ai', model),
      provider: 'together-ai',
    });

    expect(result.success).toBe(true);
    expect(result.content).toBe('Hello from Llama');
    expect(createMock).toHaveBeenCalledTimes(1);

    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe(model);
    expect(params.stream).toBe(false);
    expect(params.response_format).toBeUndefined();
  });

  it('does not send response_format when jsonMode is requested but capability map has jsonMode false', async () => {
    const model = 'meta-llama/Llama-2-70b-chat-hf';
    await ModelProviderService.callModel({
      messages: [{ role: 'user', content: 'hi' }],
      settings: getSettingsForModel('together-ai', model),
      provider: 'together-ai',
      jsonMode: true,
    });

    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.response_format).toBeUndefined();
  });
});

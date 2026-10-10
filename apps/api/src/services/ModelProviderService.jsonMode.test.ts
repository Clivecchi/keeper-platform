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

  it('redirects gpt-4 onto GPT-6.1 Sol, which can take json mode', async () => {
    await callOpenAI('gpt-4');
    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('gpt-6.1-sol');
    expect(params.response_format).toEqual({ type: 'json_object' });
  });

  it('redirects gpt-3.5-turbo onto GPT-6 Luna', async () => {
    await callOpenAI('gpt-3.5-turbo');
    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('gpt-6-luna');
    expect(params.response_format).toEqual({ type: 'json_object' });
  });

  it('redirects a stored gpt-4o call onto GPT-6.1 Sol chat params', async () => {
    await callOpenAI('gpt-4o');
    const params = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params.model).toBe('gpt-6.1-sol');
    expect(params.max_tokens).toBeUndefined();
    expect(params.temperature).toBeUndefined();
    expect(params.max_completion_tokens).toBe(16_000);
    expect(params.reasoning_effort).toBe('low');
    expect(params.response_format).toEqual({ type: 'json_object' });
  });

  it('reads text parts when OpenAI returns content as an array', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: [{ type: 'text', text: 'hello' }] }, finish_reason: 'stop' }],
      model: 'gpt-6-luna',
    });
    const result = await callOpenAI('gpt-6-luna', false);
    expect(result.success).toBe(true);
    expect(result.content).toBe('hello');
  });

  it('does not retry an empty OpenAI completion', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: null, refusal: null }, finish_reason: 'stop' }],
      model: 'gpt-6-luna',
    });
    const result = await callOpenAI('gpt-6-luna', false);
    expect(result.success).toBe(false);
    expect(result.retries_used).toBe(0);
    expect(result.error).toContain('No response content from OpenAI');
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

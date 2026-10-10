import { describe, expect, it } from 'vitest';
import { buildOpenAIChatParams, getModelCapabilities, modelAcceptsTemperature } from './modelCapabilities.js';

describe('getModelCapabilities', () => {
  it('returns exact entry for a known OpenAI model', () => {
    const caps = getModelCapabilities('openai', 'gpt-4o');
    expect(caps.jsonMode).toBe(true);
    expect(caps.vision).toBe(true);
    expect(caps.maxContextTokens).toBe(128_000);
  });

  it('returns provider default for unknown model in known provider', () => {
    const caps = getModelCapabilities('openai', 'gpt-unknown-future');
    expect(caps.jsonMode).toBe(false);
    expect(caps.functionCalling).toBe(true);
    expect(caps.maxContextTokens).toBe(8192);
  });

  it('returns safe default for unknown provider', () => {
    const caps = getModelCapabilities('unknown-provider', 'any-model');
    expect(caps).toEqual({
      jsonMode: false,
      functionCalling: false,
      vision: false,
      streaming: true,
      maxContextTokens: 4096,
      maxOutputTokens: 1024,
    });
  });

  it('marks gpt-4 and gpt-3.5-turbo as non-jsonMode', () => {
    expect(getModelCapabilities('openai', 'gpt-4').jsonMode).toBe(false);
    expect(getModelCapabilities('openai', 'gpt-3.5-turbo').jsonMode).toBe(false);
  });

  it('marks TypeSafe Jev as jsonMode without streaming', () => {
    expect(getModelCapabilities('typesafe', 'jev-latest').jsonMode).toBe(true);
    expect(getModelCapabilities('typesafe', 'jev-latest').streaming).toBe(false);
  });

  it('marks all Anthropic models as non-jsonMode', () => {
    expect(getModelCapabilities('anthropic', 'claude-sonnet-5').jsonMode).toBe(false);
    expect(getModelCapabilities('anthropic', 'claude-sonnet-4-6').jsonMode).toBe(false);
    expect(getModelCapabilities('anthropic', 'claude-3-5-sonnet-20241022').jsonMode).toBe(false);
  });

  it('omits sampling temperature for Claude Sonnet 5 and keeps it for Sonnet 4.6', () => {
    expect(modelAcceptsTemperature('anthropic', 'claude-sonnet-5')).toBe(false);
    expect(modelAcceptsTemperature('anthropic', 'claude-sonnet-4-6')).toBe(true);
    expect(modelAcceptsTemperature('openai', 'gpt-4o')).toBe(true);
    expect(modelAcceptsTemperature('openai', 'gpt-6.1-sol')).toBe(false);
  });

  it('builds a GPT-6.1 Sol request without classic sampling or max_tokens', () => {
    const params = buildOpenAIChatParams({
      model: 'gpt-6.1-sol',
      messages: [],
      sampling: { temperature: 0.7, max_tokens: 2000, top_p: 1, frequency_penalty: 0, presence_penalty: 0 },
      jsonMode: true,
    });
    expect(params.model).toBe('gpt-6.1-sol');
    expect(params.max_tokens).toBeUndefined();
    expect(params.temperature).toBeUndefined();
    expect(params.max_completion_tokens).toBe(16_000);
    expect(params.reasoning_effort).toBe('low');
    expect(params.response_format).toEqual({ type: 'json_object' });
  });

  it('lets GPT-6 Luna answer without reasoning', () => {
    const params = buildOpenAIChatParams({
      model: 'gpt-6-luna',
      messages: [],
      sampling: { max_tokens: 2000, temperature: 0.2 },
    });
    expect(params.reasoning_effort).toBe('none');
    expect(params.max_completion_tokens).toBe(2000);
    expect(params.temperature).toBeUndefined();
  });

  it('defaults together-ai to conservative capabilities', () => {
    const caps = getModelCapabilities('together-ai', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo');
    expect(caps.jsonMode).toBe(true);
  });
});

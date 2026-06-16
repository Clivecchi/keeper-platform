import { describe, expect, it } from 'vitest';
import { getModelCapabilities } from './modelCapabilities.js';

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

  it('marks all Anthropic models as non-jsonMode', () => {
    expect(getModelCapabilities('anthropic', 'claude-sonnet-4-6').jsonMode).toBe(false);
    expect(getModelCapabilities('anthropic', 'claude-3-5-sonnet-20241022').jsonMode).toBe(false);
  });

  it('defaults together-ai to conservative capabilities', () => {
    const caps = getModelCapabilities('together-ai', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo');
    expect(caps.jsonMode).toBe(true);
  });
});

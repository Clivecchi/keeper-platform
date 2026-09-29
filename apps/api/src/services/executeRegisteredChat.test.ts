import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeRegisteredChat } from './executeRegisteredChat.js';
import { ModelProviderService } from './ModelProviderService.js';

function failResponse(model: string, errorCode: 'INVALID_MODEL' | 'TIMEOUT') {
  return {
    success: false as const,
    content: '',
    model,
    provider: 'anthropic' as const,
    error: errorCode === 'INVALID_MODEL' ? 'model: not found' : 'timed out',
    retries_used: 0,
    execution_time_ms: 1,
    errorCode,
    retryable: false,
  };
}

function okResponse(model: string) {
  return {
    success: true as const,
    content: 'hello',
    model,
    provider: 'anthropic' as const,
    retries_used: 0,
    execution_time_ms: 1,
  };
}

describe('executeRegisteredChat', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the preferred offering when it succeeds', async () => {
    const spy = vi
      .spyOn(ModelProviderService, 'callModel')
      .mockResolvedValue(okResponse('claude-sonnet-4-6'));

    const result = await executeRegisteredChat({
      preference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        source: 'agent_preference',
      },
      messages: [{ role: 'user', content: 'hi' }],
      settings: { model: 'claude-sonnet-4-6', temperature: 0.7, max_tokens: 400 },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.usedOffering.modelId).toBe('claude-sonnet-4-6');
    expect(result.fallbackUsed).toBe(false);
    expect(result.record.attempts).toHaveLength(1);
    expect(result.record.offeringId).toBe('anthropic:claude-sonnet-4-6');
  });

  it('tries the sibling offering after a genuine INVALID_MODEL and records both attempts', async () => {
    const spy = vi
      .spyOn(ModelProviderService, 'callModel')
      .mockResolvedValueOnce(failResponse('claude-sonnet-4-6', 'INVALID_MODEL'))
      .mockResolvedValueOnce(okResponse('claude-sonnet-5'));

    const result = await executeRegisteredChat({
      preference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        source: 'companion_frame',
      },
      messages: [{ role: 'user', content: 'hi' }],
      settings: { model: 'claude-sonnet-4-6', temperature: 0.7, max_tokens: 400 },
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]?.[0].settings.model).toBe('claude-sonnet-5');
    expect(result.fallbackUsed).toBe(true);
    expect(result.usedOffering.modelId).toBe('claude-sonnet-5');
    expect(result.response.success).toBe(true);
    expect(result.record.attempts.map((row) => row.outcome)).toEqual(['failed', 'succeeded']);
    expect(result.record.preferenceModel).toBe('claude-sonnet-4-6');
  });

  it('does not fall back on timeout', async () => {
    const spy = vi
      .spyOn(ModelProviderService, 'callModel')
      .mockResolvedValue(failResponse('claude-sonnet-4-6', 'TIMEOUT'));

    const result = await executeRegisteredChat({
      preference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        source: 'agent_preference',
      },
      messages: [{ role: 'user', content: 'hi' }],
      settings: { model: 'claude-sonnet-4-6' },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.fallbackUsed).toBe(false);
    expect(result.response.success).toBe(false);
  });

  it('keeps the original failure when the sibling also fails', async () => {
    vi.spyOn(ModelProviderService, 'callModel')
      .mockResolvedValueOnce(failResponse('claude-sonnet-4-6', 'INVALID_MODEL'))
      .mockResolvedValueOnce(failResponse('claude-sonnet-5', 'INVALID_MODEL'));

    const result = await executeRegisteredChat({
      preference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        source: 'agent_preference',
      },
      messages: [{ role: 'user', content: 'hi' }],
      settings: { model: 'claude-sonnet-4-6' },
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.response.model).toBe('claude-sonnet-4-6');
    expect(result.record.attempts).toHaveLength(2);
  });

  it('does not try a sibling when fallback policy is none', async () => {
    const spy = vi
      .spyOn(ModelProviderService, 'callModel')
      .mockResolvedValue(failResponse('claude-sonnet-4-6', 'INVALID_MODEL'));

    const result = await executeRegisteredChat({
      preference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        source: 'agent_preference',
      },
      messages: [{ role: 'user', content: 'hi' }],
      settings: { model: 'claude-sonnet-4-6' },
      fallbackPolicy: 'none',
      purpose: 'rendr_expression',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.fallbackUsed).toBe(false);
    expect(result.usedOffering.modelId).toBe('claude-sonnet-4-6');
    expect(result.record.fallbackPolicy).toBe('none');
    expect(result.record.purpose).toBe('rendr_expression');
    expect(result.record.executionMode).toBe('production');
  });

  it('stated selection calls the given provider and model and does not substitute', async () => {
    const spy = vi.spyOn(ModelProviderService, 'callModel').mockResolvedValue({
      ...okResponse('eleven_multilingual_v2'),
      provider: 'elevenlabs',
      usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
      execution_time_ms: 12,
      keySource: 'env',
    });

    const result = await executeRegisteredChat({
      preference: {
        provider: 'elevenlabs',
        model: 'eleven_multilingual_v2',
        source: 'agent_preference',
      },
      messages: [{ role: 'user', content: 'hi' }],
      settings: { model: 'eleven_multilingual_v2', temperature: 0.3, max_tokens: 400 },
      offeringSelection: 'stated',
      fallbackPolicy: 'none',
      purpose: 'library_perspective',
      executionMode: 'shadow',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0].provider).toBe('elevenlabs');
    expect(spy.mock.calls[0]?.[0].settings.model).toBe('eleven_multilingual_v2');
    expect(result.plan.substitutedFrom).toBe('elevenlabs');
    expect(result.usedOffering.provider).toBe('elevenlabs');
    expect(result.record.substitutedFrom).toBeNull();
    expect(result.record.executionMode).toBe('shadow');
    expect(result.record.usage).toEqual({
      promptTokens: 3,
      completionTokens: 1,
      totalTokens: 4,
    });
    expect(result.record.latencyMs).toBe(12);
    expect(result.record.keySource).toBe('env');
  });
});

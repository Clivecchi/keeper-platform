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
});

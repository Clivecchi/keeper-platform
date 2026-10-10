import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHAT_OFFERING,
  offeringIdFor,
  resolveExecutionPlan,
  siblingOfferingOf,
} from './modelRegistry.js';

describe('resolveExecutionPlan', () => {
  it('resolves an exact Anthropic Sonnet 4.6 preference with Sonnet 5 sibling', () => {
    const plan = resolveExecutionPlan({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      source: 'agent_preference',
    });
    expect(plan.offering.modelId).toBe('claude-sonnet-4-6');
    expect(plan.offering.provider).toBe('anthropic');
    expect(plan.fallbackOffering?.modelId).toBe('claude-sonnet-5');
    expect(plan.resolvedFrom).toBe('exact_offering');
    expect(plan.substitutedFrom).toBeNull();
  });

  it('resolves Sonnet 5 with 4.6 as the sibling fallback', () => {
    const plan = resolveExecutionPlan({
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      source: 'companion_frame',
    });
    expect(plan.offering.offeringId).toBe(offeringIdFor('anthropic', 'claude-sonnet-5'));
    expect(plan.fallbackOffering?.offeringId).toBe(offeringIdFor('anthropic', 'claude-sonnet-4-6'));
  });

  it('does not use TypeSafe as a chat offering', () => {
    const plan = resolveExecutionPlan({
      provider: 'typesafe',
      model: 'jev-latest',
      source: 'agent_preference',
    });
    expect(plan.offering.offeringId).toBe(DEFAULT_CHAT_OFFERING.offeringId);
    expect(plan.substitutedFrom).toBe('typesafe');
    expect(plan.fallbackOffering?.modelId).toBe('claude-sonnet-4-6');
  });

  it('resolves companion frame model by identity when provider is omitted', () => {
    const plan = resolveExecutionPlan({
      model: 'claude-sonnet-4-6',
      source: 'companion_frame',
    });
    expect(plan.offering.provider).toBe('anthropic');
    expect(plan.offering.modelId).toBe('claude-sonnet-4-6');
    expect(plan.resolvedFrom).toBe('model_identity');
  });

  it('passes through an unknown model on a chat provider without inventing a sibling', () => {
    const plan = resolveExecutionPlan({
      provider: 'anthropic',
      model: 'claude-custom-lab',
      source: 'agent_preference',
    });
    expect(plan.offering.modelId).toBe('claude-custom-lab');
    expect(plan.offering.provider).toBe('anthropic');
    expect(plan.fallbackOffering).toBeNull();
    expect(plan.resolvedFrom).toBe('passthrough');
  });

  it('defaults Together chat to the pinned Llama 3.3 offering', () => {
    const plan = resolveExecutionPlan({
      provider: 'together-ai',
      source: 'agent_preference',
    });
    expect(plan.offering.modelId).toBe('meta-llama/Llama-3.3-70B-Instruct-Turbo');
    expect(plan.offering.provider).toBe('together-ai');
    expect(plan.resolvedFrom).toBe('provider_default');
  });

  it('redirects a stored gpt-4o preference onto GPT-6.1 Sol', () => {
    const plan = resolveExecutionPlan({
      provider: 'openai',
      model: 'gpt-4o',
      source: 'agent_preference',
    });
    expect(plan.offering.modelId).toBe('gpt-6.1-sol');
    expect(plan.offering.provider).toBe('openai');
    expect(plan.fallbackOffering?.modelId).toBe('gpt-6-luna');
    expect(plan.substitutedFrom).toBe('gpt-4o');
    expect(plan.resolvedFrom).toBe('legacy_redirect');
  });

  it('redirects gpt-4o-mini onto GPT-6 Luna', () => {
    const plan = resolveExecutionPlan({
      provider: 'openai',
      model: 'gpt-4o-mini',
      source: 'agent_preference',
    });
    expect(plan.offering.modelId).toBe('gpt-6-luna');
    expect(plan.fallbackOffering?.modelId).toBe('gpt-6.1-sol');
    expect(plan.substitutedFrom).toBe('gpt-4o-mini');
  });

  it('uses the registry default chat offering when preference is empty', () => {
    const plan = resolveExecutionPlan({ source: 'default' });
    expect(plan.offering.offeringId).toBe(DEFAULT_CHAT_OFFERING.offeringId);
    expect(siblingOfferingOf(plan.offering)?.modelId).toBe('claude-sonnet-4-6');
  });
});

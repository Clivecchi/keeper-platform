/**
 * Shared chat execution: Registry plan → existing ModelProviderService adapter.
 * Member Agent turns, guest companion, and preserve-discovery prose enter here.
 * Rendr, library perspective, and Designer state their model and skip sibling fallback.
 *
 * executionMode is recorded only. It does not select a model or write Keeper state.
 */

import type { ModelProvider, ModelSettings } from '@keeper/database';
import {
  executionRecordFromPlan,
  resolveExecutionPlan,
  type ExecutionAttempt,
  type ExecutionCaller,
  type ExecutionFallbackPolicy,
  type ExecutionKeySource,
  type ExecutionMode,
  type ExecutionOfferingSelection,
  type ExecutionPlan,
  type ExecutionPreference,
  type ExecutionPurpose,
  type ExecutionRecord,
  type ExecutionUsageSnapshot,
  type ProviderOffering,
  type RecordedOffering,
} from '../config/modelRegistry.js';
import {
  ModelProviderService,
  type ModelMessage,
  type ModelResponse,
} from './ModelProviderService.js';
import { retiredOpenAIChatReplacement } from '@keeper/shared';
import { shouldFallbackToSiblingOffering } from './modelProviderErrors.js';

export type RegisteredChatResult = {
  response: ModelResponse;
  plan: ExecutionPlan;
  usedOffering: RecordedOffering;
  fallbackUsed: boolean;
  record: ExecutionRecord;
};

type ChatExecutionContext = {
  executionMode: ExecutionMode;
  purpose: ExecutionPurpose | null;
  caller: ExecutionCaller | null;
  fallbackPolicy: ExecutionFallbackPolicy;
  offeringSelection: ExecutionOfferingSelection;
  requestedCapabilities: string[];
};

function isExecutionMode(value: string): value is ExecutionMode {
  return value === 'production' || value === 'shadow' || value === 'evaluation';
}

function statedOffering(preference: ExecutionPreference): {
  offering: RecordedOffering;
  substitutedFrom: string | null;
} | null {
  const provider = typeof preference.provider === 'string' ? preference.provider.trim() : '';
  const modelId = typeof preference.model === 'string' ? preference.model.trim() : '';
  if (!provider || !modelId) return null;
  const replacement = provider === 'openai' ? retiredOpenAIChatReplacement(modelId) : null;
  const model = replacement ?? modelId;
  return {
    offering: {
      offeringId: `${provider}:${model}`,
      provider,
      modelId: model,
    },
    substitutedFrom: replacement ? modelId : null,
  };
}

function attemptFromResponse(offering: RecordedOffering, response: ModelResponse): ExecutionAttempt {
  if (response.success) {
    return {
      offeringId: offering.offeringId,
      provider: offering.provider,
      model: offering.modelId,
      outcome: 'succeeded',
    };
  }
  return {
    offeringId: offering.offeringId,
    provider: offering.provider,
    model: offering.modelId,
    outcome: 'failed',
    ...(response.errorCode ? { errorCode: response.errorCode } : {}),
    ...(response.error ? { message: response.error } : {}),
  };
}

function usageFromResponse(response: ModelResponse): ExecutionUsageSnapshot | null {
  if (!response.usage) return null;
  return {
    promptTokens: response.usage.prompt_tokens ?? null,
    completionTokens: response.usage.completion_tokens ?? null,
    totalTokens: response.usage.total_tokens ?? null,
  };
}

function keySourceFromResponse(response: ModelResponse): ExecutionKeySource | null {
  const source = response.keySource;
  if (source === 'env' || source === 'user' || source === 'platform' || source === 'none') {
    return source;
  }
  return null;
}

function logExecutionPlan(params: {
  plan: ExecutionPlan;
  executed: RecordedOffering;
  context: ChatExecutionContext;
  fallbackUsed: boolean;
  attempts: ExecutionAttempt[];
  bothFailed?: boolean;
}): void {
  console.info('[ExecutionPlan]', {
    source: params.plan.preference.source,
    preferenceProvider: params.plan.preference.provider ?? null,
    preferenceModel: params.plan.preference.model ?? null,
    substitutedFrom: params.plan.substitutedFrom,
    resolvedFrom: params.plan.resolvedFrom,
    preferredOfferingId: params.plan.offering.offeringId,
    fallbackOfferingId: params.plan.fallbackOffering?.offeringId ?? null,
    executedOfferingId: params.executed.offeringId,
    offeringSelection: params.context.offeringSelection,
    fallbackPolicy: params.context.fallbackPolicy,
    executionMode: params.context.executionMode,
    purpose: params.context.purpose,
    caller: params.context.caller?.slug ?? params.context.caller?.id ?? null,
    fallbackUsed: params.fallbackUsed,
    bothFailed: params.bothFailed === true,
    attempts: params.attempts,
  });
}

function recordFor(params: {
  plan: ExecutionPlan;
  usedOffering: RecordedOffering;
  fallbackUsed: boolean;
  attempts: ExecutionAttempt[];
  response: ModelResponse;
  context: ChatExecutionContext;
  statedSubstitution?: string | null;
}): ExecutionRecord {
  return executionRecordFromPlan({
    plan: params.plan,
    usedOffering: params.usedOffering,
    fallbackUsed: params.fallbackUsed,
    attempts: params.attempts,
    executionMode: params.context.executionMode,
    purpose: params.context.purpose,
    caller: params.context.caller,
    fallbackPolicy: params.context.fallbackPolicy,
    offeringSelection: params.context.offeringSelection,
    requestedCapabilities: params.context.requestedCapabilities,
    usage: usageFromResponse(params.response),
    latencyMs: params.response.execution_time_ms ?? null,
    keySource: keySourceFromResponse(params.response),
    substitutedFrom: params.context.offeringSelection === 'stated'
      ? (params.statedSubstitution ?? null)
      : undefined,
  });
}

export async function executeRegisteredChat(params: {
  preference: ExecutionPreference;
  messages: ModelMessage[];
  settings: ModelSettings;
  userId?: string;
  domainId?: string;
  environment?: Record<string, unknown> | null;
  jsonMode?: boolean;
  onDelta?: (chunk: string) => void;
  executionMode?: ExecutionMode;
  purpose?: ExecutionPurpose | null;
  caller?: ExecutionCaller | null;
  fallbackPolicy?: ExecutionFallbackPolicy;
  offeringSelection?: ExecutionOfferingSelection;
  requestedCapabilities?: string[];
}): Promise<RegisteredChatResult> {
  const context: ChatExecutionContext = {
    executionMode: params.executionMode && isExecutionMode(params.executionMode)
      ? params.executionMode
      : 'production',
    purpose: params.purpose ?? null,
    caller: params.caller ?? null,
    fallbackPolicy: params.fallbackPolicy ?? 'sibling_on_invalid_model',
    offeringSelection: params.offeringSelection ?? 'plan',
    requestedCapabilities: params.requestedCapabilities ?? [],
  };

  const plan = resolveExecutionPlan(params.preference);
  const statedResult = context.offeringSelection === 'stated' ? statedOffering(params.preference) : null;
  const stated = statedResult?.offering ?? null;
  const primary: RecordedOffering | ProviderOffering = stated ?? plan.offering;
  const sibling = stated || context.fallbackPolicy === 'none' ? null : plan.fallbackOffering;
  const attempts: ExecutionAttempt[] = [];

  const first = await ModelProviderService.callModel({
    messages: params.messages,
    settings: { ...params.settings, model: primary.modelId },
    provider: primary.provider as ModelProvider,
    userId: params.userId,
    domainId: params.domainId,
    environment: params.environment,
    jsonMode: params.jsonMode,
    onDelta: params.onDelta,
  });
  attempts.push(attemptFromResponse(primary, first));

  if (first.success) {
    logExecutionPlan({ plan, executed: primary, context, fallbackUsed: false, attempts });
    return {
      response: first,
      plan,
      usedOffering: primary,
      fallbackUsed: false,
      record: recordFor({
        plan,
        usedOffering: primary,
        fallbackUsed: false,
        attempts,
        response: first,
        context,
        statedSubstitution: statedResult?.substitutedFrom,
      }),
    };
  }

  const canFallback =
    sibling != null
    && shouldFallbackToSiblingOffering({
      errorCode: first.errorCode,
      providerStatus: first.providerStatus,
      message: first.error,
    });

  if (!sibling || !canFallback) {
    logExecutionPlan({ plan, executed: primary, context, fallbackUsed: false, attempts });
    return {
      response: first,
      plan,
      usedOffering: primary,
      fallbackUsed: false,
      record: recordFor({
        plan,
        usedOffering: primary,
        fallbackUsed: false,
        attempts,
        response: first,
        context,
        statedSubstitution: statedResult?.substitutedFrom,
      }),
    };
  }

  console.warn('[ExecutionPlan] preferred offering failed; trying sibling', {
    preferred: primary.offeringId,
    fallback: sibling.offeringId,
    errorCode: first.errorCode ?? null,
    providerStatus: first.providerStatus ?? null,
  });

  const second = await ModelProviderService.callModel({
    messages: params.messages,
    settings: { ...params.settings, model: sibling.modelId },
    provider: sibling.provider,
    userId: params.userId,
    domainId: params.domainId,
    environment: params.environment,
    jsonMode: params.jsonMode,
    onDelta: params.onDelta,
  });
  attempts.push(attemptFromResponse(sibling, second));

  if (second.success) {
    logExecutionPlan({ plan, executed: sibling, context, fallbackUsed: true, attempts });
    return {
      response: second,
      plan,
      usedOffering: sibling,
      fallbackUsed: true,
      record: recordFor({
        plan,
        usedOffering: sibling,
        fallbackUsed: true,
        attempts,
        response: second,
        context,
        statedSubstitution: statedResult?.substitutedFrom,
      }),
    };
  }

  logExecutionPlan({ plan, executed: primary, context, fallbackUsed: true, attempts, bothFailed: true });
  return {
    response: first,
    plan,
    usedOffering: primary,
    fallbackUsed: true,
    record: recordFor({
      plan,
      usedOffering: primary,
      fallbackUsed: true,
      attempts,
      response: first,
      context,
      statedSubstitution: statedResult?.substitutedFrom,
    }),
  };
}

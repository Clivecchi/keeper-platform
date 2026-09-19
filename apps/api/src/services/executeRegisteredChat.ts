/**
 * Shared chat execution: Registry plan → existing ModelProviderService adapter.
 * Member Agent turns and guest companion both enter here.
 */

import type { ModelSettings } from '@keeper/database';
import {
  executionRecordFromPlan,
  resolveExecutionPlan,
  type ExecutionAttempt,
  type ExecutionPlan,
  type ExecutionPreference,
  type ExecutionRecord,
  type ProviderOffering,
} from '../config/modelRegistry.js';
import {
  ModelProviderService,
  type ModelMessage,
  type ModelResponse,
} from './ModelProviderService.js';
import { shouldFallbackToSiblingOffering } from './modelProviderErrors.js';

export type RegisteredChatResult = {
  response: ModelResponse;
  plan: ExecutionPlan;
  usedOffering: ProviderOffering;
  fallbackUsed: boolean;
  record: ExecutionRecord;
};

function attemptFromResponse(offering: ProviderOffering, response: ModelResponse): ExecutionAttempt {
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

function logExecutionPlan(params: {
  plan: ExecutionPlan;
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
    fallbackUsed: params.fallbackUsed,
    bothFailed: params.bothFailed === true,
    attempts: params.attempts,
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
}): Promise<RegisteredChatResult> {
  const plan = resolveExecutionPlan(params.preference);
  const attempts: ExecutionAttempt[] = [];

  const first = await ModelProviderService.callModel({
    messages: params.messages,
    settings: { ...params.settings, model: plan.offering.modelId },
    provider: plan.offering.provider,
    userId: params.userId,
    domainId: params.domainId,
    environment: params.environment,
    jsonMode: params.jsonMode,
    onDelta: params.onDelta,
  });
  attempts.push(attemptFromResponse(plan.offering, first));

  if (first.success) {
    logExecutionPlan({ plan, fallbackUsed: false, attempts });
    return {
      response: first,
      plan,
      usedOffering: plan.offering,
      fallbackUsed: false,
      record: executionRecordFromPlan({
        plan,
        usedOffering: plan.offering,
        fallbackUsed: false,
        attempts,
      }),
    };
  }

  const sibling = plan.fallbackOffering;
  const canFallback =
    sibling != null
    && shouldFallbackToSiblingOffering({
      errorCode: first.errorCode,
      providerStatus: first.providerStatus,
    });

  if (!sibling || !canFallback) {
    logExecutionPlan({ plan, fallbackUsed: false, attempts });
    return {
      response: first,
      plan,
      usedOffering: plan.offering,
      fallbackUsed: false,
      record: executionRecordFromPlan({
        plan,
        usedOffering: plan.offering,
        fallbackUsed: false,
        attempts,
      }),
    };
  }

  console.warn('[ExecutionPlan] preferred offering failed; trying sibling', {
    preferred: plan.offering.offeringId,
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
    logExecutionPlan({ plan, fallbackUsed: true, attempts });
    return {
      response: second,
      plan,
      usedOffering: sibling,
      fallbackUsed: true,
      record: executionRecordFromPlan({
        plan,
        usedOffering: sibling,
        fallbackUsed: true,
        attempts,
      }),
    };
  }

  logExecutionPlan({ plan, fallbackUsed: true, attempts, bothFailed: true });
  return {
    response: first,
    plan,
    usedOffering: plan.offering,
    fallbackUsed: true,
    record: executionRecordFromPlan({
      plan,
      usedOffering: plan.offering,
      fallbackUsed: true,
      attempts,
    }),
  };
}

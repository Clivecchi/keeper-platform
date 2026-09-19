/**
 * In-code Model Registry (V0).
 *
 * Model Identity ≠ Provider Offering.
 * Agents keep identity; stored model fields are execution preferences.
 * Live discovery / pricing / Prisma tables are out of scope for V0.
 */

import type { ChatModelProvider, ModelProvider } from '@keeper/database';

const CHAT_PROVIDERS: readonly ChatModelProvider[] = ['openai', 'anthropic', 'together-ai'];

function isChatProvider(provider: string): provider is ChatModelProvider {
  return (CHAT_PROVIDERS as readonly string[]).includes(provider);
}

export type ModelKind = 'chat' | 'image' | 'audio' | 'evaluate';

export type ModelIdentity = {
  id: string;
  label: string;
  kind: ModelKind;
};

export type ProviderOffering = {
  offeringId: string;
  provider: ChatModelProvider;
  modelId: string;
  modelIdentityId: string;
  siblingOfferingId: string | null;
};

export type ExecutionPreferenceSource = 'agent_preference' | 'companion_frame' | 'default';

export type ExecutionPreference = {
  provider?: string | null;
  model?: string | null;
  source: ExecutionPreferenceSource;
};

export type ExecutionAttemptOutcome = 'succeeded' | 'failed';

export type ExecutionAttempt = {
  offeringId: string;
  provider: string;
  model: string;
  outcome: ExecutionAttemptOutcome;
  errorCode?: string;
  message?: string;
};

export type ExecutionPlan = {
  offering: ProviderOffering;
  fallbackOffering: ProviderOffering | null;
  preference: ExecutionPreference;
  /** Non-chat preference (typesafe / elevenlabs) was replaced with a chat offering. */
  substitutedFrom: string | null;
  resolvedFrom: 'exact_offering' | 'model_identity' | 'provider_default' | 'passthrough' | 'registry_default';
};

export function offeringIdFor(provider: string, modelId: string): string {
  return `${provider}:${modelId}`;
}

export const MODEL_IDENTITIES: ModelIdentity[] = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', kind: 'chat' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', kind: 'chat' },
  { id: 'gpt-4o', label: 'GPT-4o', kind: 'chat' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', kind: 'chat' },
];

const SONNET_5_OFFERING: ProviderOffering = {
  offeringId: offeringIdFor('anthropic', 'claude-sonnet-5'),
  provider: 'anthropic',
  modelId: 'claude-sonnet-5',
  modelIdentityId: 'claude-sonnet-5',
  siblingOfferingId: offeringIdFor('anthropic', 'claude-sonnet-4-6'),
};

const SONNET_46_OFFERING: ProviderOffering = {
  offeringId: offeringIdFor('anthropic', 'claude-sonnet-4-6'),
  provider: 'anthropic',
  modelId: 'claude-sonnet-4-6',
  modelIdentityId: 'claude-sonnet-4-6',
  siblingOfferingId: offeringIdFor('anthropic', 'claude-sonnet-5'),
};

const GPT_4O_OFFERING: ProviderOffering = {
  offeringId: offeringIdFor('openai', 'gpt-4o'),
  provider: 'openai',
  modelId: 'gpt-4o',
  modelIdentityId: 'gpt-4o',
  siblingOfferingId: null,
};

const GPT_4O_MINI_OFFERING: ProviderOffering = {
  offeringId: offeringIdFor('openai', 'gpt-4o-mini'),
  provider: 'openai',
  modelId: 'gpt-4o-mini',
  modelIdentityId: 'gpt-4o-mini',
  siblingOfferingId: null,
};

export const PROVIDER_OFFERINGS: ProviderOffering[] = [
  SONNET_5_OFFERING,
  SONNET_46_OFFERING,
  GPT_4O_OFFERING,
  GPT_4O_MINI_OFFERING,
];

const OFFERING_BY_ID = new Map(PROVIDER_OFFERINGS.map((row) => [row.offeringId, row]));

export const DEFAULT_CHAT_OFFERING = SONNET_5_OFFERING;

const DEFAULT_OFFERING_BY_PROVIDER: Record<ChatModelProvider, ProviderOffering> = {
  anthropic: SONNET_5_OFFERING,
  openai: GPT_4O_OFFERING,
  'together-ai': {
    offeringId: offeringIdFor('together-ai', 'meta-llama/Llama-2-70b-chat-hf'),
    provider: 'together-ai',
    modelId: 'meta-llama/Llama-2-70b-chat-hf',
    modelIdentityId: 'meta-llama/Llama-2-70b-chat-hf',
    siblingOfferingId: null,
  },
};

export function findOfferingById(offeringId: string): ProviderOffering | null {
  return OFFERING_BY_ID.get(offeringId) ?? null;
}

export function findOffering(provider: string, modelId: string): ProviderOffering | null {
  return findOfferingById(offeringIdFor(provider, modelId));
}

export function siblingOfferingOf(offering: ProviderOffering): ProviderOffering | null {
  if (!offering.siblingOfferingId) return null;
  return findOfferingById(offering.siblingOfferingId);
}

function passthroughOffering(provider: ChatModelProvider, modelId: string): ProviderOffering {
  return {
    offeringId: offeringIdFor(provider, modelId),
    provider,
    modelId,
    modelIdentityId: modelId,
    siblingOfferingId: null,
  };
}

function findByModelIdentity(modelId: string): ProviderOffering[] {
  return PROVIDER_OFFERINGS.filter(
    (row) => row.modelId === modelId || row.modelIdentityId === modelId,
  );
}

/**
 * Resolve a chat execution plan from an Agent or companion preference.
 * TypeSafe / ElevenLabs preferences are not chat offerings — they substitute the default chat offering.
 */
export function resolveExecutionPlan(preference: ExecutionPreference): ExecutionPlan {
  const rawProvider = typeof preference.provider === 'string' ? preference.provider.trim() : '';
  const model = typeof preference.model === 'string' ? preference.model.trim() : '';

  if (rawProvider && !isChatProvider(rawProvider)) {
    return {
      offering: DEFAULT_CHAT_OFFERING,
      fallbackOffering: siblingOfferingOf(DEFAULT_CHAT_OFFERING),
      preference,
      substitutedFrom: rawProvider,
      resolvedFrom: 'registry_default',
    };
  }

  const provider = rawProvider && isChatProvider(rawProvider) ? rawProvider : null;

  if (provider && model) {
    const exact = findOffering(provider, model);
    if (exact) {
      return {
        offering: exact,
        fallbackOffering: siblingOfferingOf(exact),
        preference,
        substitutedFrom: null,
        resolvedFrom: 'exact_offering',
      };
    }
  }

  if (model) {
    const byIdentity = findByModelIdentity(model);
    if (byIdentity.length === 1) {
      const exact = byIdentity[0];
      return {
        offering: exact,
        fallbackOffering: siblingOfferingOf(exact),
        preference,
        substitutedFrom: null,
        resolvedFrom: 'model_identity',
      };
    }
    if (byIdentity.length > 1) {
      const preferred = (provider && byIdentity.find((row) => row.provider === provider)) || byIdentity[0];
      return {
        offering: preferred,
        fallbackOffering: siblingOfferingOf(preferred),
        preference,
        substitutedFrom: null,
        resolvedFrom: 'model_identity',
      };
    }
  }

  if (provider) {
    if (model) {
      const adHoc = passthroughOffering(provider, model);
      return {
        offering: adHoc,
        fallbackOffering: null,
        preference,
        substitutedFrom: null,
        resolvedFrom: 'passthrough',
      };
    }
    const def = DEFAULT_OFFERING_BY_PROVIDER[provider];
    return {
      offering: def,
      fallbackOffering: siblingOfferingOf(def),
      preference,
      substitutedFrom: null,
      resolvedFrom: 'provider_default',
    };
  }

  return {
    offering: DEFAULT_CHAT_OFFERING,
    fallbackOffering: siblingOfferingOf(DEFAULT_CHAT_OFFERING),
    preference,
    substitutedFrom: null,
    resolvedFrom: 'registry_default',
  };
}

export type ExecutionRecord = {
  offeringId: string;
  provider: ModelProvider | ChatModelProvider | string;
  model: string;
  fallbackUsed: boolean;
  preferenceProvider: string | null;
  preferenceModel: string | null;
  substitutedFrom: string | null;
  attempts: ExecutionAttempt[];
};

export function executionRecordFromPlan(params: {
  plan: ExecutionPlan;
  usedOffering: ProviderOffering;
  fallbackUsed: boolean;
  attempts: ExecutionAttempt[];
}): ExecutionRecord {
  return {
    offeringId: params.usedOffering.offeringId,
    provider: params.usedOffering.provider,
    model: params.usedOffering.modelId,
    fallbackUsed: params.fallbackUsed,
    preferenceProvider: params.plan.preference.provider?.trim() || null,
    preferenceModel: params.plan.preference.model?.trim() || null,
    substitutedFrom: params.plan.substitutedFrom,
    attempts: params.attempts,
  };
}

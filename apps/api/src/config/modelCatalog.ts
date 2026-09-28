/**
 * Settings and image models for the provider catalog.
 *
 * Agent chat choices live in `@keeper/shared` `agentModelPicker`. Edit that
 * list to offer a new chat model. This file adds ModelSettings and Together
 * image models (FLUX), which are not agent chat choices.
 *
 * Together's live model API is cached on the Together integration for
 * discovery. It is not the agent menu — that catalog is too large and moves
 * too often to drop into a select.
 */

import type { ModelProvider, ModelSettings } from '@keeper/database';
import { AGENT_CHAT_DEFAULTS, AGENT_CHAT_MODELS } from '@keeper/shared';

const RETRY_CONFIG = Object.freeze({
  max_retries: 3,
  retry_delay_ms: 1000,
});

export type ModelCapability = 'text' | 'vision' | 'audio' | 'image';

export type ModelCatalogEntry = {
  id: string;
  label: string;
  provider: ModelProvider;
  defaultSettings?: Partial<ModelSettings>;
  capabilities?: ModelCapability[];
};

const OPENAI_CHAT_SETTINGS = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1.0,
  frequency_penalty: 0,
  presence_penalty: 0,
};

const OPENAI_MODELS: ModelCatalogEntry[] = AGENT_CHAT_MODELS
  .filter((model) => model.provider === 'openai')
  .map((model) => ({
    id: model.id,
    label: model.label,
    provider: 'openai' as const,
    capabilities: ['text', 'vision'] as ModelCapability[],
    defaultSettings: OPENAI_CHAT_SETTINGS,
  }));

const ANTHROPIC_MODELS: ModelCatalogEntry[] = AGENT_CHAT_MODELS
  .filter((model) => model.provider === 'anthropic')
  .map((model) => ({
    id: model.id,
    label: model.label,
    provider: 'anthropic' as const,
    capabilities: ['text', 'vision'] as ModelCapability[],
    defaultSettings: { temperature: 0.7, max_tokens: 4000 },
  }));

const TOGETHER_CHAT_MODELS: ModelCatalogEntry[] = AGENT_CHAT_MODELS
  .filter((model) => model.provider === 'together-ai')
  .map((model) => ({
    id: model.id,
    label: model.label,
    provider: 'together-ai' as const,
    capabilities: ['text'] as ModelCapability[],
    defaultSettings: { temperature: 0.7, max_tokens: 2000 },
  }));

/** Image generation only. Not offered as an agent chat model. */
const TOGETHER_IMAGE_MODELS: ModelCatalogEntry[] = [
  { id: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX Schnell', provider: 'together-ai', capabilities: ['image'] },
  { id: 'black-forest-labs/FLUX.1-dev', label: 'FLUX Dev', provider: 'together-ai', capabilities: ['image'] },
];

const TOGETHER_MODELS: ModelCatalogEntry[] = [
  ...TOGETHER_CHAT_MODELS,
  ...TOGETHER_IMAGE_MODELS,
];

const ELEVENLABS_MODELS: ModelCatalogEntry[] = [
  { id: 'eleven_monolingual_v1', label: 'Monolingual v1', provider: 'elevenlabs', capabilities: ['audio'], defaultSettings: { temperature: 0.5, max_tokens: 1000 } },
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2', provider: 'elevenlabs', capabilities: ['audio'], defaultSettings: { temperature: 0.5, max_tokens: 1000 } },
  { id: 'eleven_turbo_v2', label: 'Turbo v2', provider: 'elevenlabs', capabilities: ['audio'], defaultSettings: { temperature: 0.5, max_tokens: 1000 } },
];

const TYPESAFE_MODELS: ModelCatalogEntry[] = [
  { id: 'jev-latest', label: 'Jev (latest)', provider: 'typesafe', capabilities: ['text'], defaultSettings: { temperature: 0, max_tokens: 1024 } },
  { id: 'jev-1.13.0', label: 'Jev 1.13', provider: 'typesafe', capabilities: ['text'], defaultSettings: { temperature: 0, max_tokens: 1024 } },
  { id: 'jev-preview', label: 'Jev (preview)', provider: 'typesafe', capabilities: ['text'], defaultSettings: { temperature: 0, max_tokens: 1024 } },
];

export const MODEL_CATALOG: Record<ModelProvider, ModelCatalogEntry[]> = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  'together-ai': TOGETHER_MODELS,
  elevenlabs: ELEVENLABS_MODELS,
  typesafe: TYPESAFE_MODELS,
};

export const DEFAULT_MODEL_BY_PROVIDER: Record<ModelProvider, string> = {
  openai: AGENT_CHAT_DEFAULTS.openai,
  anthropic: AGENT_CHAT_DEFAULTS.anthropic,
  'together-ai': AGENT_CHAT_DEFAULTS['together-ai'],
  elevenlabs: 'eleven_multilingual_v2',
  typesafe: 'jev-latest',
};

export const PROVIDERS: ModelProvider[] = ['openai', 'anthropic', 'together-ai', 'elevenlabs', 'typesafe'];

/**
 * Build default ModelSettings for a provider (used when no model is specified)
 */
export function getDefaultSettingsForProvider(provider: ModelProvider): ModelSettings {
  const defaultModel = DEFAULT_MODEL_BY_PROVIDER[provider];
  const entry = MODEL_CATALOG[provider]?.find((m) => m.id === defaultModel);
  const base: ModelSettings = {
    model: defaultModel,
    temperature: 0.7,
    max_tokens: 2000,
    retry: { ...RETRY_CONFIG },
  };
  if (entry?.defaultSettings) {
    return { ...base, ...entry.defaultSettings, model: defaultModel };
  }
  if (provider === 'anthropic') {
    base.max_tokens = 4000;
  }
  if (provider === 'elevenlabs') {
    base.temperature = 0.5;
    base.max_tokens = 1000;
  }
  return base;
}

/**
 * Build ModelSettings for a specific model ID
 */
export function getSettingsForModel(provider: ModelProvider, modelId: string): ModelSettings {
  const entry = MODEL_CATALOG[provider]?.find((m) => m.id === modelId);
  const base: ModelSettings = {
    model: modelId,
    temperature: 0.7,
    max_tokens: 2000,
    retry: { ...RETRY_CONFIG },
  };
  if (entry?.defaultSettings) {
    return { ...base, ...entry.defaultSettings, model: modelId };
  }
  if (provider === 'anthropic') {
    base.max_tokens = 4000;
  }
  if (provider === 'elevenlabs') {
    base.temperature = 0.5;
    base.max_tokens = 1000;
  }
  return base;
}

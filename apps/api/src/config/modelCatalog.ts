/**
 * Model Catalog
 * =============
 *
 * Single source of truth for available AI models per provider.
 * Add new models by editing this file — no code changes elsewhere required.
 */

import type { ModelProvider, ModelSettings } from '@keeper/database';

const RETRY_CONFIG = Object.freeze({
  max_retries: 3,
  retry_delay_ms: 1000,
});

export type ModelCapability = 'text' | 'vision' | 'audio';

export type ModelCatalogEntry = {
  id: string;
  label: string;
  provider: ModelProvider;
  defaultSettings?: Partial<ModelSettings>;
  capabilities?: ModelCapability[];
};

const OPENAI_MODELS: ModelCatalogEntry[] = [
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 2000, top_p: 1.0, frequency_penalty: 0, presence_penalty: 0 } },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 2000, top_p: 1.0, frequency_penalty: 0, presence_penalty: 0 } },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 2000, top_p: 1.0, frequency_penalty: 0, presence_penalty: 0 } },
  { id: 'gpt-4', label: 'GPT-4', provider: 'openai', capabilities: ['text'], defaultSettings: { temperature: 0.7, max_tokens: 2000, top_p: 1.0, frequency_penalty: 0, presence_penalty: 0 } },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai', capabilities: ['text'], defaultSettings: { temperature: 0.7, max_tokens: 2000, top_p: 1.0, frequency_penalty: 0, presence_penalty: 0 } },
];

const ANTHROPIC_MODELS: ModelCatalogEntry[] = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (recommended for Kip)', provider: 'anthropic', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 4000 } },
  { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'anthropic', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 4000 } },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'anthropic', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 4000 } },
  { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'anthropic', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 4000 } },
  { id: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', provider: 'anthropic', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 4000 } },
  { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', provider: 'anthropic', capabilities: ['text', 'vision'], defaultSettings: { temperature: 0.7, max_tokens: 4000 } },
];

const TOGETHER_MODELS: ModelCatalogEntry[] = [
  { id: 'meta-llama/Llama-2-70b-chat-hf', label: 'Llama 2 70B', provider: 'together', capabilities: ['text'], defaultSettings: { temperature: 0.7, max_tokens: 2000 } },
  { id: 'meta-llama/Llama-2-13b-chat-hf', label: 'Llama 2 13B', provider: 'together', capabilities: ['text'], defaultSettings: { temperature: 0.7, max_tokens: 2000 } },
  { id: 'meta-llama/Llama-2-7b-chat-hf', label: 'Llama 2 7B', provider: 'together', capabilities: ['text'], defaultSettings: { temperature: 0.7, max_tokens: 2000 } },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B', provider: 'together', capabilities: ['text'], defaultSettings: { temperature: 0.7, max_tokens: 2000 } },
];

const ELEVENLABS_MODELS: ModelCatalogEntry[] = [
  { id: 'eleven_monolingual_v1', label: 'Monolingual v1', provider: 'elevenlabs', capabilities: ['audio'], defaultSettings: { temperature: 0.5, max_tokens: 1000 } },
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2', provider: 'elevenlabs', capabilities: ['audio'], defaultSettings: { temperature: 0.5, max_tokens: 1000 } },
  { id: 'eleven_turbo_v2', label: 'Turbo v2', provider: 'elevenlabs', capabilities: ['audio'], defaultSettings: { temperature: 0.5, max_tokens: 1000 } },
];

export const MODEL_CATALOG: Record<ModelProvider, ModelCatalogEntry[]> = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  together: TOGETHER_MODELS,
  elevenlabs: ELEVENLABS_MODELS,
};

export const DEFAULT_MODEL_BY_PROVIDER: Record<ModelProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  together: 'meta-llama/Llama-2-70b-chat-hf',
  elevenlabs: 'eleven_multilingual_v2',
};

export const PROVIDERS: ModelProvider[] = ['openai', 'anthropic', 'together', 'elevenlabs'];

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

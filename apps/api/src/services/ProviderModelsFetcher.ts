/**
 * Provider Models Fetcher
 * =======================
 *
 * Fetches available models from provider APIs (OpenAI, Anthropic) server-side.
 * Uses stored API keys (env + platform DB). Results cached for 1 hour.
 */

import type { ModelProvider } from '@keeper/database';
import { PlatformApiKeyService } from './PlatformApiKeyService.js';
import {
  MODEL_CATALOG,
  DEFAULT_MODEL_BY_PROVIDER,
  type ModelCatalogEntry,
} from '../config/modelCatalog.js';

export type NormalizedModel = {
  id: string;
  displayName: string;
  provider: ModelProvider;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<
  ModelProvider,
  { models: NormalizedModel[]; expiresAt: number }
>();

function getApiKey(provider: ModelProvider): Promise<string | null> {
  if (provider === 'openai') {
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) return Promise.resolve(envKey);
  }
  if (provider === 'anthropic') {
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) return Promise.resolve(envKey);
  }
  return PlatformApiKeyService.getKeyForProvider(provider);
}

async function fetchOpenAIModels(apiKey: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`OpenAI models API: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data?: Array<{ id: string }> };
  const data = json?.data ?? [];
  return data.map((m) => ({
    id: m.id,
    displayName: m.id.replace(/^gpt-/, 'GPT-').replace(/-/g, ' '),
    provider: 'openai' as ModelProvider,
  }));
}

async function fetchAnthropicModels(apiKey: string): Promise<NormalizedModel[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!res.ok) {
    throw new Error(`Anthropic models API: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ id: string; display_name?: string }>;
  };
  const data = json?.data ?? [];
  return data.map((m) => ({
    id: m.id,
    displayName: m.display_name ?? m.id.replace(/^claude-/, 'Claude ').replace(/-/g, ' '),
    provider: 'anthropic' as ModelProvider,
  }));
}

/**
 * Fetch models from provider API. Falls back to static catalog on failure.
 * Results are cached for 1 hour per provider.
 */
export async function fetchProviderModels(
  provider: ModelProvider
): Promise<NormalizedModel[]> {
  const cached = cache.get(provider);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.models;
  }

  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    return getStaticModels(provider);
  }

  try {
    let models: NormalizedModel[];
    if (provider === 'openai') {
      models = await fetchOpenAIModels(apiKey);
    } else if (provider === 'anthropic') {
      models = await fetchAnthropicModels(apiKey);
    } else {
      return getStaticModels(provider);
    }

    cache.set(provider, { models, expiresAt: Date.now() + CACHE_TTL_MS });
    return models;
  } catch (err) {
    console.warn(`[ProviderModelsFetcher] ${provider} fetch failed, using static catalog:`, err);
    return getStaticModels(provider);
  }
}

function getStaticModels(provider: ModelProvider): NormalizedModel[] {
  const entries: ModelCatalogEntry[] = MODEL_CATALOG[provider] ?? [];
  return entries.map((e) => ({
    id: e.id,
    displayName: e.label,
    provider,
  }));
}

export function getDefaultModelForProvider(provider: ModelProvider): string {
  return DEFAULT_MODEL_BY_PROVIDER[provider] ?? '';
}

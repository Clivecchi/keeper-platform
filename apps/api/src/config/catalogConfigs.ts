/**
 * Connected Gateway catalog configs — one entry per provider/service.
 * Add a new gateway by defining a CatalogFetcherConfig here; catalogFetcher.ts stays unchanged.
 */

import type { CatalogFetcherConfig, CatalogItem } from '../lib/catalogFetcher.js';
import { MODEL_CATALOG } from './modelCatalog.js';

/** Conversational / text-generation model types from Together AI (excludes image, embedding, etc.). */
const TOGETHER_AGENT_MODEL_TYPES = new Set(['language', 'chat', 'code']);

type TogetherModelObject = {
  id?: string;
  type?: string;
  display_name?: string;
  context_length?: number;
  organization?: string;
  license?: string;
  link?: string;
  pricing?: Record<string, unknown>;
  created?: number;
  object?: string;
  [key: string]: unknown;
};

export function togetherAIFallbackModels(): CatalogItem[] {
  return (MODEL_CATALOG['together-ai'] ?? []).map((entry) => ({
    id: entry.id,
    label: entry.label,
    type: entry.capabilities?.includes('image') ? 'image' : 'language',
    metadata: {
      capabilities: entry.capabilities,
      defaultSettings: entry.defaultSettings,
      provider: entry.provider,
    },
  }));
}

function transformTogetherModels(raw: unknown): CatalogItem[] {
  const models = Array.isArray(raw) ? (raw as TogetherModelObject[]) : [];
  return models
    .filter((m) => typeof m.id === 'string' && m.id.trim().length > 0)
    .map((m) => ({
      id: m.id!.trim(),
      label: typeof m.display_name === 'string' && m.display_name.trim()
        ? m.display_name.trim()
        : m.id!.trim(),
      type: typeof m.type === 'string' ? m.type : 'unknown',
      metadata: { ...m },
    }));
}

export const togetherAICatalogConfig: CatalogFetcherConfig = {
  endpoint: 'https://api.together.xyz/v1/models',
  authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  transform: transformTogetherModels,
  filter: (item) => TOGETHER_AGENT_MODEL_TYPES.has(item.type),
  fallback: togetherAIFallbackModels,
};

/** Registry of catalog configs keyed by integration service slug. */
export const CATALOG_CONFIG_BY_SERVICE: Record<string, CatalogFetcherConfig> = {
  'together-ai': togetherAICatalogConfig,
};

export function getCatalogConfigForService(service: string): CatalogFetcherConfig | null {
  return CATALOG_CONFIG_BY_SERVICE[service] ?? null;
}

/**
 * Connected Gateway metadata helpers — cache read/write and model API mapping.
 */

import { prisma } from '@keeper/database';
import type { ModelProvider } from '@keeper/database';
import type { CatalogFetchResult, CatalogItem } from './catalogFetcher.js';
import {
  MODEL_CATALOG,
  type ModelCatalogEntry,
} from '../config/modelCatalog.js';

export type GatewayCatalogMetadata = {
  items: CatalogItem[];
  fetchedAt: string;
  source: 'live' | 'fallback';
};

export type GatewayHealthMetadata = {
  api: 'connected' | 'error' | 'unknown';
  lastChecked: string;
  errorMessage?: string;
};

export type GatewayIntegrationMetadata = {
  catalog?: GatewayCatalogMetadata;
  health?: GatewayHealthMetadata;
  [key: string]: unknown;
};

export type ResolvedCatalogModel = {
  id: string;
  label: string;
  provider: string;
  source: 'live' | 'fallback';
  capabilities?: string[];
  defaultSettings?: ModelCatalogEntry['defaultSettings'];
};

export function buildGatewayMetadata(catalogResult: CatalogFetchResult): GatewayIntegrationMetadata {
  return {
    catalog: {
      items: catalogResult.items,
      fetchedAt: catalogResult.fetchedAt,
      source: catalogResult.source,
    },
    health: {
      api: catalogResult.ok ? 'connected' : 'error',
      lastChecked: new Date().toISOString(),
      ...(catalogResult.error ? { errorMessage: catalogResult.error } : {}),
    },
  };
}

export function parseGatewayMetadata(metadata: unknown): GatewayIntegrationMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  return metadata as GatewayIntegrationMetadata;
}

export async function findConnectedPlatformIntegration(service: string) {
  return prisma.integration.findFirst({
    where: {
      service,
      tier: 'platform',
      domainId: null,
      userId: null,
      status: 'connected',
    },
  });
}

export async function getCachedCatalogForService(
  service: string,
): Promise<{ items: CatalogItem[]; source: 'live' | 'fallback' } | null> {
  const integration = await findConnectedPlatformIntegration(service);
  if (!integration) return null;

  const meta = parseGatewayMetadata(integration.metadata);
  const items = meta?.catalog?.items;
  if (!Array.isArray(items) || items.length === 0) return null;

  return {
    items,
    source: meta.catalog?.source ?? 'fallback',
  };
}

function staticEntryCapabilities(entry: ModelCatalogEntry): string[] | undefined {
  return entry.capabilities;
}

export function staticCatalogModels(provider: ModelProvider): ResolvedCatalogModel[] {
  const entries = MODEL_CATALOG[provider] ?? [];
  return entries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    provider,
    source: 'fallback' as const,
    capabilities: staticEntryCapabilities(entry),
    defaultSettings: entry.defaultSettings,
  }));
}

function catalogItemCapabilities(item: CatalogItem): string[] | undefined {
  const raw = item.metadata?.capabilities;
  if (Array.isArray(raw) && raw.every((v) => typeof v === 'string')) {
    return raw as string[];
  }
  if (item.type === 'image') return ['image'];
  if (['language', 'chat', 'code'].includes(item.type)) return ['text'];
  return undefined;
}

export function catalogItemsToModels(
  items: CatalogItem[],
  provider: ModelProvider,
  source: 'live' | 'fallback',
): ResolvedCatalogModel[] {
  return items.map((item) => {
    const staticEntry = MODEL_CATALOG[provider]?.find((m) => m.id === item.id);
    return {
      id: item.id,
      label: item.label,
      provider,
      source,
      capabilities: catalogItemCapabilities(item) ?? staticEntry?.capabilities,
      defaultSettings: staticEntry?.defaultSettings,
    };
  });
}

export async function resolveModelsForProvider(
  provider: ModelProvider,
): Promise<ResolvedCatalogModel[]> {
  const cached = await getCachedCatalogForService(provider);
  if (cached) {
    return catalogItemsToModels(cached.items, provider, cached.source);
  }
  return staticCatalogModels(provider);
}

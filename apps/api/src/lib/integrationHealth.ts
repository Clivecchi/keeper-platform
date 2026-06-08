/**
 * Per-layer integration health stored in Integration.metadata.health (C1).
 */

export type LayerStatus = 'live' | 'degraded' | 'inactive';

export type LayerHealthEntry = {
  status: LayerStatus;
  last_checked: string;
};

export type IntegrationLayerHealthMetadata = {
  api?: LayerHealthEntry;
  mcp?: LayerHealthEntry;
  webhooks?: LayerHealthEntry;
};

export type IntegrationHealthLayerKey = keyof IntegrationLayerHealthMetadata;

const LAYER_LABELS: Record<IntegrationHealthLayerKey, string> = {
  api: 'API',
  mcp: 'MCP',
  webhooks: 'Webhooks',
};

/** Applicable health layers per platform integration service. */
export const INTEGRATION_HEALTH_LAYERS: Record<string, IntegrationHealthLayerKey[]> = {
  railway: ['api', 'webhooks'],
  vercel: ['api', 'webhooks'],
  github: ['api', 'mcp', 'webhooks'],
  anthropic: ['api'],
  openai: ['api'],
  'together-ai': ['api'],
  elevenlabs: ['api'],
};

export type IntegrationHealthLayerDto = {
  layer: IntegrationHealthLayerKey;
  label: string;
  status: LayerStatus;
  last_checked: string;
};

function isLayerStatus(value: unknown): value is LayerStatus {
  return value === 'live' || value === 'degraded' || value === 'inactive';
}

function parseLayerEntry(value: unknown): LayerHealthEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const status = row.status;
  const last_checked = row.last_checked;
  if (!isLayerStatus(status) || typeof last_checked !== 'string') return null;
  return { status, last_checked };
}

/** Parse metadata.health — supports legacy gateway shape (api string + lastChecked). */
export function parseIntegrationLayerHealth(metadata: unknown): IntegrationLayerHealthMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const health = (metadata as Record<string, unknown>).health;
  if (!health || typeof health !== 'object' || Array.isArray(health)) return null;

  const raw = health as Record<string, unknown>;
  const result: IntegrationLayerHealthMetadata = {};

  if (typeof raw.api === 'string' && isLayerStatus(mapLegacyApiStatus(raw.api))) {
    result.api = {
      status: mapLegacyApiStatus(raw.api),
      last_checked:
        typeof raw.lastChecked === 'string' ? raw.lastChecked : new Date().toISOString(),
    };
  } else {
    const api = parseLayerEntry(raw.api);
    if (api) result.api = api;
  }

  const mcp = parseLayerEntry(raw.mcp);
  if (mcp) result.mcp = mcp;

  const webhooks = parseLayerEntry(raw.webhooks);
  if (webhooks) result.webhooks = webhooks;

  return Object.keys(result).length > 0 ? result : null;
}

function mapLegacyApiStatus(value: string): LayerStatus {
  if (value === 'connected') return 'live';
  if (value === 'error') return 'degraded';
  return 'inactive';
}

export function integrationHealthToDto(
  service: string,
  health: IntegrationLayerHealthMetadata | null,
): IntegrationHealthLayerDto[] | null {
  if (!health) return null;
  const layers = INTEGRATION_HEALTH_LAYERS[service];
  if (!layers?.length) return null;

  return layers
    .map((layer) => {
      const entry = health[layer];
      if (!entry) return null;
      return {
        layer,
        label: LAYER_LABELS[layer],
        status: entry.status,
        last_checked: entry.last_checked,
      };
    })
    .filter((row): row is IntegrationHealthLayerDto => row !== null);
}

export function buildInitialLayerHealth(params: {
  service: string;
  status: string;
  now?: string;
}): IntegrationLayerHealthMetadata {
  const now = params.now ?? new Date().toISOString();
  const layers = INTEGRATION_HEALTH_LAYERS[params.service] ?? ['api'];
  const connected = params.status === 'connected';
  const health: IntegrationLayerHealthMetadata = {};

  for (const layer of layers) {
    if (layer === 'api') {
      health.api = { status: connected ? 'live' : 'inactive', last_checked: now };
    } else if (layer === 'webhooks') {
      health.webhooks = { status: 'inactive', last_checked: now };
    } else if (layer === 'mcp') {
      health.mcp = { status: 'inactive', last_checked: now };
    }
  }

  return health;
}

export function mergeLayerHealth(
  existing: IntegrationLayerHealthMetadata | null | undefined,
  patch: IntegrationLayerHealthMetadata,
): IntegrationLayerHealthMetadata {
  return {
    ...(existing ?? {}),
    ...patch,
  };
}

export function apiLayerFromCatalogOk(ok: boolean): LayerHealthEntry {
  return {
    status: ok ? 'live' : 'degraded',
    last_checked: new Date().toISOString(),
  };
}

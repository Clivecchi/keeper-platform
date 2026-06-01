/**
 * Nango host + integration ID resolution (API must match frontend nangoConnect.ts host).
 */
import {
  PLATFORM_INTEGRATION_SERVICES,
  type PlatformIntegrationService,
} from '../types/integration.js';

/** Self-hosted Nango — same host as apps/web/src/lib/nangoConnect.ts */
export const DEFAULT_NANGO_HOST = 'https://services.keeper.domains';

const NANGO_INTEGRATION_ENV: Record<PlatformIntegrationService, string> = {
  railway: 'NANGO_INTEGRATION_RAILWAY',
  vercel: 'NANGO_INTEGRATION_VERCEL',
  github: 'NANGO_INTEGRATION_GITHUB',
};

export function resolveNangoHost(): string {
  const raw = process.env.NANGO_HOST?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/$/, '') : DEFAULT_NANGO_HOST;
}

/**
 * Maps Keeper service slug → Nango integration unique ID (providerConfigKey).
 * Override per env when dashboard IDs differ from slugs (e.g. NANGO_INTEGRATION_GITHUB=github-app).
 */
export function resolveNangoIntegrationId(service: string): string {
  if (PLATFORM_INTEGRATION_SERVICES.includes(service as PlatformIntegrationService)) {
    const envKey = NANGO_INTEGRATION_ENV[service as PlatformIntegrationService];
    const override = process.env[envKey]?.trim();
    if (override) return override;
  }
  return service;
}

/** Connect session body — legacy self-hosted Nango uses end_user; newer Nango uses tags. */
export type NangoConnectSessionBody = {
  allowed_integrations: string[];
  tags?: Record<string, string>;
  end_user?: { id: string };
  organization?: { id: string };
};

/**
 * Build POST /connect/sessions body for the deployed Nango version.
 * Default: legacy (end_user) — matches self-hosted Nango that rejects `tags`.
 * Set NANGO_CONNECT_SESSION_TAGS=true after upgrading Nango to a tags-based release.
 */
export function buildConnectSessionBody(params: {
  endUserId: string;
  organizationId: string;
  allowedIntegrations: string[];
}): NangoConnectSessionBody {
  if (process.env.NANGO_CONNECT_SESSION_TAGS === 'true') {
    return {
      allowed_integrations: params.allowedIntegrations,
      tags: {
        end_user_id: params.endUserId,
        organization_id: params.organizationId,
      },
    };
  }
  return {
    allowed_integrations: params.allowedIntegrations,
    end_user: { id: params.endUserId },
    organization: { id: params.organizationId },
  };
}

export function formatNangoError(err: unknown): { status: number; message: string; detail?: unknown } {
  const axiosErr = err as {
    response?: { status?: number; data?: { error?: string; message?: string } };
    message?: string;
  };
  if (axiosErr.response) {
    const status = axiosErr.response.status ?? 502;
    const data = axiosErr.response.data;
    const message =
      (typeof data === 'object' && data && (data.message ?? data.error)) ||
      axiosErr.message ||
      'Nango request failed';
    return {
      status: status >= 400 && status < 600 ? status : 502,
      message: String(message),
      detail: data,
    };
  }
  if (err instanceof Error) {
    return { status: 502, message: err.message };
  }
  return { status: 500, message: 'Nango request failed' };
}

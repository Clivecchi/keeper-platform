/**
 * Nango host + integration ID resolution (API must match frontend nangoConnect.ts host).
 */
import type { Nango } from '@nangohq/node';
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

export type ConnectSessionParams = {
  endUserId: string;
  organizationId: string;
  allowedIntegrations: string[];
};

/** Matches @nangohq/node createConnectSession input (tags required). */
export type NangoConnectSessionBody = {
  allowed_integrations: string[];
  tags: Record<string, string>;
};

/** Legacy self-hosted Nango — requires end_user, rejects tags-only payloads. */
export type NangoConnectSessionLegacyBody = {
  allowed_integrations: string[];
  end_user: { id: string };
  organization: { id: string };
};

export type NangoConnectSessionResult = {
  data: { token: string; connect_link?: string; expires_at?: string };
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

/**
 * Connect session body for SDK createConnectSession (tags-based Nango).
 */
export function buildConnectSessionBody(params: ConnectSessionParams): NangoConnectSessionBody {
  return {
    allowed_integrations: params.allowedIntegrations,
    tags: {
      end_user_id: params.endUserId,
      organization_id: params.organizationId,
    },
  };
}

export function buildConnectSessionLegacyBody(
  params: ConnectSessionParams,
): NangoConnectSessionLegacyBody {
  return {
    allowed_integrations: params.allowedIntegrations,
    end_user: { id: params.endUserId },
    organization: { id: params.organizationId },
  };
}

function usesTagsConnectSessionApi(): boolean {
  return process.env.NANGO_CONNECT_SESSION_TAGS === 'true';
}

async function createLegacyConnectSession(
  params: ConnectSessionParams,
): Promise<NangoConnectSessionResult> {
  const secretKey = process.env.NANGO_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('NANGO_SECRET_KEY is not configured');
  }

  const response = await fetch(`${resolveNangoHost()}/connect/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(buildConnectSessionLegacyBody(params)),
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Nango connect session failed (${response.status}): invalid JSON`);
  }

  if (!response.ok) {
    const err = new Error(
      `Nango connect session failed (${response.status})`,
    ) as Error & { response?: { status: number; data: unknown } };
    err.response = { status: response.status, data: payload };
    throw err;
  }

  const body = payload as { data?: { token?: string } };
  if (!body.data?.token) {
    throw new Error('Nango connect session response missing token');
  }

  return { data: body.data as { token: string } };
}

/**
 * Create a Nango connect session — SDK (tags) or legacy HTTP (end_user) per deployment.
 */
export async function createKeeperConnectSession(
  nango: Nango,
  params: ConnectSessionParams,
): Promise<NangoConnectSessionResult> {
  if (usesTagsConnectSessionApi()) {
    return nango.createConnectSession(buildConnectSessionBody(params));
  }
  return createLegacyConnectSession(params);
}

export function extractNangoErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Nango request failed';
  }
  const root = data as Record<string, unknown>;
  if (typeof root.message === 'string' && root.message.length > 0) {
    return root.message;
  }
  if (typeof root.error === 'string' && root.error.length > 0) {
    return root.error;
  }
  const nested = root.error;
  if (nested && typeof nested === 'object') {
    const e = nested as {
      message?: string;
      code?: string;
      errors?: Array<{ message?: string; path?: Array<string | number> }>;
    };
    if (Array.isArray(e.errors) && e.errors.length > 0) {
      return e.errors
        .map((item) => {
          const path = Array.isArray(item.path) ? item.path.join('.') : '';
          return path ? `${path}: ${item.message ?? 'invalid'}` : (item.message ?? 'invalid');
        })
        .join('; ');
    }
    if (typeof e.message === 'string' && e.message.length > 0) {
      return e.message;
    }
    if (typeof e.code === 'string' && e.code.length > 0) {
      return e.code;
    }
  }
  try {
    return JSON.stringify(data).slice(0, 400);
  } catch {
    return 'Nango request failed';
  }
}

export function formatNangoError(err: unknown): { status: number; message: string; detail?: unknown } {
  const axiosErr = err as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  if (axiosErr.response) {
    const status = axiosErr.response.status ?? 502;
    const data = axiosErr.response.data;
    const message = extractNangoErrorMessage(data) || axiosErr.message || 'Nango request failed';
    return {
      status: status >= 400 && status < 600 ? status : 502,
      message,
      detail: data,
    };
  }
  if (err instanceof Error) {
    return { status: 502, message: err.message };
  }
  return { status: 500, message: 'Nango request failed' };
}

export function connectSessionFailureHint(
  nangoStatus: number,
  message: string,
  integrationId: string,
): string | undefined {
  if (/invalid_body|end_user|unrecognized_keys.*tags/i.test(message)) {
    return 'Self-hosted Nango expects legacy connect session shape (end_user). Unset NANGO_CONNECT_SESSION_TAGS until Nango is upgraded.';
  }
  if (
    nangoStatus === 400 ||
    nangoStatus === 404 ||
    /integration|provider|allowed_integrations|not found|unknown/i.test(message)
  ) {
    return `Add integration "${integrationId}" in Nango (services.keeper.domains) or set NANGO_INTEGRATION_* to match the dashboard Integration ID.`;
  }
  return undefined;
}

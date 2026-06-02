/**
 * Integration types — Services (Nango OAuth), Custom (env token verify), AI_Model (future).
 */

export type IntegrationTier = 'platform' | 'user';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

/** Prisma IntegrationType enum — explicit on every Integration row. */
export type IntegrationType = 'Services' | 'Custom' | 'AI_Model';

export const PLATFORM_INTEGRATION_SERVICES = ['railway', 'vercel', 'github'] as const;

export type PlatformIntegrationService = (typeof PLATFORM_INTEGRATION_SERVICES)[number];

/** Canonical integration_type per platform service slug (Keeper Integrations Architecture, June 2026). */
export const PLATFORM_SERVICE_INTEGRATION_TYPE: Record<
  PlatformIntegrationService,
  IntegrationType
> = {
  railway: 'Custom',
  vercel: 'Services',
  github: 'Services',
};

export function resolvePlatformIntegrationType(service: string): IntegrationType | null {
  if (!PLATFORM_INTEGRATION_SERVICES.includes(service as PlatformIntegrationService)) {
    return null;
  }
  return PLATFORM_SERVICE_INTEGRATION_TYPE[service as PlatformIntegrationService];
}

export function isServicesIntegrationType(type: IntegrationType): boolean {
  return type === 'Services';
}

export function isCustomIntegrationType(type: IntegrationType): boolean {
  return type === 'Custom';
}

export interface IntegrationRecord {
  id: string;
  service: string;
  integration_type: IntegrationType;
  nangoConnectionId: string | null;
  status: IntegrationStatus;
  tier: IntegrationTier;
  scopes: string[];
  domainId: string | null;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  connectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationSessionRequest {
  service: string;
  userId?: string;
  domainId?: string;
}

/** Nango OAuth connect — Services integrations only. */
export interface IntegrationNangoSessionResponse {
  sessionToken: string;
}

/** Custom connect — env token verified; no Nango Connect UI. */
export interface IntegrationCustomConnectResponse {
  connected: true;
  service: string;
}

export type IntegrationSessionResponse =
  | IntegrationNangoSessionResponse
  | IntegrationCustomConnectResponse;

export interface IntegrationProxyRequest {
  service: string;
  method: string;
  endpoint: string;
  data?: unknown;
}

export interface NangoAuthWebhookPayload {
  type?: string;
  operation?: string;
  success?: boolean;
  connectionId?: string;
  providerConfigKey?: string;
  provider?: string;
  /** Newer Nango auth webhooks */
  tags?: Record<string, string>;
  /** Legacy self-hosted Nango auth webhooks */
  end_user?: { id?: string };
  endUser?: { id?: string };
  organization?: { id?: string };
}

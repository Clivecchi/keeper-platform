/**
 * Integration types — Services (Nango OAuth), Custom (env token verify), AI_Model (future).
 */

export type IntegrationTier = 'platform' | 'user';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

/** Prisma IntegrationType enum — explicit on every Integration row. */
export type IntegrationType = 'Services' | 'Custom' | 'AI_Model';

/** All platform integration slugs surfaced in Chronicle. */
export const PLATFORM_INTEGRATION_SLUGS = ['railway', 'vercel', 'github'] as const;

export type PlatformIntegrationSlug = (typeof PLATFORM_INTEGRATION_SLUGS)[number];

/** Connected Gateway slugs for AI Model integrations (API key + live catalog). */
export const AI_MODEL_INTEGRATION_SLUGS = [
  'openai',
  'anthropic',
  'together-ai',
  'elevenlabs',
] as const;

export type AIModelIntegrationSlug = (typeof AI_MODEL_INTEGRATION_SLUGS)[number];

/** Services-type integrations that use Nango OAuth (not Custom env tokens). */
export const PLATFORM_INTEGRATION_SERVICES = ['github'] as const;

export type PlatformIntegrationService = (typeof PLATFORM_INTEGRATION_SERVICES)[number];

/** Canonical integration_type per platform service slug (Keeper Integrations Architecture, June 2026). */
export const PLATFORM_SERVICE_INTEGRATION_TYPE: Record<
  PlatformIntegrationSlug,
  IntegrationType
> = {
  railway: 'Custom',
  vercel: 'Custom',
  github: 'Services',
};

export function resolvePlatformIntegrationType(service: string): IntegrationType | null {
  if (PLATFORM_INTEGRATION_SLUGS.includes(service as PlatformIntegrationSlug)) {
    return PLATFORM_SERVICE_INTEGRATION_TYPE[service as PlatformIntegrationSlug];
  }
  if (AI_MODEL_INTEGRATION_SLUGS.includes(service as AIModelIntegrationSlug)) {
    return 'AI_Model';
  }
  return null;
}

export function isAIModelIntegrationSlug(service: string): service is AIModelIntegrationSlug {
  return AI_MODEL_INTEGRATION_SLUGS.includes(service as AIModelIntegrationSlug);
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
  chronicle_blocks: string[];
  chronicle_actions: string[];
  is_gateway: boolean;
  display_label: string | null;
  description: string | null;
  connect_copy: string | null;
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

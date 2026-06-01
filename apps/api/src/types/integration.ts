/**
 * Integration types — platform connection records (credentials live in Nango).
 */

export type IntegrationTier = 'platform' | 'user';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export const PLATFORM_INTEGRATION_SERVICES = ['railway', 'vercel', 'github'] as const;

export type PlatformIntegrationService = (typeof PLATFORM_INTEGRATION_SERVICES)[number];

export interface IntegrationRecord {
  id: string;
  service: string;
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

export interface IntegrationSessionResponse {
  sessionToken: string;
}

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

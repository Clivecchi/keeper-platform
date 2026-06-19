/**
 * Integration + Nango read helpers for Cloud MCP tools.
 */

import { prisma } from '@keeper/database';
import { isNangoConfigured, resolveNangoHost } from '../lib/nango.js';
import { resolveNangoIntegrationId } from '../lib/nangoConfig.js';
import {
  integrationHealthToDto,
  parseIntegrationLayerHealth,
} from '../lib/integrationHealth.js';
import {
  PLATFORM_INTEGRATION_SLUGS,
  resolvePlatformIntegrationType,
  type PlatformIntegrationSlug,
} from '../types/integration.js';
import {
  verifyRailwayCustomConnect,
  verifyVercelCustomConnect,
} from '../lib/integrationCustomConnect.js';

export type PlatformIntegrationStatusRow = {
  service: PlatformIntegrationSlug;
  integration_type: string | null;
  status: 'connected' | 'disconnected' | 'error' | 'env_ready' | 'env_missing';
  nangoConnectionId: string | null;
  connectedAt: string | null;
  health: ReturnType<typeof integrationHealthToDto>;
  detail?: string;
};

async function envStatusForCustomService(
  service: 'railway' | 'vercel',
): Promise<Pick<PlatformIntegrationStatusRow, 'status' | 'detail'>> {
  const verification =
    service === 'railway' ? await verifyRailwayCustomConnect() : await verifyVercelCustomConnect();
  if (verification.ok) {
    return { status: 'env_ready', detail: 'Platform env credentials verified' };
  }
  return {
    status: 'env_missing',
    detail: verification.error,
  };
}

export class IntegrationMcpService {
  static getNangoStatus(): {
    configured: boolean;
    host: string | null;
    githubProviderConfigKey: string;
    servicesUsingNango: string[];
  } {
    const configured = isNangoConfigured();
    return {
      configured,
      host: configured ? resolveNangoHost() : null,
      githubProviderConfigKey: resolveNangoIntegrationId('github'),
      servicesUsingNango: ['github'],
    };
  }

  static async listPlatformIntegrations(): Promise<{
    integrations: PlatformIntegrationStatusRow[];
    checkedAt: string;
  }> {
    const rows = await prisma.integration.findMany({
      where: { tier: 'platform', domainId: null, userId: null },
      orderBy: { service: 'asc' },
    });

    const byService = new Map(rows.map((row) => [row.service, row]));
    const integrations: PlatformIntegrationStatusRow[] = [];

    for (const service of PLATFORM_INTEGRATION_SLUGS) {
      const row = byService.get(service);
      const integrationType = resolvePlatformIntegrationType(service);

      if (service === 'railway' || service === 'vercel') {
        const envStatus = await envStatusForCustomService(service);
        integrations.push({
          service,
          integration_type: integrationType,
          status: row?.status === 'connected' ? 'connected' : envStatus.status,
          nangoConnectionId: row?.nangoConnectionId ?? null,
          connectedAt: row?.connectedAt?.toISOString() ?? null,
          health: integrationHealthToDto(
            service,
            parseIntegrationLayerHealth(row?.metadata ?? null),
          ),
          detail: envStatus.detail,
        });
        continue;
      }

      integrations.push({
        service,
        integration_type: integrationType,
        status: (row?.status as PlatformIntegrationStatusRow['status']) ?? 'disconnected',
        nangoConnectionId: row?.nangoConnectionId ?? null,
        connectedAt: row?.connectedAt?.toISOString() ?? null,
        health: integrationHealthToDto(
          service,
          parseIntegrationLayerHealth(row?.metadata ?? null),
        ),
        detail:
          service === 'github' && !row?.nangoConnectionId
            ? 'Connect GitHub via Integrations (Nango OAuth) on the IDE board'
            : undefined,
      });
    }

    return {
      integrations,
      checkedAt: new Date().toISOString(),
    };
  }
}

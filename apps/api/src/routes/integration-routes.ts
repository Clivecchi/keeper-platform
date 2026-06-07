/**
 * Integration routes — Services (Nango OAuth), Custom (env token verify), proxy, list.
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import type { IntegrationType } from '../types/integration.js';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import {
  connectSessionFailureHint,
  createKeeperConnectSession,
  formatNangoError,
  getNango,
  isNangoConfigured,
  resolveNangoIntegrationId,
  resolveServiceFromProviderConfigKey,
} from '../lib/nango.js';
import {
  verifyRailwayCustomConnect,
  verifyVercelCustomConnect,
} from '../lib/integrationCustomConnect.js';
import type {
  IntegrationRecord,
  IntegrationStatus,
  IntegrationTier,
  NangoAuthWebhookPayload,
} from '../types/integration.js';
import {
  isAIModelIntegrationSlug,
  isCustomIntegrationType,
  isServicesIntegrationType,
  resolvePlatformIntegrationType,
} from '../types/integration.js';
import type { ModelProvider } from '@keeper/database';
import { fetchCatalog } from '../lib/catalogFetcher.js';
import { getCatalogConfigForService } from '../config/catalogConfigs.js';
import {
  buildGatewayMetadata,
  parseGatewayMetadata,
  toPrismaIntegrationMetadata,
  type GatewayIntegrationMetadata,
} from '../lib/integrationCatalog.js';
import { resolveProviderApiKey } from '../lib/resolveProviderApiKey.js';
import { verifyAIModelConnect } from '../lib/integrationAiModelConnect.js';

const router: Router = Router();

const sessionBodySchema = z.object({
  service: z.string().min(1),
  userId: z.string().optional(),
  domainId: z.string().optional(),
  api_key: z.string().optional(),
});

const proxyBodySchema = z.object({
  service: z.string().min(1),
  method: z.string().min(1),
  endpoint: z.string().min(1),
  data: z.unknown().optional(),
});

const disconnectBodySchema = z.object({
  service: z.string().min(1),
  domainId: z.string().optional(),
  userId: z.string().optional(),
});

const oauthCallbackBodySchema = z.object({
  service: z.string().min(1),
  connectionId: z.string().min(1),
  providerConfigKey: z.string().optional(),
  domainId: z.string().optional(),
  userId: z.string().optional(),
});

function resolveTier(userId?: string): IntegrationTier {
  // incomplete — user-level self-serve connections: tier user when userId is set in session
  return userId ? 'user' : 'platform';
}

function integrationWhere(
  service: string,
  tier: IntegrationTier,
  domainId: string | null,
  userId: string | null,
) {
  return { service, tier, domainId, userId };
}

function toIntegrationRecord(row: {
  id: string;
  service: string;
  integration_type: IntegrationType;
  nangoConnectionId: string | null;
  status: string;
  tier: string;
  scopes: string[];
  domainId: string | null;
  userId: string | null;
  metadata: unknown;
  connectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): IntegrationRecord {
  return {
    id: row.id,
    service: row.service,
    integration_type: row.integration_type,
    nangoConnectionId: row.nangoConnectionId,
    status: row.status as IntegrationStatus,
    tier: row.tier as IntegrationTier,
    scopes: row.scopes,
    domainId: row.domainId,
    userId: row.userId,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findIntegration(
  service: string,
  tier: IntegrationTier,
  domainId: string | null,
  userId: string | null,
) {
  return prisma.integration.findFirst({
    where: integrationWhere(service, tier, domainId, userId),
  });
}

async function upsertIntegration(params: {
  service: string;
  integration_type: IntegrationType;
  tier: IntegrationTier;
  domainId: string | null;
  userId: string | null;
  nangoConnectionId?: string | null;
  status: IntegrationStatus;
  connectedAt?: Date | null;
  metadata?: GatewayIntegrationMetadata | null;
}) {
  const existing = await findIntegration(
    params.service,
    params.tier,
    params.domainId,
    params.userId,
  );

  const data = {
    nangoConnectionId: params.nangoConnectionId ?? null,
    status: params.status,
    connectedAt: params.connectedAt ?? null,
  };

  if (existing) {
    return prisma.integration.update({
      where: { id: existing.id },
      data: {
        ...data,
        integration_type: params.integration_type,
        ...(params.metadata !== undefined
          ? {
              metadata:
                params.metadata === null
                  ? null
                  : toPrismaIntegrationMetadata(params.metadata),
            }
          : {}),
      },
    });
  }

  return prisma.integration.create({
    data: {
      service: params.service,
      integration_type: params.integration_type,
      tier: params.tier,
      domainId: params.domainId,
      userId: params.userId,
      scopes: [],
      ...data,
      ...(params.metadata !== undefined
        ? {
            metadata:
              params.metadata === null
                ? null
                : toPrismaIntegrationMetadata(params.metadata),
          }
        : {}),
    },
  });
}

async function refreshIntegrationCatalog(params: {
  service: string;
  apiKey: string;
}): Promise<{
  catalogResult: Awaited<ReturnType<typeof fetchCatalog>>;
  metadata: ReturnType<typeof buildGatewayMetadata>;
}> {
  const config = getCatalogConfigForService(params.service);
  const catalogResult = config
    ? await fetchCatalog(params.apiKey, config)
    : {
        ok: true,
        items: [],
        fetchedAt: new Date().toISOString(),
        source: 'fallback' as const,
      };

  return {
    catalogResult,
    metadata: buildGatewayMetadata(catalogResult),
  };
}

/**
 * POST /api/integrations/session
 * Services → Nango Connect session token. Custom → env token verification (no Nango).
 */
router.post('/session', authMiddlewareCompat, async (req: Request, res: Response) => {
  let serviceSlug = '';
  try {
    const parsed = sessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const { service, userId, domainId, api_key: bodyApiKey } = parsed.data;
    serviceSlug = service;

    const integrationType = resolvePlatformIntegrationType(service);
    if (!integrationType) {
      return res.status(400).json({
        error: 'Unknown integration service',
        service,
      });
    }

    const tier = resolveTier(userId);
    // incomplete — per-domain integration scoping: domainId accepted but not enforced for platform tier
    const scopedDomainId = tier === 'platform' ? null : domainId ?? null;
    const scopedUserId = tier === 'user' ? userId ?? req.user?.id ?? null : null;

    if (integrationType === 'AI_Model' && isAIModelIntegrationSlug(service)) {
      const provider = service as ModelProvider;
      const apiKey =
        (typeof bodyApiKey === 'string' && bodyApiKey.trim()) ||
        (await resolveProviderApiKey(provider, scopedUserId));

      if (!apiKey) {
        return res.status(503).json({
          error: `No API key available for ${service}`,
          hint: `Configure a platform key or set the provider env variable before connecting.`,
          service,
        });
      }

      const verification = await verifyAIModelConnect(provider, apiKey);
      if (verification.ok === false) {
        return res.status(503).json({
          error: `Failed to verify ${service} integration`,
          message: verification.error,
          hint: verification.hint,
          service,
        });
      }

      const { metadata, catalogResult } = await refreshIntegrationCatalog({
        service,
        apiKey,
      });

      await upsertIntegration({
        service,
        integration_type: integrationType,
        tier,
        domainId: scopedDomainId,
        userId: scopedUserId,
        status: 'connected',
        connectedAt: new Date(),
        nangoConnectionId: null,
        metadata,
      });

      return res.status(200).json({
        connected: true as const,
        service,
        catalogCount: catalogResult.items.length,
        catalogSource: catalogResult.source,
        catalogFetchedAt: catalogResult.fetchedAt,
      });
    }

    if (isCustomIntegrationType(integrationType)) {
      const verification =
        service === 'railway'
          ? await verifyRailwayCustomConnect()
          : service === 'vercel'
            ? await verifyVercelCustomConnect()
            : {
                ok: false as const,
                error: 'Custom connect is not implemented for this service',
                hint: undefined,
              };

      if (verification.ok === false) {
        return res.status(503).json({
          error: `Failed to verify ${service} integration`,
          message: verification.error,
          hint: verification.hint,
          service,
        });
      }

      await upsertIntegration({
        service,
        integration_type: integrationType,
        tier,
        domainId: scopedDomainId,
        userId: scopedUserId,
        status: 'connected',
        connectedAt: new Date(),
        nangoConnectionId: null,
      });

      return res.status(200).json({ connected: true as const, service });
    }

    if (!isServicesIntegrationType(integrationType)) {
      return res.status(400).json({
        error: 'Connect session not supported for this integration type',
        integration_type: integrationType,
      });
    }

    if (!isNangoConfigured()) {
      return res.status(503).json({ error: 'Nango is not configured' });
    }

    await upsertIntegration({
      service,
      integration_type: integrationType,
      tier,
      domainId: scopedDomainId,
      userId: scopedUserId,
      status: 'disconnected',
    });

    const endUserId = scopedUserId ?? req.user?.id ?? 'platform';
    const organizationId = scopedDomainId ?? 'platform';
    const nangoIntegrationId = resolveNangoIntegrationId(service);

    const { data } = await createKeeperConnectSession(getNango(), {
      endUserId,
      organizationId,
      allowedIntegrations: [nangoIntegrationId],
    });

    return res.status(200).json({ sessionToken: data.token });
  } catch (err) {
    console.error('[integrations/session]', err);
    const integrationType = resolvePlatformIntegrationType(serviceSlug);
    if (integrationType && isCustomIntegrationType(integrationType)) {
      const message = err instanceof Error ? err.message : 'Custom connect failed';
      return res.status(500).json({
        error: 'Failed to verify custom integration',
        message,
        service: serviceSlug,
      });
    }

    const { status, message, detail } = formatNangoError(err);
    const nangoIntegrationId = resolveNangoIntegrationId(serviceSlug || 'service');
    const hint = connectSessionFailureHint(status, message, nangoIntegrationId);
    const httpStatus = status >= 400 && status < 500 ? 502 : status === 500 ? 502 : status;
    return res.status(httpStatus).json({
      error: 'Failed to create connect session',
      message,
      hint,
      nangoIntegrationId,
      ...(detail != null ? { detail } : {}),
    });
  }
});

/**
 * POST /api/integrations/oauth-callback
 * After popup nango.auth() succeeds — persist connection when Nango webhook is not wired to Keeper API.
 */
router.post('/oauth-callback', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = oauthCallbackBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const { service, connectionId, providerConfigKey, domainId, userId } = parsed.data;
    const integrationType = resolvePlatformIntegrationType(service);
    if (!integrationType || !isServicesIntegrationType(integrationType)) {
      return res.status(400).json({ error: 'Unknown or non-Services integration service', service });
    }

    const expectedProviderKey = resolveNangoIntegrationId(service);
    if (providerConfigKey && providerConfigKey !== expectedProviderKey) {
      return res.status(400).json({
        error: 'providerConfigKey does not match service',
        service,
        providerConfigKey,
        expected: expectedProviderKey,
      });
    }

    const tier = resolveTier(userId);
    const scopedDomainId = tier === 'platform' ? null : domainId ?? null;
    const scopedUserId = tier === 'user' ? userId ?? req.user?.id ?? null : null;

    await upsertIntegration({
      service,
      integration_type: integrationType,
      tier,
      domainId: scopedDomainId,
      userId: scopedUserId,
      nangoConnectionId: connectionId,
      status: 'connected',
      connectedAt: new Date(),
    });

    return res.status(200).json({ ok: true, service, connectionId });
  } catch (err) {
    console.error('[integrations/oauth-callback]', err);
    return res.status(500).json({ error: 'Failed to persist OAuth connection' });
  }
});

/**
 * POST /api/integrations/webhook
 * Nango auth webhooks — persist connection ID on the Integration record (Services only).
 * Configure Nango to POST auth events to Keeper API (e.g. https://api.ke3p.com/api/integrations/webhook),
 * not only the self-hosted /webhook/{uuid}/{integration} ingress on services.keeper.domains.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // incomplete — add webhook signature verification before public launch
    const payload = req.body as NangoAuthWebhookPayload;

    if (payload.type !== 'auth' || !payload.success) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const connectionId = payload.connectionId;
    const providerConfigKey = payload.providerConfigKey;
    if (!connectionId || !providerConfigKey) {
      return res.status(400).json({ error: 'Missing connectionId or providerConfigKey' });
    }

    const service = resolveServiceFromProviderConfigKey(providerConfigKey);
    if (!service) {
      return res.status(200).json({
        received: true,
        ignored: true,
        reason: 'unknown_provider_config_key',
        providerConfigKey,
      });
    }

    const integrationType = resolvePlatformIntegrationType(service);
    if (!integrationType || !isServicesIntegrationType(integrationType)) {
      return res.status(200).json({ received: true, ignored: true, reason: 'not_services_type' });
    }

    const tags = payload.tags ?? {};
    const endUserId =
      tags.end_user_id ?? payload.end_user?.id ?? payload.endUser?.id;
    const organizationId =
      tags.organization_id ?? payload.organization?.id;

    const tier: IntegrationTier =
      endUserId && endUserId !== 'platform' ? 'user' : 'platform';
    const userId = tier === 'user' ? endUserId ?? null : null;
    const domainId =
      tier === 'platform' || organizationId === 'platform' ? null : organizationId ?? null;

    await upsertIntegration({
      service,
      integration_type: integrationType,
      tier,
      domainId,
      userId,
      nangoConnectionId: connectionId,
      status: 'connected',
      connectedAt: new Date(),
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[integrations/webhook]', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/integrations/proxy
 * Authenticated third-party API calls via Nango proxy.
 */
router.post('/proxy', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!isNangoConfigured()) {
      return res.status(503).json({ error: 'Nango is not configured' });
    }

    const parsed = proxyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const { service, method, endpoint, data } = parsed.data;
    const tier: IntegrationTier = 'platform';
    const integration = await findIntegration(service, tier, null, null);

    if (!integration?.nangoConnectionId || integration.status !== 'connected') {
      return res.status(404).json({ error: 'Integration not connected', service });
    }

    const response = await getNango().proxy({
      method: method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      endpoint,
      providerConfigKey: resolveNangoIntegrationId(service),
      connectionId: integration.nangoConnectionId,
      data,
    });

    return res.status(200).json(response.data);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: unknown } };
    if (axiosErr.response) {
      const upstream = axiosErr.response.data;
      const upstreamMessage =
        upstream &&
        typeof upstream === 'object' &&
        typeof (upstream as { message?: string }).message === 'string'
          ? (upstream as { message: string }).message
          : undefined;
      return res.status(axiosErr.response.status ?? 502).json({
        error: upstreamMessage ?? 'Proxy request failed',
        data: upstream,
      });
    }
    console.error('[integrations/proxy]', err);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
});

/**
 * GET /api/integrations
 * List Integration records for the current scope.
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const domainId = typeof req.query.domainId === 'string' ? req.query.domainId : undefined;
    // incomplete — per-domain integration scoping: returns platform tier + optional domain rows
    const rows = await prisma.integration.findMany({
      where: {
        OR: [
          { tier: 'platform', domainId: null, userId: null },
          ...(domainId ? [{ domainId }] : []),
        ],
      },
      orderBy: { service: 'asc' },
    });

    return res.status(200).json(rows.map(toIntegrationRecord));
  } catch (err) {
    console.error('[integrations/list]', err);
    const message = err instanceof Error ? err.message : 'Failed to list integrations';
    const missingTable =
      message.includes('Integration') &&
      (message.includes('does not exist') || message.includes('P2021'));
    return res.status(missingTable ? 503 : 500).json({
      error: missingTable
        ? 'Integration table not migrated — run pnpm db:migrate from repo root'
        : 'Failed to list integrations',
      detail: process.env.NODE_ENV !== 'production' ? message : undefined,
    });
  }
});

/**
 * POST /api/integrations/:service/catalog/refresh
 * Re-fetch a Connected Gateway catalog and update Integration.metadata.
 */
router.post('/:service/catalog/refresh', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const service = req.params.service;
    const integrationType = resolvePlatformIntegrationType(service);
    if (integrationType !== 'AI_Model' || !isAIModelIntegrationSlug(service)) {
      return res.status(400).json({
        error: 'Catalog refresh is only supported for connected AI Model integrations',
        service,
      });
    }

    const tier: IntegrationTier = 'platform';
    const integration = await findIntegration(service, tier, null, null);
    if (!integration || integration.status !== 'connected') {
      return res.status(404).json({
        error: 'Integration not connected',
        service,
      });
    }

    const provider = service as ModelProvider;
    const apiKey = await resolveProviderApiKey(provider, integration.userId);
    if (!apiKey) {
      return res.status(503).json({
        error: `No API key available for ${service}`,
        service,
      });
    }

    const { catalogResult, metadata } = await refreshIntegrationCatalog({
      service,
      apiKey,
    });

    const existingMeta = parseGatewayMetadata(integration.metadata) ?? {};
    const mergedMetadata: GatewayIntegrationMetadata = {
      ...existingMeta,
      ...metadata,
    };

    await prisma.integration.update({
      where: { id: integration.id },
      data: { metadata: toPrismaIntegrationMetadata(mergedMetadata) },
    });

    return res.status(200).json({
      ok: true,
      service,
      itemCount: catalogResult.items.length,
      fetchedAt: catalogResult.fetchedAt,
      source: catalogResult.source,
      catalogOk: catalogResult.ok,
      ...(catalogResult.error ? { error: catalogResult.error } : {}),
    });
  } catch (err) {
    console.error('[integrations/catalog/refresh]', err);
    return res.status(500).json({ error: 'Failed to refresh integration catalog' });
  }
});

/**
 * POST /api/integrations/disconnect
 * Marks an integration disconnected (platform scope). Required for Chronicle Disconnect UX.
 */
router.post('/disconnect', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = disconnectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const { service, userId, domainId } = parsed.data;
    const tier = resolveTier(userId);
    const scopedDomainId = tier === 'platform' ? null : domainId ?? null;
    const scopedUserId = tier === 'user' ? userId ?? req.user?.id ?? null : null;

    const existing = await findIntegration(service, tier, scopedDomainId, scopedUserId);
    if (!existing) {
      return res.status(404).json({ error: 'Integration not found', service });
    }

    const updated = await prisma.integration.update({
      where: { id: existing.id },
      data: {
        status: 'disconnected',
        nangoConnectionId: null,
        connectedAt: null,
      },
    });

    return res.status(200).json(toIntegrationRecord(updated));
  } catch (err) {
    console.error('[integrations/disconnect]', err);
    return res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

export default router;

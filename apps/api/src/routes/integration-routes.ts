/**
 * Integration routes — Nango-backed OAuth and proxy for third-party services.
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import {
  buildConnectSessionBody,
  formatNangoError,
  isNangoConfigured,
  nango,
  resolveNangoIntegrationId,
} from '../lib/nango.js';
import type {
  IntegrationRecord,
  IntegrationStatus,
  IntegrationTier,
  NangoAuthWebhookPayload,
} from '../types/integration.js';

const router: Router = Router();

const sessionBodySchema = z.object({
  service: z.string().min(1),
  userId: z.string().optional(),
  domainId: z.string().optional(),
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
  tier: IntegrationTier;
  domainId: string | null;
  userId: string | null;
  nangoConnectionId?: string | null;
  status: IntegrationStatus;
  connectedAt?: Date | null;
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
      data,
    });
  }

  return prisma.integration.create({
    data: {
      service: params.service,
      tier: params.tier,
      domainId: params.domainId,
      userId: params.userId,
      scopes: [],
      ...data,
    },
  });
}

/**
 * POST /api/integrations/session
 * Short-lived Nango Connect session token for the frontend.
 */
router.post('/session', authMiddlewareCompat, async (req: Request, res: Response) => {
  let serviceSlug = '';
  try {
    if (!isNangoConfigured()) {
      return res.status(503).json({ error: 'Nango is not configured' });
    }

    const parsed = sessionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const { service, userId, domainId } = parsed.data;
    serviceSlug = service;
    const tier = resolveTier(userId);
    // incomplete — per-domain integration scoping: domainId accepted but not enforced for platform tier
    const scopedDomainId = tier === 'platform' ? null : domainId ?? null;
    const scopedUserId = tier === 'user' ? userId ?? req.user?.id ?? null : null;

    await upsertIntegration({
      service,
      tier,
      domainId: scopedDomainId,
      userId: scopedUserId,
      status: 'disconnected',
    });

    const endUserId = scopedUserId ?? req.user?.id ?? 'platform';
    const organizationId = scopedDomainId ?? 'platform';
    const nangoIntegrationId = resolveNangoIntegrationId(service);

    const { data } = await nango.createConnectSession(
      buildConnectSessionBody({
        endUserId,
        organizationId,
        allowedIntegrations: [nangoIntegrationId],
      }),
    );

    return res.status(200).json({ sessionToken: data.token });
  } catch (err) {
    console.error('[integrations/session]', err);
    const { status, message, detail } = formatNangoError(err);
    const hint = /invalid_body|end_user|unrecognized_keys.*tags/i.test(message)
      ? 'Self-hosted Nango expects legacy connect session shape (end_user). Do not set NANGO_CONNECT_SESSION_TAGS until Nango is upgraded.'
      : status === 404 || /integration|provider|config/i.test(message)
        ? `Check Nango dashboard integration ID matches ${resolveNangoIntegrationId(serviceSlug || 'service')} (or set NANGO_INTEGRATION_* env overrides).`
        : undefined;
    return res.status(status === 500 ? 502 : status).json({
      error: 'Failed to create connect session',
      message,
      hint,
      ...(process.env.NODE_ENV !== 'production' && detail != null ? { detail } : {}),
    });
  }
});

/**
 * POST /api/integrations/webhook
 * Nango auth webhooks — persist connection ID on the Integration record.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // incomplete — add webhook signature verification before public launch
    const payload = req.body as NangoAuthWebhookPayload;

    if (payload.type !== 'auth' || !payload.success) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const connectionId = payload.connectionId;
    const service = payload.providerConfigKey;
    if (!connectionId || !service) {
      return res.status(400).json({ error: 'Missing connectionId or providerConfigKey' });
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

    const response = await nango.proxy({
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
      return res.status(axiosErr.response.status ?? 502).json({
        error: 'Proxy request failed',
        data: axiosErr.response.data,
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

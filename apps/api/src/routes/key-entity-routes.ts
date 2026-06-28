/**
 * Key EntityKind routes — provider credential presence layer.
 * Sits alongside ModelProviderService; does not alter key resolution order.
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import type { ModelProvider } from '@keeper/database';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { KipUserKeyService } from '../services/KipUserKeyService.js';
import { PlatformApiKeyService } from '../services/PlatformApiKeyService.js';
import { verifyAIModelConnect } from '../lib/integrationAiModelConnect.js';
import { resolveProviderApiKeyWithSource } from '../lib/resolveProviderApiKey.js';
import {
  resolveKeyChronicleDefaults,
  resolveKeyDeclarationBackfill,
  isKeySourceAllowedForTier,
  type DomainTierKeyPolicy,
} from '@keeper/shared';
import { loadDomainTierContext } from '../lib/loadDomainTier.js';

const router: Router = Router();

const VALID_PROVIDERS: ModelProvider[] = ['openai', 'anthropic', 'together-ai', 'elevenlabs'];
const VALID_SOURCES = ['env', 'user', 'platform'] as const;
const VALID_STATUSES = ['valid', 'invalid', 'expired', 'revoked', 'unknown'] as const;

const createKeySchema = z.object({
  domain_id: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'together-ai', 'elevenlabs']),
  key_source: z.enum(VALID_SOURCES),
  api_key: z.string().min(5).optional(),
  scope: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  user_id: z.string().optional(),
});

const patchKeySchema = z
  .object({
    status: z.enum(VALID_STATUSES).optional(),
    scope: z.string().optional(),
    expires_at: z.string().datetime().nullable().optional(),
    display_label: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const rotateKeySchema = z.object({
  api_key: z.string().min(5),
});

export type KeyEntityRecord = {
  id: string;
  provider: string;
  key_source: string;
  status: string;
  scope: string | null;
  last_verified: string | null;
  expires_at: string | null;
  domain_id: string;
  user_id: string | null;
  integration_id: string | null;
  chronicle_blocks: string[];
  chronicle_actions: string[];
  display_label: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

function toKeyRecord(row: {
  id: string;
  provider: string;
  key_source: string;
  status: string;
  scope: string | null;
  last_verified: Date | null;
  expires_at: Date | null;
  domain_id: string;
  user_id: string | null;
  integration_id: string | null;
  chronicle_blocks: string[];
  chronicle_actions: string[];
  display_label: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}): KeyEntityRecord {
  return {
    id: row.id,
    provider: row.provider,
    key_source: row.key_source,
    status: row.status,
    scope: row.scope,
    last_verified: row.last_verified?.toISOString() ?? null,
    expires_at: row.expires_at?.toISOString() ?? null,
    domain_id: row.domain_id,
    user_id: row.user_id,
    integration_id: row.integration_id,
    chronicle_blocks: row.chronicle_blocks,
    chronicle_actions: row.chronicle_actions,
    display_label: row.display_label,
    description: row.description,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

async function findPlatformIntegration(provider: string) {
  return prisma.integration.findFirst({
    where: {
      service: provider,
      tier: 'platform',
      domainId: null,
      userId: null,
    },
  });
}

async function resolveCredentialForKey(
  provider: ModelProvider,
  keySource: (typeof VALID_SOURCES)[number],
  userId?: string | null,
): Promise<string | null> {
  if (keySource === 'env') {
    const resolved = await resolveProviderApiKeyWithSource(provider, userId);
    return resolved.source === 'env' ? resolved.key : null;
  }
  if (keySource === 'user' && userId) {
    return KipUserKeyService.getUserKey(provider, userId);
  }
  if (keySource === 'platform') {
    return PlatformApiKeyService.getKeyForProvider(provider);
  }
  return null;
}

async function syncProviderKeyPresence(
  domainId: string,
  provider: ModelProvider,
  userId: string | null,
  policy?: DomainTierKeyPolicy,
): Promise<void> {
  const tierContext = policy
    ? null
    : await loadDomainTierContext(domainId);
  const keyPolicy = policy ?? tierContext?.policy;
  if (!keyPolicy) return;

  const meta = PROVIDER_KEY_META[provider];
  if (!meta) return;

  const integration = await findPlatformIntegration(provider);
  const resolved = await resolveProviderApiKeyWithSource(provider, userId ?? undefined);
  const keyDefaults = resolveKeyChronicleDefaults(provider);
  const sources: Array<{
    key_source: (typeof VALID_SOURCES)[number];
    status: string;
    user_id: string | null;
  }> = [];

  if (resolved.key && resolved.source === 'env' && isKeySourceAllowedForTier('env', keyPolicy)) {
    sources.push({ key_source: 'env', status: 'valid', user_id: null });
  }
  if (userId && isKeySourceAllowedForTier('user', keyPolicy)) {
    const userKey = await KipUserKeyService.getUserKey(provider, userId);
    if (userKey) {
      sources.push({ key_source: 'user', status: 'valid', user_id: userId });
    }
  }
  const platformKey = await PlatformApiKeyService.getKeyForProvider(provider);
  if (platformKey && isKeySourceAllowedForTier('platform', keyPolicy)) {
    sources.push({ key_source: 'platform', status: 'valid', user_id: null });
  }
  if (sources.length === 0) {
    sources.push({
      key_source: 'user',
      status: resolved.key ? 'valid' : 'unknown',
      user_id: userId,
    });
  }

  for (const source of sources) {
    const existing = await prisma.key.findFirst({
      where: {
        domain_id: domainId,
        provider,
        key_source: source.key_source,
        user_id: source.user_id,
      },
    });
    const payload = {
      integration_id: integration?.id ?? null,
      display_label: keyDefaults.display_label,
      description: meta.description,
      scope: meta.scope,
      status: source.status,
      chronicle_blocks: [...keyDefaults.chronicle_blocks],
      chronicle_actions: [...keyDefaults.chronicle_actions],
    };
    if (existing) {
      await prisma.key.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.key.create({
        data: {
          domain_id: domainId,
          provider,
          key_source: source.key_source,
          user_id: source.user_id,
          ...payload,
        },
      });
    }
  }
}

/**
 * GET /api/keys
 * List Key records for a domain. Optional ?provider= filter.
 * Optional ?sync=1 — materialize Key presence rows for the provider when none exist yet.
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const domainId = typeof req.query.domainId === 'string' ? req.query.domainId : undefined;
    const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
    const shouldSync = req.query.sync === '1' || req.query.sync === 'true';

    if (!domainId) {
      return res.status(400).json({ error: 'domainId query parameter is required' });
    }

    if (
      shouldSync &&
      provider &&
      VALID_PROVIDERS.includes(provider as ModelProvider)
    ) {
      const authReq = req as AuthenticatedRequest;
      const existing = await prisma.key.findFirst({
        where: {
          domain_id: domainId,
          provider,
          status: { not: 'revoked' },
        },
      });
      if (!existing) {
        await syncProviderKeyPresence(
          domainId,
          provider as ModelProvider,
          authReq.user?.id ?? null,
        );
      }
    }

    const rows = await prisma.key.findMany({
      where: {
        domain_id: domainId,
        status: { not: 'revoked' },
        ...(provider ? { provider } : {}),
      },
      orderBy: [{ provider: 'asc' }, { key_source: 'asc' }],
    });

    return res.status(200).json(rows.map(toKeyRecord));
  } catch (err) {
    console.error('[keys/list]', err);
    return res.status(500).json({ error: 'Failed to list keys' });
  }
});

/**
 * GET /api/keys/:id
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const row = await prisma.key.findUnique({ where: { id: req.params.id } });
    if (!row) {
      return res.status(404).json({ error: 'Key not found' });
    }
    return res.status(200).json(toKeyRecord(row));
  } catch (err) {
    console.error('[keys/get]', err);
    return res.status(500).json({ error: 'Failed to fetch key' });
  }
});

/**
 * POST /api/keys
 * Create Key record and corresponding kip_user_keys / kip_platform_keys entry when applicable.
 */
router.post('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = createKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const authReq = req as AuthenticatedRequest;
    const {
      domain_id,
      provider,
      key_source,
      api_key,
      scope,
      expires_at,
      user_id: bodyUserId,
    } = parsed.data;

    const userId = key_source === 'user' ? bodyUserId ?? authReq.user?.id ?? null : null;
    if (key_source === 'user' && !userId) {
      return res.status(400).json({ error: 'user_id is required for user-sourced keys' });
    }

    if (key_source === 'user') {
      const tierContext = await loadDomainTierContext(domain_id);
      if (!tierContext?.policy.allowDomainKeys) {
        return res.status(403).json({
          error: 'TIER_BYOK_UNAVAILABLE',
          message: 'Your realm tier does not include bringing your own provider keys.',
          tier: tierContext?.tierId ?? 'free',
          upgradeHint: 'Upgrade to Keeper tier to add your own keys.',
        });
      }
    }

    if (key_source === 'env') {
      return res.status(400).json({
        error: 'ENV-sourced keys cannot be created manually — they are detected from environment variables',
      });
    }

    if (!api_key) {
      return res.status(400).json({ error: 'api_key is required for user and platform keys' });
    }

    const verification = await verifyAIModelConnect(provider, api_key);
    if (verification.ok === false) {
      return res.status(400).json({
        error: 'Key rejected by provider',
        hint: verification.hint ?? verification.error,
      });
    }

    if (key_source === 'user' && userId) {
      const saved = await KipUserKeyService.setUserKey(provider, userId, api_key);
      if (!saved) {
        return res.status(500).json({ error: 'Failed to save user key' });
      }
    } else if (key_source === 'platform') {
      const roles = authReq.user?.platformRoles ?? [];
      if (!roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Admin access required for platform keys' });
      }
      const result = await PlatformApiKeyService.upsertKey(
        {
          provider,
          api_key,
          label: `${provider} API Key`,
          is_active: true,
        },
        authReq.user?.id,
      );
      if (!result.success) {
        return res.status(500).json({ error: result.error ?? 'Failed to save platform key' });
      }
    }

    const integration = await findPlatformIntegration(provider);
    const displayMeta = PROVIDER_KEY_META[provider];
    const keyDefaults = resolveKeyChronicleDefaults(provider);

    const existing = await prisma.key.findFirst({
      where: { domain_id, provider, key_source, user_id: userId },
    });

    const row = existing
      ? await prisma.key.update({
          where: { id: existing.id },
          data: {
            status: 'valid',
            scope: scope ?? displayMeta?.scope ?? undefined,
            last_verified: new Date(),
            expires_at: expires_at ? new Date(expires_at) : undefined,
            integration_id: integration?.id ?? undefined,
            ...resolveKeyDeclarationBackfill(provider, existing),
          },
        })
      : await prisma.key.create({
          data: {
            domain_id,
            provider,
            key_source,
            status: 'valid',
            scope: scope ?? displayMeta?.scope ?? null,
            last_verified: new Date(),
            expires_at: expires_at ? new Date(expires_at) : null,
            user_id: userId,
            integration_id: integration?.id ?? null,
            chronicle_blocks: [...keyDefaults.chronicle_blocks],
            chronicle_actions: [...keyDefaults.chronicle_actions],
            display_label: keyDefaults.display_label,
            description: displayMeta?.description ?? keyDefaults.description,
          },
        });

    return res.status(201).json(toKeyRecord(row));
  } catch (err) {
    console.error('[keys/create]', err);
    return res.status(500).json({ error: 'Failed to create key' });
  }
});

/**
 * PATCH /api/keys/:id
 */
router.patch('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = patchKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const existing = await prisma.key.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Key not found' });
    }

    const { status, scope, expires_at, display_label, description } = parsed.data;
    const row = await prisma.key.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(expires_at !== undefined
          ? { expires_at: expires_at === null ? null : new Date(expires_at) }
          : {}),
        ...(display_label !== undefined ? { display_label } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    return res.status(200).json(toKeyRecord(row));
  } catch (err) {
    console.error('[keys/patch]', err);
    return res.status(500).json({ error: 'Failed to update key' });
  }
});

/**
 * DELETE /api/keys/:id — soft revoke
 */
router.delete('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.key.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Key not found' });
    }

    const row = await prisma.key.update({
      where: { id: req.params.id },
      data: { status: 'revoked' },
    });

    return res.status(200).json(toKeyRecord(row));
  } catch (err) {
    console.error('[keys/revoke]', err);
    return res.status(500).json({ error: 'Failed to revoke key' });
  }
});

/**
 * POST /api/keys/:id/verify — live provider check
 */
router.post('/:id/verify', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.key.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Key not found' });
    }

    const provider = existing.provider as ModelProvider;
    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    const apiKey = await resolveCredentialForKey(
      provider,
      existing.key_source as (typeof VALID_SOURCES)[number],
      existing.user_id,
    );

    const now = new Date();
    if (!apiKey) {
      const row = await prisma.key.update({
        where: { id: existing.id },
        data: { status: 'invalid', last_verified: now },
      });
      return res.status(200).json({
        ...toKeyRecord(row),
        verification: { ok: false, error: 'No credential available for this key source' },
      });
    }

    const verification = await verifyAIModelConnect(provider, apiKey);
    const row = await prisma.key.update({
      where: { id: existing.id },
      data: {
        status: verification.ok === true ? 'valid' : 'invalid',
        last_verified: now,
      },
    });

    return res.status(200).json({
      ...toKeyRecord(row),
      verification:
        verification.ok === true
          ? { ok: true }
          : { ok: false, error: verification.error, hint: verification.hint },
    });
  } catch (err) {
    console.error('[keys/verify]', err);
    return res.status(500).json({ error: 'Failed to verify key' });
  }
});

/**
 * POST /api/keys/:id/rotate — update credential and re-verify
 */
router.post('/:id/rotate', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const parsed = rotateKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const existing = await prisma.key.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Key not found' });
    }

    if (existing.key_source === 'env') {
      return res.status(400).json({ error: 'ENV-sourced keys cannot be rotated via API' });
    }

    const provider = existing.provider as ModelProvider;
    const authReq = req as AuthenticatedRequest;
    const { api_key } = parsed.data;

    const verification = await verifyAIModelConnect(provider, api_key);
    if (verification.ok === false) {
      return res.status(400).json({
        error: 'Key rejected by provider',
        hint: verification.hint ?? verification.error,
      });
    }

    if (existing.key_source === 'user' && existing.user_id) {
      await KipUserKeyService.setUserKey(provider, existing.user_id, api_key);
    } else if (existing.key_source === 'platform') {
      const roles = authReq.user?.platformRoles ?? [];
      if (!roles.includes('super-admin')) {
        return res.status(403).json({ error: 'Admin access required for platform key rotation' });
      }
      await PlatformApiKeyService.upsertKey(
        { provider, api_key, label: `${provider} API Key`, is_active: true },
        authReq.user?.id,
      );
    }

    const row = await prisma.key.update({
      where: { id: existing.id },
      data: { status: 'valid', last_verified: new Date() },
    });

    return res.status(200).json(toKeyRecord(row));
  } catch (err) {
    console.error('[keys/rotate]', err);
    return res.status(500).json({ error: 'Failed to rotate key' });
  }
});

export const PROVIDER_KEY_META: Record<
  ModelProvider,
  { display_label: string; description: string; scope: string }
> = {
  anthropic: {
    display_label: 'Anthropic',
    description: 'Claude models — powers Kip and platform AI capabilities',
    scope: 'Claude chat completions and agent reasoning',
  },
  openai: {
    display_label: 'OpenAI',
    description: 'GPT models — available for agent configuration',
    scope: 'GPT chat completions and structured outputs',
  },
  'together-ai': {
    display_label: 'Together AI',
    description: 'Open model catalog — image generation, JSON, and agent chat',
    scope: 'Open-weight models, FLUX image generation, and JSON mode',
  },
  elevenlabs: {
    display_label: 'ElevenLabs',
    description: 'Voice synthesis — powers agent voice capabilities',
    scope: 'Text-to-speech and voice synthesis for agents',
  },
};

export type DomainKeyAccessPayload = {
  tier: { id: string; label: string; description: string };
  policy: DomainTierKeyPolicy;
  keys: KeyEntityRecord[];
};

/** Sync Key presence for all AI providers and return tier + policy + rows. */
export async function buildDomainKeyAccessPayload(
  domainId: string,
  userId: string | null,
): Promise<DomainKeyAccessPayload | null> {
  const tierContext = await loadDomainTierContext(domainId);
  if (!tierContext) return null;

  for (const provider of VALID_PROVIDERS) {
    await syncProviderKeyPresence(domainId, provider, userId, tierContext.policy);
  }

  const rows = await prisma.key.findMany({
    where: {
      domain_id: domainId,
      status: { not: 'revoked' },
    },
    orderBy: [{ provider: 'asc' }, { key_source: 'asc' }],
  });

  return {
    tier: {
      id: tierContext.tierId,
      label: tierContext.tier.label,
      description: tierContext.tier.description,
    },
    policy: tierContext.policy,
    keys: rows.map(toKeyRecord),
  };
}

export default router;

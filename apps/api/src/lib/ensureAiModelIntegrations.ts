/**
 * Ensures platform AI Model Integration rows exist and auto-connects when env keys are valid.
 */

import { prisma } from '@keeper/database';
import type { ModelProvider } from '@keeper/database';
import { fetchCatalog } from './catalogFetcher.js';
import { getCatalogConfigForService } from '../config/catalogConfigs.js';
import { AI_MODEL_INTEGRATION_SLUGS } from '../types/integration.js';
import { verifyAIModelConnect } from './integrationAiModelConnect.js';
import { resolveProviderApiKeyWithSource } from './resolveProviderApiKey.js';
import {
  buildGatewayMetadata,
  toPrismaIntegrationMetadata,
} from './integrationCatalog.js';

async function upsertAiModelIntegration(params: {
  service: ModelProvider;
  status: 'connected' | 'disconnected';
  metadata?: ReturnType<typeof buildGatewayMetadata> | null;
}) {
  const existing = await prisma.integration.findFirst({
    where: {
      service: params.service,
      tier: 'platform',
      domainId: null,
      userId: null,
    },
  });

  const data = {
    integration_type: 'AI_Model' as const,
    status: params.status,
    connectedAt: params.status === 'connected' ? new Date() : null,
    nangoConnectionId: null,
    ...(params.metadata !== undefined
      ? {
          metadata:
            params.metadata === null
              ? null
              : toPrismaIntegrationMetadata(params.metadata),
        }
      : {}),
  };

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data,
    });
    return;
  }

  await prisma.integration.create({
    data: {
      service: params.service,
      tier: 'platform',
      domainId: null,
      userId: null,
      scopes: [],
      ...data,
    },
  });
}

export async function ensureAiModelIntegrations(): Promise<void> {
  for (const service of AI_MODEL_INTEGRATION_SLUGS) {
    const provider = service as ModelProvider;
    const existing = await prisma.integration.findFirst({
      where: {
        service,
        tier: 'platform',
        domainId: null,
        userId: null,
      },
    });

    if (!existing) {
      await upsertAiModelIntegration({ service: provider, status: 'disconnected', metadata: null });
    }

    if (existing?.status === 'connected') {
      continue;
    }

    const resolved = await resolveProviderApiKeyWithSource(provider);
    if (!resolved.key) {
      continue;
    }

    const verification = await verifyAIModelConnect(provider, resolved.key);
    if (!verification.ok) {
      continue;
    }

    const catalogConfig = getCatalogConfigForService(service);
    const metadata = catalogConfig
      ? buildGatewayMetadata(await fetchCatalog(resolved.key, catalogConfig))
      : null;

    await upsertAiModelIntegration({
      service: provider,
      status: 'connected',
      metadata,
    });
  }
}

/**
 * Persist webhook-derived summaries into Integration.metadata (C2).
 */

import { prisma } from '@keeper/database';
import {
  parseGatewayMetadata,
  toPrismaIntegrationMetadata,
  type GatewayIntegrationMetadata,
} from './integrationCatalog.js';
import {
  mergeLayerHealth,
  parseIntegrationLayerHealth,
  type IntegrationLayerHealthMetadata,
  type LayerHealthEntry,
  type LayerStatus,
} from './integrationHealth.js';

export type LastDeploymentEventSummary = {
  id: string;
  eventType: string;
  status: string;
  serviceName?: string;
  url?: string;
  branch?: string;
  commitMessage?: string;
  timestamp: string;
  receivedAt: string;
  source: 'webhook';
};

export type RepositoryActivitySummary = {
  lastPush?: {
    message: string;
    author: string;
    ref?: string;
    timestamp: string;
  };
  lastPullRequest?: {
    number: number;
    title: string;
    state: string;
    updatedAt: string;
  };
  branchCount?: number;
  updatedAt: string;
};

export async function findPlatformIntegration(service: string) {
  return prisma.integration.findFirst({
    where: {
      service,
      tier: 'platform',
      domainId: null,
      userId: null,
    },
  });
}

function layerEntry(status: LayerStatus): LayerHealthEntry {
  return { status, last_checked: new Date().toISOString() };
}

export function deploymentHealthFromStatus(status: string): IntegrationLayerHealthMetadata {
  const normalized = status.toLowerCase();
  const success = ['success', 'succeeded', 'ready', 'active', 'completed'].some((s) =>
    normalized.includes(s),
  );
  const failure = ['fail', 'error', 'crashed', 'canceled', 'cancelled'].some((s) =>
    normalized.includes(s),
  );

  if (success) {
    return {
      api: layerEntry('live'),
      webhooks: layerEntry('live'),
    };
  }
  if (failure) {
    return {
      api: layerEntry('degraded'),
      webhooks: layerEntry('live'),
    };
  }
  return {
    api: layerEntry('degraded'),
    webhooks: layerEntry('live'),
  };
}

export function webhookOnlyHealth(): IntegrationLayerHealthMetadata {
  return { webhooks: layerEntry('live') };
}

export async function updateIntegrationWebhookMetadata(params: {
  service: string;
  healthPatch: IntegrationLayerHealthMetadata;
  lastDeploymentEvent?: LastDeploymentEventSummary;
  repositoryActivity?: RepositoryActivitySummary;
}): Promise<{ updated: boolean; integrationId?: string }> {
  const integration = await findPlatformIntegration(params.service);
  if (!integration) {
    return { updated: false };
  }

  const existing = parseGatewayMetadata(integration.metadata) ?? {};
  const existingHealth = parseIntegrationLayerHealth(existing);
  const health = mergeLayerHealth(existingHealth, params.healthPatch);

  const merged: GatewayIntegrationMetadata = {
    ...existing,
    health,
    ...(params.lastDeploymentEvent
      ? { last_deployment_event: params.lastDeploymentEvent }
      : {}),
    ...(params.repositoryActivity ? { repository_activity: params.repositoryActivity } : {}),
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { metadata: toPrismaIntegrationMetadata(merged) },
  });

  return { updated: true, integrationId: integration.id };
}

export function readLastDeploymentEvent(metadata: unknown): LastDeploymentEventSummary | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const row = (metadata as Record<string, unknown>).last_deployment_event;
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const event = row as Record<string, unknown>;
  if (typeof event.id !== 'string' || typeof event.eventType !== 'string') return null;
  return {
    id: event.id,
    eventType: event.eventType,
    status: typeof event.status === 'string' ? event.status : 'unknown',
    serviceName: typeof event.serviceName === 'string' ? event.serviceName : undefined,
    url: typeof event.url === 'string' ? event.url : undefined,
    branch: typeof event.branch === 'string' ? event.branch : undefined,
    commitMessage: typeof event.commitMessage === 'string' ? event.commitMessage : undefined,
    timestamp: typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString(),
    receivedAt: typeof event.receivedAt === 'string' ? event.receivedAt : new Date().toISOString(),
    source: 'webhook',
  };
}

export function webhookEventToRailwayDeployment(event: LastDeploymentEventSummary) {
  return {
    id: event.id,
    status: event.status,
    createdAt: event.timestamp,
    serviceId: undefined as string | undefined,
    source: 'webhook' as const,
    serviceName: event.serviceName,
  };
}

export function webhookEventToVercelDeployment(event: LastDeploymentEventSummary) {
  return {
    id: event.id,
    url: event.url,
    state: event.status,
    createdAt: Date.parse(event.timestamp) || Date.now(),
    target: undefined as string | undefined,
    meta: {
      githubCommitRef: event.branch,
      githubCommitMessage: event.commitMessage,
      source: 'webhook',
    },
  };
}

export function prependWebhookDeployment<T extends { id: string }>(
  deployments: T[],
  webhookRow: T | null,
  limit: number,
): T[] {
  if (!webhookRow) return deployments.slice(0, limit);
  const rest = deployments.filter((row) => row.id !== webhookRow.id);
  return [webhookRow, ...rest].slice(0, limit);
}

export function readRepositoryActivity(metadata: unknown): RepositoryActivitySummary | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const row = (metadata as Record<string, unknown>).repository_activity;
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const activity = row as Record<string, unknown>;
  return {
    lastPush:
      activity.lastPush && typeof activity.lastPush === 'object' && !Array.isArray(activity.lastPush)
        ? {
            message: String((activity.lastPush as Record<string, unknown>).message ?? ''),
            author: String((activity.lastPush as Record<string, unknown>).author ?? ''),
            ref:
              typeof (activity.lastPush as Record<string, unknown>).ref === 'string'
                ? ((activity.lastPush as Record<string, unknown>).ref as string)
                : undefined,
            timestamp: String(
              (activity.lastPush as Record<string, unknown>).timestamp ?? new Date().toISOString(),
            ),
          }
        : undefined,
    lastPullRequest:
      activity.lastPullRequest &&
      typeof activity.lastPullRequest === 'object' &&
      !Array.isArray(activity.lastPullRequest)
        ? {
            number: Number((activity.lastPullRequest as Record<string, unknown>).number ?? 0),
            title: String((activity.lastPullRequest as Record<string, unknown>).title ?? ''),
            state: String((activity.lastPullRequest as Record<string, unknown>).state ?? ''),
            updatedAt: String(
              (activity.lastPullRequest as Record<string, unknown>).updatedAt ??
                new Date().toISOString(),
            ),
          }
        : undefined,
    branchCount:
      typeof activity.branchCount === 'number' ? activity.branchCount : undefined,
    updatedAt:
      typeof activity.updatedAt === 'string' ? activity.updatedAt : new Date().toISOString(),
  };
}

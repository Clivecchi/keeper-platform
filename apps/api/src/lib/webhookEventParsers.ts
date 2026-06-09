/**
 * Parse inbound webhook payloads into Integration metadata summaries.
 */

import type { LastDeploymentEventSummary, RepositoryActivitySummary } from './integrationWebhookStore.js';
import { deploymentHealthFromStatus, webhookOnlyHealth } from './integrationWebhookStore.js';
import type { IntegrationLayerHealthMetadata } from './integrationHealth.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseRailwayWebhookEvent(payload: unknown): {
  healthPatch: IntegrationLayerHealthMetadata;
  summary: LastDeploymentEventSummary;
} | null {
  const body = asRecord(payload);
  if (!body) return null;

  const eventType = typeof body.type === 'string' ? body.type : 'unknown';
  const details = asRecord(body.details) ?? {};
  const resource = asRecord(body.resource) ?? {};
  const service = asRecord(resource.service);
  const deployment = asRecord(resource.deployment);

  const deploymentId =
    (typeof deployment?.id === 'string' && deployment.id) ||
    (typeof details.id === 'string' && details.id) ||
    `railway-${Date.now()}`;

  const status =
    (typeof details.status === 'string' && details.status) ||
    eventType.replace(/^Deployment\./i, '') ||
    'unknown';

  const receivedAt = new Date().toISOString();
  const timestamp =
    (typeof body.timestamp === 'string' && body.timestamp) || receivedAt;

  const summary: LastDeploymentEventSummary = {
    id: deploymentId,
    eventType,
    status,
    serviceName: typeof service?.name === 'string' ? service.name : undefined,
    branch: typeof details.branch === 'string' ? details.branch : undefined,
    commitMessage:
      typeof details.commitMessage === 'string' ? details.commitMessage : undefined,
    timestamp,
    receivedAt,
    source: 'webhook',
  };

  const healthPatch =
    eventType.toLowerCase().includes('deployment') && !eventType.toLowerCase().includes('alert')
      ? deploymentHealthFromStatus(status)
      : webhookOnlyHealth();

  return { healthPatch, summary };
}

export function parseVercelWebhookEvent(payload: unknown): {
  healthPatch: IntegrationLayerHealthMetadata;
  summary: LastDeploymentEventSummary;
} | null {
  const body = asRecord(payload);
  if (!body) return null;

  const eventType = typeof body.type === 'string' ? body.type : 'unknown';
  const payloadObj = asRecord(body.payload) ?? body;
  const deployment = asRecord(payloadObj.deployment) ?? payloadObj;

  const deploymentId =
    (typeof deployment.id === 'string' && deployment.id) ||
    (typeof deployment.uid === 'string' && deployment.uid) ||
    `vercel-${Date.now()}`;

  const status =
    (typeof deployment.readyState === 'string' && deployment.readyState) ||
    (typeof deployment.state === 'string' && deployment.state) ||
    eventType.replace(/^deployment\./i, '') ||
    'unknown';

  const receivedAt = new Date().toISOString();
  const createdAt = deployment.createdAt;
  const timestamp =
    typeof createdAt === 'number'
      ? new Date(createdAt).toISOString()
      : typeof createdAt === 'string'
        ? createdAt
        : receivedAt;

  const url =
    typeof deployment.url === 'string'
      ? deployment.url
      : typeof deployment.alias === 'string'
        ? deployment.alias
        : undefined;

  const summary: LastDeploymentEventSummary = {
    id: deploymentId,
    eventType,
    status,
    url,
    branch:
      typeof deployment.meta === 'object' &&
      deployment.meta !== null &&
      typeof (deployment.meta as Record<string, unknown>).githubCommitRef === 'string'
        ? ((deployment.meta as Record<string, unknown>).githubCommitRef as string)
        : undefined,
    commitMessage:
      typeof deployment.meta === 'object' &&
      deployment.meta !== null &&
      typeof (deployment.meta as Record<string, unknown>).githubCommitMessage === 'string'
        ? ((deployment.meta as Record<string, unknown>).githubCommitMessage as string)
        : undefined,
    timestamp,
    receivedAt,
    source: 'webhook',
  };

  const healthPatch = deploymentHealthFromStatus(
    eventType.includes('error') ? 'error' : status,
  );

  return { healthPatch, summary };
}

export function parseGitHubWebhookEvent(
  eventName: string,
  payload: unknown,
  existingMetadata?: unknown,
): {
  healthPatch: IntegrationLayerHealthMetadata;
  activity: RepositoryActivitySummary;
} | null {
  const body = asRecord(payload);
  if (!body) return null;

  const receivedAt = new Date().toISOString();
  const prior = asRecord(existingMetadata);
  const priorActivity = asRecord(prior?.repository_activity) ?? {};

  const activity: RepositoryActivitySummary = {
    updatedAt: receivedAt,
    branchCount:
      typeof priorActivity.branchCount === 'number' ? priorActivity.branchCount : undefined,
    lastPush:
      priorActivity.lastPush && typeof priorActivity.lastPush === 'object'
        ? {
            message: String((priorActivity.lastPush as Record<string, unknown>).message ?? ''),
            author: String((priorActivity.lastPush as Record<string, unknown>).author ?? ''),
            ref:
              typeof (priorActivity.lastPush as Record<string, unknown>).ref === 'string'
                ? ((priorActivity.lastPush as Record<string, unknown>).ref as string)
                : undefined,
            timestamp: String(
              (priorActivity.lastPush as Record<string, unknown>).timestamp ?? receivedAt,
            ),
          }
        : undefined,
    lastPullRequest:
      priorActivity.lastPullRequest && typeof priorActivity.lastPullRequest === 'object'
        ? {
            number: Number(
              (priorActivity.lastPullRequest as Record<string, unknown>).number ?? 0,
            ),
            title: String((priorActivity.lastPullRequest as Record<string, unknown>).title ?? ''),
            state: String((priorActivity.lastPullRequest as Record<string, unknown>).state ?? ''),
            updatedAt: String(
              (priorActivity.lastPullRequest as Record<string, unknown>).updatedAt ?? receivedAt,
            ),
          }
        : undefined,
  };

  const normalized = eventName.toLowerCase();

  if (normalized === 'push') {
    const headCommit = asRecord(body.head_commit);
    const commitAuthor = asRecord(headCommit?.author);
    const ref = typeof body.ref === 'string' ? body.ref : undefined;
    activity.lastPush = {
      message:
        (typeof headCommit?.message === 'string' && headCommit.message.split('\n')[0]) ||
        'Push event',
      author:
        (typeof commitAuthor?.name === 'string' && commitAuthor.name) ||
        (typeof commitAuthor?.username === 'string' && commitAuthor.username) ||
        'unknown',
      ref,
      timestamp:
        (typeof headCommit?.timestamp === 'string' && headCommit.timestamp) || receivedAt,
    };
  } else if (normalized === 'pull_request') {
    const pr = asRecord(body.pull_request);
    if (pr) {
      activity.lastPullRequest = {
        number: typeof pr.number === 'number' ? pr.number : 0,
        title: typeof pr.title === 'string' ? pr.title : 'Pull request',
        state: typeof pr.state === 'string' ? pr.state : 'unknown',
        updatedAt:
          (typeof pr.updated_at === 'string' && pr.updated_at) ||
          (typeof pr.created_at === 'string' && pr.created_at) ||
          receivedAt,
      };
    }
  } else if (normalized === 'create' && body.ref_type === 'branch') {
    const current = activity.branchCount ?? 0;
    activity.branchCount = current + 1;
  }

  return { healthPatch: webhookOnlyHealth(), activity };
}

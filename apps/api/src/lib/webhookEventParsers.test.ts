import { describe, it, expect } from 'vitest';
import {
  parseGitHubWebhookEvent,
  parseRailwayWebhookEvent,
  parseVercelWebhookEvent,
} from './webhookEventParsers.js';

describe('webhookEventParsers', () => {
  it('parseRailwayWebhookEvent maps success to live api + webhooks', () => {
    const parsed = parseRailwayWebhookEvent({
      type: 'Deployment.succeeded',
      timestamp: '2026-06-08T12:00:00.000Z',
      details: { id: 'dep_1', status: 'SUCCESS' },
      resource: { service: { name: 'api' }, deployment: { id: 'dep_1' } },
    });
    expect(parsed?.healthPatch.api?.status).toBe('live');
    expect(parsed?.healthPatch.webhooks?.status).toBe('live');
    expect(parsed?.summary.serviceName).toBe('api');
  });

  it('parseVercelWebhookEvent maps deployment.error to degraded api', () => {
    const parsed = parseVercelWebhookEvent({
      type: 'deployment.error',
      payload: { deployment: { id: 'dpl_1', state: 'ERROR' } },
    });
    expect(parsed?.healthPatch.api?.status).toBe('degraded');
    expect(parsed?.healthPatch.webhooks?.status).toBe('live');
  });

  it('parseGitHubWebhookEvent captures push summary', () => {
    const parsed = parseGitHubWebhookEvent('push', {
      ref: 'refs/heads/main',
      head_commit: {
        message: 'fix: webhook',
        author: { name: 'Author' },
        timestamp: '2026-06-08T12:00:00.000Z',
      },
    });
    expect(parsed?.activity.lastPush?.message).toBe('fix: webhook');
    expect(parsed?.healthPatch.webhooks?.status).toBe('live');
  });
});

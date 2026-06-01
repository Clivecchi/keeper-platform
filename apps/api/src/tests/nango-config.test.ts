import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildConnectSessionBody,
  resolveNangoHost,
  resolveNangoIntegrationId,
  DEFAULT_NANGO_HOST,
} from '../lib/nangoConfig.js';

describe('nangoConfig @smoke', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.NANGO_HOST;
    delete process.env.NANGO_INTEGRATION_GITHUB;
    delete process.env.NANGO_CONNECT_SESSION_TAGS;
  });

  afterEach(() => {
    process.env = env;
  });

  it('resolveNangoHost defaults to self-hosted Keeper Nango', () => {
    expect(resolveNangoHost()).toBe(DEFAULT_NANGO_HOST);
  });

  it('resolveNangoHost strips trailing slash', () => {
    process.env.NANGO_HOST = 'https://services.keeper.domains/';
    expect(resolveNangoHost()).toBe('https://services.keeper.domains');
  });

  it('resolveNangoIntegrationId uses env override', () => {
    process.env.NANGO_INTEGRATION_GITHUB = 'github-app';
    expect(resolveNangoIntegrationId('github')).toBe('github-app');
    expect(resolveNangoIntegrationId('railway')).toBe('railway');
  });

  it('buildConnectSessionBody defaults to legacy end_user shape', () => {
    expect(
      buildConnectSessionBody({
        endUserId: 'user-1',
        organizationId: 'org-1',
        allowedIntegrations: ['railway'],
      }),
    ).toEqual({
      allowed_integrations: ['railway'],
      end_user: { id: 'user-1' },
      organization: { id: 'org-1' },
    });
  });

  it('buildConnectSessionBody uses tags when NANGO_CONNECT_SESSION_TAGS=true', () => {
    process.env.NANGO_CONNECT_SESSION_TAGS = 'true';
    expect(
      buildConnectSessionBody({
        endUserId: 'user-1',
        organizationId: 'org-1',
        allowedIntegrations: ['github'],
      }),
    ).toEqual({
      allowed_integrations: ['github'],
      tags: { end_user_id: 'user-1', organization_id: 'org-1' },
    });
  });
});

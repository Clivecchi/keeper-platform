import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildConnectSessionBody,
  buildConnectSessionLegacyBody,
  connectSessionFailureHint,
  extractNangoErrorMessage,
  resolveNangoHost,
  resolveNangoIntegrationId,
  resolveServiceFromProviderConfigKey,
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

  it('resolveServiceFromProviderConfigKey inverts env override', () => {
    process.env.NANGO_INTEGRATION_GITHUB = 'github-app';
    expect(resolveServiceFromProviderConfigKey('github-app')).toBe('github');
    expect(resolveServiceFromProviderConfigKey('vercel')).toBe('vercel');
  });

  it('buildConnectSessionBody always includes required tags for SDK', () => {
    expect(
      buildConnectSessionBody({
        endUserId: 'user-1',
        organizationId: 'org-1',
        allowedIntegrations: ['railway'],
      }),
    ).toEqual({
      allowed_integrations: ['railway'],
      tags: { end_user_id: 'user-1', organization_id: 'org-1' },
    });
  });

  it('extractNangoErrorMessage parses Nango invalid_body errors', () => {
    const msg = extractNangoErrorMessage({
      error: {
        code: 'invalid_body',
        errors: [
          { code: 'invalid_type', message: 'Required', path: ['end_user'] },
          { code: 'unrecognized_keys', message: "Unrecognized key(s) in object: 'tags'", path: [] },
        ],
      },
    });
    expect(msg).toContain('end_user');
    expect(msg).toContain('tags');
  });

  it('connectSessionFailureHint suggests Nango dashboard for unknown integration', () => {
    expect(connectSessionFailureHint(400, 'integration not found', 'railway')).toContain('railway');
  });

  it('buildConnectSessionLegacyBody uses end_user for self-hosted Nango', () => {
    expect(
      buildConnectSessionLegacyBody({
        endUserId: 'user-1',
        organizationId: 'org-1',
        allowedIntegrations: ['github'],
      }),
    ).toEqual({
      allowed_integrations: ['github'],
      end_user: { id: 'user-1' },
      organization: { id: 'org-1' },
    });
  });
});

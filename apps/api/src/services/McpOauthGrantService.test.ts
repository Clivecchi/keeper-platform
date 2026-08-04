import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  filterRequestedScopes,
  parseScopeParam,
  redirectUriAllowed,
  signConsentTicket,
  verifyConsentTicket,
  verifyPkceS256,
} from './McpOauthGrantService.js';

describe('McpOauthGrantService helpers', () => {
  it('verifies PKCE S256', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(verifyPkceS256(verifier, 'wrong')).toBe(false);
  });

  it('filters scopes to DomainAccessKey set', () => {
    expect(filterRequestedScopes(['library.ro', 'admin', 'gloss.rw'])).toEqual([
      'library.ro',
      'gloss.rw',
    ]);
  });

  it('parses scope query with + separators', () => {
    expect(parseScopeParam('library.ro+library.rw+gloss.rw')).toEqual([
      'library.ro',
      'library.rw',
      'gloss.rw',
    ]);
  });

  it('allows loopback redirect URIs with any port', () => {
    expect(
      redirectUriAllowed(
        ['http://localhost/callback', 'http://127.0.0.1/callback'],
        'http://localhost:3118/callback',
      ),
    ).toBe(true);
    expect(
      redirectUriAllowed(
        ['https://claude.ai/api/mcp/auth_callback'],
        'https://claude.ai/api/mcp/auth_callback',
      ),
    ).toBe(true);
    expect(
      redirectUriAllowed(
        ['https://claude.ai/api/mcp/auth_callback'],
        'https://evil.example/callback',
      ),
    ).toBe(false);
  });

  it('round-trips consent tickets', () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-oauth';
    const ticket = signConsentTicket({
      client_id: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'abc',
      code_challenge_method: 'S256',
      scope: 'library.ro',
      state: 'xyz',
      resource: 'https://api.ke3p.com/mcp',
    });
    const parsed = verifyConsentTicket(ticket);
    expect(parsed?.client_id).toContain('claude.ai');
    expect(parsed?.state).toBe('xyz');
    expect(verifyConsentTicket('tampered.sig')).toBeNull();
  });
});

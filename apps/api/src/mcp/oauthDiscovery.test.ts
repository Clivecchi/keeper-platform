import { describe, expect, it } from 'vitest';
import { DOMAIN_ACCESS_KEY_SCOPES } from '@keeper/shared';
import {
  MCP_OAUTH_ISSUER,
  MCP_OAUTH_PROTECTED_RESOURCE_METADATA_URL,
  MCP_OAUTH_RESOURCE,
  buildAuthorizationServerMetadata,
  buildMcpOauthWwwAuthenticate,
  buildProtectedResourceMetadata,
  mcpOauthWwwAuthenticateScope,
} from './oauthDiscovery.js';

describe('oauthDiscovery (Phase A)', () => {
  it('uses canonical MCP resource URL', () => {
    expect(MCP_OAUTH_RESOURCE).toBe('https://api.ke3p.com/mcp');
    expect(buildProtectedResourceMetadata().resource).toBe(MCP_OAUTH_RESOURCE);
  });

  it('PRM lists issuer and DomainAccessKey scopes', () => {
    const prm = buildProtectedResourceMetadata();
    expect(prm.authorization_servers).toEqual([MCP_OAUTH_ISSUER]);
    expect(prm.scopes_supported).toEqual([...DOMAIN_ACCESS_KEY_SCOPES]);
    expect(prm.bearer_methods_supported).toEqual(['header']);
  });

  it('AS metadata advertises PKCE S256, DCR, and CIMD flags', () => {
    const as = buildAuthorizationServerMetadata();
    expect(as.issuer).toBe('https://api.ke3p.com');
    expect(as.authorization_endpoint).toBe('https://api.ke3p.com/oauth/authorize');
    expect(as.token_endpoint).toBe('https://api.ke3p.com/oauth/token');
    expect(as.registration_endpoint).toBe('https://api.ke3p.com/oauth/register');
    expect(as.code_challenge_methods_supported).toEqual(['S256']);
    expect(as.token_endpoint_auth_methods_supported).toContain('none');
    expect(as.client_id_metadata_document_supported).toBe(true);
    expect(as.scopes_supported).toEqual([...DOMAIN_ACCESS_KEY_SCOPES]);
  });

  it('WWW-Authenticate points at PRM with space-delimited scopes', () => {
    const header = buildMcpOauthWwwAuthenticate();
    expect(header).toContain(
      `resource_metadata="${MCP_OAUTH_PROTECTED_RESOURCE_METADATA_URL}"`,
    );
    expect(header).toContain(`scope="${mcpOauthWwwAuthenticateScope()}"`);
    expect(header.startsWith('Bearer ')).toBe(true);
  });
});

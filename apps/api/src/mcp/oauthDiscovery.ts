/**
 * MCP OAuth 2.1 discovery (Phase A) — Protected Resource Metadata + AS metadata stubs.
 * Authorize/token/register endpoints are listed for discovery; Phase B implements them.
 */

import { DOMAIN_ACCESS_KEY_SCOPES } from '@keeper/shared';

/** Canonical MCP resource URL — must match connector paste + PRM `resource` exactly. */
export const MCP_OAUTH_RESOURCE = 'https://api.ke3p.com/mcp' as const;

/** Issuer / authorization server identifier (RFC 8414). */
export const MCP_OAUTH_ISSUER = 'https://api.ke3p.com' as const;

/** Absolute URL of the Protected Resource Metadata document. */
export const MCP_OAUTH_PROTECTED_RESOURCE_METADATA_URL =
  'https://api.ke3p.com/.well-known/oauth-protected-resource' as const;

export const MCP_OAUTH_SCOPES: readonly string[] = DOMAIN_ACCESS_KEY_SCOPES;

/** Space-delimited scopes for WWW-Authenticate (RFC 6750). */
export function mcpOauthWwwAuthenticateScope(): string {
  return MCP_OAUTH_SCOPES.join(' ');
}

/**
 * RFC 6750 Bearer challenge pointing clients at Protected Resource Metadata.
 */
export function buildMcpOauthWwwAuthenticate(): string {
  const scope = mcpOauthWwwAuthenticateScope();
  return `Bearer resource_metadata="${MCP_OAUTH_PROTECTED_RESOURCE_METADATA_URL}", scope="${scope}"`;
}

/** RFC 9728 OAuth 2.0 Protected Resource Metadata. */
export type ProtectedResourceMetadata = {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
  resource_documentation?: string;
};

export function buildProtectedResourceMetadata(): ProtectedResourceMetadata {
  return {
    resource: MCP_OAUTH_RESOURCE,
    authorization_servers: [MCP_OAUTH_ISSUER],
    scopes_supported: [...MCP_OAUTH_SCOPES],
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://api.ke3p.com/mcp/health',
  };
}

/** RFC 8414 Authorization Server Metadata (Phase A stub endpoints). */
export type AuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  scopes_supported: string[];
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  revocation_endpoint: string;
  client_id_metadata_document_supported: boolean;
};

export function buildAuthorizationServerMetadata(): AuthorizationServerMetadata {
  return {
    issuer: MCP_OAUTH_ISSUER,
    authorization_endpoint: `${MCP_OAUTH_ISSUER}/oauth/authorize`,
    token_endpoint: `${MCP_OAUTH_ISSUER}/oauth/token`,
    registration_endpoint: `${MCP_OAUTH_ISSUER}/oauth/register`,
    scopes_supported: [...MCP_OAUTH_SCOPES],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    // `none` required for Claude CIMD public clients; secrets for confidential clients later
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    revocation_endpoint: `${MCP_OAUTH_ISSUER}/oauth/revoke`,
    client_id_metadata_document_supported: true,
  };
}

/**
 * MCP OAuth grants — auth codes, access/refresh tokens, CIMD/DCR clients.
 * Option B: same { domainId, scopes } shape as DomainAccessKey for resolveMcpAuth.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@keeper/database';
import {
  DOMAIN_ACCESS_KEY_SCOPES,
  isDomainAccessKeyScope,
  type McpOAuthGrantRecord,
} from '@keeper/shared';
import { MCP_OAUTH_RESOURCE } from '../mcp/oauthDiscovery.js';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ACCESS_PREFIX = 'keeper_oat_';
const REFRESH_PREFIX = 'keeper_ort_';
const CODE_PREFIX = 'keeper_oac_';

export type ResolvedOauthClient = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  token_endpoint_auth_method: string;
  client_secret_hash: string | null;
  source: 'cimd' | 'dcr';
};

export type GrantableDomain = {
  id: string;
  name: string;
  slug: string;
};

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hmacSign(payload: string): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error('JWT_SECRET is required for OAuth consent signing');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function hashOauthSecret(raw: string): string {
  return sha256Hex(raw.trim());
}

export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash('sha256').update(codeVerifier).digest('base64url');
  if (computed.length !== codeChallenge.length) return false;
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(codeChallenge));
  } catch {
    return false;
  }
}

export function isOauthAccessToken(raw: string): boolean {
  return raw.trim().startsWith(ACCESS_PREFIX);
}

export function isOauthRefreshToken(raw: string): boolean {
  return raw.trim().startsWith(REFRESH_PREFIX);
}

function toGrantRecord(row: {
  id: string;
  domain_id: string;
  user_id: string;
  client_id: string;
  client_name: string | null;
  scopes: string[];
  status: string;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): McpOAuthGrantRecord {
  return {
    id: row.id,
    domain_id: row.domain_id,
    user_id: row.user_id,
    client_id: row.client_id,
    client_name: row.client_name,
    scopes: row.scopes,
    status: row.status === 'revoked' ? 'revoked' : 'active',
    last_used_at: row.last_used_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function filterRequestedScopes(requested: string[]): string[] {
  const scopes = requested.filter(isDomainAccessKeyScope);
  return [...new Set(scopes)];
}

export function parseScopeParam(scope: string | undefined): string[] {
  if (!scope?.trim()) return [...DOMAIN_ACCESS_KEY_SCOPES];
  return filterRequestedScopes(scope.split(/[\s+]+/).filter(Boolean));
}

export async function listGrantableDomains(userId: string): Promise<GrantableDomain[]> {
  const owned = await prisma.domain.findMany({
    where: { ownerId: userId, deletedAt: null, isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  const perms = await prisma.domainPermission.findMany({
    where: {
      userId,
      OR: [{ role: { in: ['admin', 'owner'] } }, { permissions: { has: 'admin' } }],
    },
    include: {
      Domain: {
        select: { id: true, name: true, slug: true, deletedAt: true, isActive: true },
      },
    },
  });

  const byId = new Map<string, GrantableDomain>();
  for (const d of owned) byId.set(d.id, d);
  for (const p of perms) {
    const d = p.Domain;
    if (!d || d.deletedAt || !d.isActive) continue;
    byId.set(d.id, { id: d.id, name: d.name, slug: d.slug });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function userCanGrantDomain(userId: string, domainId: string): Promise<boolean> {
  const domains = await listGrantableDomains(userId);
  return domains.some((d) => d.id === domainId);
}

function looksLikeHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Resolve client via CIMD URL fetch or DCR registry. */
export async function resolveOauthClient(clientId: string): Promise<ResolvedOauthClient | null> {
  const trimmed = clientId.trim();
  if (!trimmed) return null;

  if (looksLikeHttpsUrl(trimmed)) {
    return resolveCimdClient(trimmed);
  }

  const row = await prisma.mcpOAuthClient.findUnique({ where: { client_id: trimmed } });
  if (!row) return null;
  return {
    client_id: row.client_id,
    client_name: row.client_name,
    redirect_uris: row.redirect_uris,
    token_endpoint_auth_method: row.token_endpoint_auth_method,
    client_secret_hash: row.client_secret_hash,
    source: row.source === 'cimd' ? 'cimd' : 'dcr',
  };
}

async function resolveCimdClient(clientIdUrl: string): Promise<ResolvedOauthClient | null> {
  const cached = await prisma.mcpOAuthClient.findUnique({ where: { client_id: clientIdUrl } });
  // Always re-fetch CIMD for redirect_uri freshness (Claude may rotate ports for Code)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(clientIdUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      if (cached) {
        return {
          client_id: cached.client_id,
          client_name: cached.client_name,
          redirect_uris: cached.redirect_uris,
          token_endpoint_auth_method: cached.token_endpoint_auth_method,
          client_secret_hash: null,
          source: 'cimd',
        };
      }
      return null;
    }
    const body = (await res.json()) as Record<string, unknown>;
    const docClientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';
    if (docClientId && docClientId !== clientIdUrl) {
      console.warn('[mcp-oauth:cimd] client_id mismatch', { expected: clientIdUrl, got: docClientId });
      return null;
    }
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.filter((u): u is string => typeof u === 'string')
      : [];
    if (redirectUris.length === 0) return null;

    const clientName =
      typeof body.client_name === 'string'
        ? body.client_name
        : (() => {
            try {
              return new URL(clientIdUrl).hostname;
            } catch {
              return 'OAuth client';
            }
          })();
    const authMethod =
      typeof body.token_endpoint_auth_method === 'string'
        ? body.token_endpoint_auth_method
        : 'none';

    await prisma.mcpOAuthClient.upsert({
      where: { client_id: clientIdUrl },
      create: {
        client_id: clientIdUrl,
        client_name: clientName,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: authMethod,
        source: 'cimd',
      },
      update: {
        client_name: clientName,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: authMethod,
        source: 'cimd',
      },
    });

    return {
      client_id: clientIdUrl,
      client_name: clientName,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: authMethod,
      client_secret_hash: null,
      source: 'cimd',
    };
  } catch (err) {
    console.warn('[mcp-oauth:cimd] fetch failed', err);
    if (cached) {
      return {
        client_id: cached.client_id,
        client_name: cached.client_name,
        redirect_uris: cached.redirect_uris,
        token_endpoint_auth_method: cached.token_endpoint_auth_method,
        client_secret_hash: null,
        source: 'cimd',
      };
    }
    return null;
  }
}

/** Loopback redirect URIs may use any port (RFC 8252). */
export function redirectUriAllowed(registered: string[], requested: string): boolean {
  if (registered.includes(requested)) return true;
  let reqUrl: URL;
  try {
    reqUrl = new URL(requested);
  } catch {
    return false;
  }
  const isLoopback =
    reqUrl.hostname === '127.0.0.1' ||
    reqUrl.hostname === 'localhost' ||
    reqUrl.hostname === '[::1]';
  if (!isLoopback) return false;

  for (const reg of registered) {
    try {
      const r = new URL(reg);
      if (
        (r.hostname === '127.0.0.1' || r.hostname === 'localhost' || r.hostname === '[::1]') &&
        r.protocol === reqUrl.protocol &&
        r.pathname === reqUrl.pathname
      ) {
        return true;
      }
    } catch {
      /* skip */
    }
  }
  return false;
}

export function validateResourceParam(resource: string | undefined): boolean {
  if (!resource) return true; // optional for some clients
  return resource === MCP_OAUTH_RESOURCE;
}

export type ConsentTicketPayload = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  state: string;
  resource: string;
  exp: number;
};

export function signConsentTicket(payload: Omit<ConsentTicketPayload, 'exp'>): string {
  const full: ConsentTicketPayload = { ...payload, exp: Date.now() + 30 * 60 * 1000 };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  return `${body}.${hmacSign(body)}`;
}

export function verifyConsentTicket(ticket: string): ConsentTicketPayload | null {
  const [body, sig] = ticket.split('.');
  if (!body || !sig) return null;
  const expected = hmacSign(body);
  if (expected.length !== sig.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ConsentTicketPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createAuthorizationCode(params: {
  clientId: string;
  userId: string;
  domainId: string;
  scopes: string[];
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource?: string | null;
}): Promise<string> {
  const code = `${CODE_PREFIX}${randomBytes(32).toString('base64url')}`;
  await prisma.mcpOAuthAuthorizationCode.create({
    data: {
      code_hash: hashOauthSecret(code),
      client_id: params.clientId,
      user_id: params.userId,
      domain_id: params.domainId,
      scopes: params.scopes,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: params.codeChallengeMethod,
      resource: params.resource ?? MCP_OAUTH_RESOURCE,
      expires_at: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });
  return code;
}

export async function exchangeAuthorizationCode(params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  clientSecret?: string | null;
}): Promise<{ access_token: string; refresh_token: string; expires_in: number; scope: string } | null> {
  const row = await prisma.mcpOAuthAuthorizationCode.findUnique({
    where: { code_hash: hashOauthSecret(params.code) },
  });
  if (!row || row.consumed_at || row.expires_at.getTime() < Date.now()) return null;
  if (row.client_id !== params.clientId) return null;
  if (row.redirect_uri !== params.redirectUri) return null;
  if (row.code_challenge_method !== 'S256') return null;
  if (!verifyPkceS256(params.codeVerifier, row.code_challenge)) return null;

  const client = await resolveOauthClient(params.clientId);
  if (!client) return null;
  if (client.token_endpoint_auth_method !== 'none' && client.client_secret_hash) {
    const secret = params.clientSecret?.trim() ?? '';
    if (!secret || hashOauthSecret(secret) !== client.client_secret_hash) return null;
  }

  await prisma.mcpOAuthAuthorizationCode.update({
    where: { id: row.id },
    data: { consumed_at: new Date() },
  });

  return issueTokensForGrant({
    userId: row.user_id,
    domainId: row.domain_id,
    clientId: row.client_id,
    clientName: client.client_name,
    scopes: row.scopes,
  });
}

async function issueTokensForGrant(params: {
  userId: string;
  domainId: string;
  clientId: string;
  clientName: string | null;
  scopes: string[];
  existingGrantId?: string;
}): Promise<{ access_token: string; refresh_token: string; expires_in: number; scope: string }> {
  const accessToken = `${ACCESS_PREFIX}${randomBytes(32).toString('base64url')}`;
  const refreshToken = `${REFRESH_PREFIX}${randomBytes(32).toString('base64url')}`;
  const accessExpires = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const grant = params.existingGrantId
    ? await prisma.mcpOAuthGrant.update({
        where: { id: params.existingGrantId },
        data: {
          scopes: params.scopes,
          status: 'active',
          refresh_token_hash: hashOauthSecret(refreshToken),
          refresh_expires_at: refreshExpires,
          last_used_at: new Date(),
          client_name: params.clientName,
        },
      })
    : await prisma.mcpOAuthGrant.create({
        data: {
          domain_id: params.domainId,
          user_id: params.userId,
          client_id: params.clientId,
          client_name: params.clientName,
          scopes: params.scopes,
          status: 'active',
          refresh_token_hash: hashOauthSecret(refreshToken),
          refresh_expires_at: refreshExpires,
          last_used_at: new Date(),
        },
      });

  await prisma.mcpOAuthAccessToken.create({
    data: {
      token_hash: hashOauthSecret(accessToken),
      grant_id: grant.id,
      expires_at: accessExpires,
    },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scope: params.scopes.join(' '),
  };
}

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret?: string | null;
}): Promise<{ access_token: string; refresh_token: string; expires_in: number; scope: string } | null> {
  if (!isOauthRefreshToken(params.refreshToken)) return null;
  const grant = await prisma.mcpOAuthGrant.findFirst({
    where: {
      refresh_token_hash: hashOauthSecret(params.refreshToken),
      status: 'active',
    },
  });
  if (!grant || !grant.refresh_expires_at || grant.refresh_expires_at.getTime() < Date.now()) {
    return null;
  }
  if (grant.client_id !== params.clientId) return null;

  const client = await resolveOauthClient(params.clientId);
  if (!client) return null;
  if (client.token_endpoint_auth_method !== 'none' && client.client_secret_hash) {
    const secret = params.clientSecret?.trim() ?? '';
    if (!secret || hashOauthSecret(secret) !== client.client_secret_hash) return null;
  }

  return issueTokensForGrant({
    userId: grant.user_id,
    domainId: grant.domain_id,
    clientId: grant.client_id,
    clientName: grant.client_name,
    scopes: grant.scopes,
    existingGrantId: grant.id,
  });
}

export async function authenticateOauthAccessToken(raw: string): Promise<{
  domainId: string;
  scopes: string[];
  grantId: string;
  userId: string;
} | null> {
  if (!isOauthAccessToken(raw)) return null;
  const token = await prisma.mcpOAuthAccessToken.findUnique({
    where: { token_hash: hashOauthSecret(raw) },
    include: { grant: true },
  });
  if (!token) return null;
  if (token.expires_at.getTime() < Date.now()) return null;
  if (token.grant.status !== 'active') return null;

  void prisma.mcpOAuthGrant
    .update({
      where: { id: token.grant_id },
      data: { last_used_at: new Date() },
    })
    .catch((err) => console.warn('[mcp-oauth:last_used]', err));

  return {
    domainId: token.grant.domain_id,
    scopes: token.grant.scopes,
    grantId: token.grant.id,
    userId: token.grant.user_id,
  };
}

export async function listOauthGrants(domainId: string): Promise<McpOAuthGrantRecord[]> {
  const rows = await prisma.mcpOAuthGrant.findMany({
    where: { domain_id: domainId },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(toGrantRecord);
}

export async function revokeOauthGrant(params: {
  domainId: string;
  id: string;
}): Promise<McpOAuthGrantRecord> {
  const row = await prisma.mcpOAuthGrant.updateMany({
    where: { id: params.id, domain_id: params.domainId },
    data: {
      status: 'revoked',
      refresh_token_hash: null,
      refresh_expires_at: null,
    },
  });
  if (row.count === 0) throw new Error('Grant not found');
  const updated = await prisma.mcpOAuthGrant.findUniqueOrThrow({ where: { id: params.id } });
  await prisma.mcpOAuthAccessToken.deleteMany({ where: { grant_id: params.id } });
  return toGrantRecord(updated);
}

export async function revokeByToken(token: string): Promise<boolean> {
  const trimmed = token.trim();
  if (isOauthRefreshToken(trimmed)) {
    const grant = await prisma.mcpOAuthGrant.findFirst({
      where: { refresh_token_hash: hashOauthSecret(trimmed) },
    });
    if (!grant) return false;
    await revokeOauthGrant({ domainId: grant.domain_id, id: grant.id });
    return true;
  }
  if (isOauthAccessToken(trimmed)) {
    const access = await prisma.mcpOAuthAccessToken.findUnique({
      where: { token_hash: hashOauthSecret(trimmed) },
    });
    if (!access) return false;
    const grant = await prisma.mcpOAuthGrant.findUnique({ where: { id: access.grant_id } });
    if (!grant) return false;
    await revokeOauthGrant({ domainId: grant.domain_id, id: grant.id });
    return true;
  }
  return false;
}

export async function registerDynamicClient(body: {
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method?: string;
}): Promise<{
  client_id: string;
  client_secret?: string;
  client_name: string | null;
  redirect_uris: string[];
  token_endpoint_auth_method: string;
}> {
  const redirectUris = body.redirect_uris.filter((u) => typeof u === 'string' && u.length > 0);
  if (redirectUris.length === 0) throw new Error('redirect_uris required');

  const authMethod = body.token_endpoint_auth_method ?? 'none';
  const clientId = `dak_dcr_${randomBytes(16).toString('base64url')}`;
  let clientSecret: string | undefined;
  let clientSecretHash: string | null = null;
  if (authMethod !== 'none') {
    clientSecret = randomBytes(32).toString('base64url');
    clientSecretHash = hashOauthSecret(clientSecret);
  }

  await prisma.mcpOAuthClient.create({
    data: {
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      client_name: body.client_name?.trim() || null,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: authMethod,
      source: 'dcr',
    },
  });

  return {
    client_id: clientId,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
    client_name: body.client_name?.trim() || null,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: authMethod,
  };
}

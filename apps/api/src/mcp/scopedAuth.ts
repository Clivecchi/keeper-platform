/**
 * MCP scoped auth — platform key, legacy env keys, and domain-managed access keys.
 *
 * Rationale: docs/library-shared-context-roadmap.md
 * Domain keys: `DomainAccessKey` table + Domain Config UI (preferred).
 * Legacy env `KAM_LIBRARY_MCP_KEYS` retained for migration.
 */

import type { Request } from 'express';
import { authenticateDomainAccessKey } from '../services/DomainAccessKeyService.js';

export type McpAuthMode = 'platform' | 'scoped' | 'domain';

export type McpAuthContext = {
  mode: McpAuthMode;
  domainId: string | null;
  scopes: string[];
  keyId?: string;
};

type ScopedLibraryKey = {
  key: string;
  domainId: string;
  scopes: string[];
};

let cachedScopedKeys: ScopedLibraryKey[] | null = null;

function loadScopedLibraryKeysFromEnv(): ScopedLibraryKey[] {
  if (cachedScopedKeys) return cachedScopedKeys;
  const raw = process.env.KAM_LIBRARY_MCP_KEYS?.trim();
  if (!raw) {
    cachedScopedKeys = [];
    return cachedScopedKeys;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedScopedKeys = [];
      return cachedScopedKeys;
    }
    cachedScopedKeys = parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const row = entry as Record<string, unknown>;
        const key = typeof row.key === 'string' ? row.key.trim() : '';
        const domainId = typeof row.domainId === 'string' ? row.domainId.trim() : '';
        const scopes = Array.isArray(row.scopes)
          ? row.scopes.filter((s): s is string => typeof s === 'string')
          : [];
        if (!key || !domainId || scopes.length === 0) return null;
        return { key, domainId, scopes };
      })
      .filter((row): row is ScopedLibraryKey => row !== null);
    return cachedScopedKeys;
  } catch {
    cachedScopedKeys = [];
    return cachedScopedKeys;
  }
}

function resolveEnvScopedKey(apiKey: string, headerDomain: string | null): McpAuthContext | null {
  const match = loadScopedLibraryKeysFromEnv().find((row) => row.key === apiKey);
  if (!match) return null;

  const domainId = headerDomain ?? match.domainId;
  if (domainId !== match.domainId) return null;

  return {
    mode: 'scoped',
    domainId: match.domainId,
    scopes: match.scopes,
  };
}

export async function resolveMcpAuth(req: Request): Promise<McpAuthContext | null> {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
  const apiKey = ((req.headers['x-api-key'] as string) || bearer || '').trim();
  if (!apiKey) return null;

  const headerDomain =
    (req.headers['x-domain-id'] as string | undefined)?.trim() || null;

  const platformKey = process.env.OPAI_AGENT_MCP_KEY?.trim();
  if (platformKey && apiKey === platformKey) {
    return {
      mode: 'platform',
      domainId: headerDomain,
      scopes: ['*'],
    };
  }

  const domainMatch = await authenticateDomainAccessKey(apiKey);
  if (domainMatch) {
    const effectiveDomain = headerDomain ?? domainMatch.domainId;
    if (effectiveDomain !== domainMatch.domainId) return null;
    return {
      mode: 'domain',
      domainId: domainMatch.domainId,
      scopes: domainMatch.scopes,
      keyId: domainMatch.keyId,
    };
  }

  return resolveEnvScopedKey(apiKey, headerDomain);
}

export function mcpAuthHasScope(ctx: McpAuthContext, scope: string): boolean {
  if (ctx.scopes.includes('*')) return true;
  return ctx.scopes.includes(scope);
}

/** Test helper — reset env key cache */
export function resetMcpScopedKeyCacheForTests(): void {
  cachedScopedKeys = null;
}

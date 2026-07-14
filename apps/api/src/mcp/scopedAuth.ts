/**
 * MCP scoped auth — KAM-style domain-bound tokens for external Library access.
 *
 * Rationale (see docs/library-shared-context-roadmap.md):
 * - OPAI_AGENT_MCP_KEY is a single shared secret — fine for in-platform agents, not external tools.
 * - Scoped keys carry explicit domainId + scopes (library.ro / library.rw) so Cursor/Claude cannot cross domains.
 *
 * Env: KAM_LIBRARY_MCP_KEYS — JSON array:
 * [{ "key": "...", "domainId": "...", "scopes": ["library.ro"] }]
 */

import type { Request } from 'express';

export type McpAuthMode = 'platform' | 'scoped';

export type McpAuthContext = {
  mode: McpAuthMode;
  domainId: string | null;
  scopes: string[];
};

type ScopedLibraryKey = {
  key: string;
  domainId: string;
  scopes: string[];
};

let cachedScopedKeys: ScopedLibraryKey[] | null = null;

function loadScopedLibraryKeys(): ScopedLibraryKey[] {
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

export function resolveMcpAuth(req: Request): McpAuthContext | null {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
  const apiKey = ((req.headers['x-api-key'] as string) || bearer || '').trim();
  if (!apiKey) return null;

  const platformKey = process.env.OPAI_AGENT_MCP_KEY?.trim();
  if (platformKey && apiKey === platformKey) {
    const headerDomain =
      (req.headers['x-domain-id'] as string | undefined)?.trim() || null;
    return {
      mode: 'platform',
      domainId: headerDomain,
      scopes: ['*'],
    };
  }

  const match = loadScopedLibraryKeys().find((row) => row.key === apiKey);
  if (!match) return null;

  const headerDomain =
    (req.headers['x-domain-id'] as string | undefined)?.trim() || match.domainId;

  if (headerDomain !== match.domainId) {
    return null;
  }

  return {
    mode: 'scoped',
    domainId: match.domainId,
    scopes: match.scopes,
  };
}

export function mcpAuthHasScope(ctx: McpAuthContext, scope: string): boolean {
  if (ctx.scopes.includes('*')) return true;
  return ctx.scopes.includes(scope);
}

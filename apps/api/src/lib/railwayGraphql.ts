/**
 * Shared Railway Public API GraphQL client helpers.
 *
 * Auth:
 * - Account / workspace tokens → Authorization: Bearer
 * - Project tokens → Project-Access-Token
 *
 * Endpoint: https://backboard.railway.com/graphql/v2 (canonical; .app is legacy and
 * often returns "Not Authorized" for the same token).
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';

export const RAILWAY_GRAPHQL_URL = 'https://backboard.railway.com/graphql/v2';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RailwayTokenKind = 'account' | 'workspace' | 'project';

/**
 * Resolve token kind from RAILWAY_TOKEN_KIND override, else heuristic:
 * UUID-shaped tokens are treated as project tokens.
 */
export function resolveRailwayTokenKind(token: string): RailwayTokenKind {
  const override = process.env.RAILWAY_TOKEN_KIND?.trim().toLowerCase();
  if (override === 'project') return 'project';
  if (override === 'workspace') return 'workspace';
  if (override === 'account') return 'account';
  return UUID_RE.test(token.trim()) ? 'project' : 'account';
}

/** Build auth headers for the Railway GraphQL Public API. */
export function buildRailwayAuthHeaders(token: string): Record<string, string> {
  const kind = resolveRailwayTokenKind(token);
  if (kind === 'project') {
    return { 'Project-Access-Token': token.trim() };
  }
  return { Authorization: `Bearer ${token.trim()}` };
}

export type RailwayGraphqlError = Error & {
  railwayStatus?: number;
  railwayMessages?: string[];
};

/**
 * Execute a Railway GraphQL query/mutation against the public API.
 * Requires RAILWAY_TOKEN. Project-scoped calls also need RAILWAY_PROJECT_ID
 * (validated by callers that need it).
 */
export async function railwayGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env.RAILWAY_TOKEN?.trim();
  if (!token) {
    throw new Error('RAILWAY_TOKEN is not configured');
  }

  const res = await fetchWithTimeout(RAILWAY_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      ...buildRailwayAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let payload: { data?: T; errors?: Array<{ message: string }> };
  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new Error(`Railway GraphQL invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || payload.errors?.length) {
    const messages = payload.errors?.map((e) => e.message).filter(Boolean) ?? [];
    const msg = messages.join('; ') || text.slice(0, 300);
    const err = new Error(`Railway GraphQL error (${res.status}): ${msg}`) as RailwayGraphqlError;
    err.railwayStatus = res.status;
    err.railwayMessages = messages;
    throw err;
  }

  if (!payload.data) {
    throw new Error('Railway GraphQL returned no data');
  }

  return payload.data;
}

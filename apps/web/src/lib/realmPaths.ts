/**
 * Realm URL paths — platform hosts use `/d/:slug`; brand hosts use `/` (hostname is the realm).
 */

import { usesCleanRealmPaths } from './platformHost';
export type RealmPathMode = 'platform' | 'brand';

export { usesCleanRealmPaths };

export function getRealmPathMode(hostname?: string): RealmPathMode {
  return usesCleanRealmPaths(hostname) ? 'brand' : 'platform';
}

function toSearchParams(search?: URLSearchParams | string): URLSearchParams {
  if (!search) return new URLSearchParams();
  if (typeof search === 'string') {
    const raw = search.startsWith('?') ? search.slice(1) : search;
    return new URLSearchParams(raw);
  }
  return new URLSearchParams(search);
}

/** Shell path for a realm — `/` on brand hosts, `/d/:slug` on platform. */
export function buildRealmShellPath(
  slug: string,
  search?: URLSearchParams | string,
  hostname?: string,
): string {
  const params = toSearchParams(search);
  const q = params.toString();

  if (usesCleanRealmPaths(hostname)) {
    return q ? `/?${q}` : '/';
  }

  return `/d/${encodeURIComponent(slug)}${q ? `?${q}` : ''}`;
}

export function buildRealmBoardPath(
  slug: string,
  board: string,
  search?: URLSearchParams,
  hostname?: string,
): string {
  const params = toSearchParams(search);
  params.set('board', board);
  return buildRealmShellPath(slug, params, hostname);
}

/** Strip `/d/:slug` prefix on brand hosts — preserves query string. */
export function normalizeRealmPathname(pathname: string, search: string, hostname?: string): string {
  if (!usesCleanRealmPaths(hostname)) return `${pathname}${search}`;
  const match = pathname.match(/^\/d\/[^/]+/);
  if (!match) return `${pathname}${search}`;
  return search || '/';
}

/**
 * V0 shell routing modes.
 *
 * - `home` — user-scoped Home at `/home` (one Realm per user; slug not in URL).
 * - `domain` — domain workspace at `/d/:slug?board=*` (platform hosts).
 * - `brand` — brand URL at `/` (slug from hostname; livecchi.us, *.keeper.domains).
 */

export type V0ShellMode = "domain" | "home" | "brand"

export const HOME_PATH = "/home" as const

/** Optional anchor domain on `/home` — `?domain=:slug` */
export const HOME_DOMAIN_PARAM = "domain" as const

export const DEFAULT_HOME_DISPLAY_NAME = "Home" as const

export function buildHomePath(search?: URLSearchParams | string): string {
  if (!search) return HOME_PATH
  const q =
    typeof search === "string"
      ? search.startsWith("?")
        ? search.slice(1)
        : search
      : search.toString()
  return q ? `${HOME_PATH}?${q}` : HOME_PATH
}

import { buildRealmBoardPath } from "../../lib/realmPaths"

export function buildDomainBoardPath(
  domainSlug: string,
  board: string,
  search?: URLSearchParams,
): string {
  return buildRealmBoardPath(domainSlug, board, search)
}

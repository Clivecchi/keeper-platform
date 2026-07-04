/**
 * V0 shell routing modes.
 *
 * - `home` — user-scoped Home at `/home` (one Realm per user; slug not in URL).
 * - `domain` — domain workspace at `/d/:slug?board=*`.
 */

export type V0ShellMode = "domain" | "home"

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

export function buildDomainBoardPath(
  domainSlug: string,
  board: string,
  search?: URLSearchParams,
): string {
  const params = new URLSearchParams(search ?? undefined)
  params.set("board", board)
  const q = params.toString()
  return `/d/${encodeURIComponent(domainSlug)}${q ? `?${q}` : ""}`
}

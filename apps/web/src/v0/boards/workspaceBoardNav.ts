/**
 * workspaceBoardNav
 * -----------------
 * URL contract for workspace navigation.
 *
 * `?board=`     — active workspace (Realm · Domain · Build · Design · Agent). Top bar only.
 * `?definition=` — Design workspace only: which built-in board *spec* is selected in nav.
 *
 * Legacy `?boardDef=` is read for deep links and stripped on write.
 * Do not use `board` for both — that caused Build workspace vs "Build Board" spec collisions.
 *
 * ## Build board migration (2026-08-17)
 * Internal routing/storage key remains `ide` (kipMode, session resume, capability ceilings,
 * TypeScript board ids). Display label is **Build**. Canonical URL write is `?board=build`;
 * `?board=ide` continues to parse as the same workspace so existing bookmarks and stored
 * links do not break. No database migration — board id is not a persisted user preference.
 */

import { buildRealmShellPath } from "../../lib/realmPaths"

export type WorkspaceBoardId = "domain" | "realm" | "ide" | "designer" | "agent"

/** Canonical URL param for the Build workspace (internal id stays `ide`). */
export const BUILD_BOARD_URL_PARAM = "build"

export const WORKSPACE_BOARD_IDS: WorkspaceBoardId[] = [
  "domain",
  "realm",
  "ide",
  "designer",
  "agent",
]

/** Member-facing boards that use adaptive UniversalBoard mobile panel layout (≤767px). */
export const MEMBER_MOBILE_BOARD_IDS = ["domain", "realm"] as const
export type MemberMobileBoardId = (typeof MEMBER_MOBILE_BOARD_IDS)[number]

export function isMemberMobileBoard(
  boardId: string | null | undefined,
): boardId is MemberMobileBoardId {
  return boardId === "domain" || boardId === "realm"
}

export function usesAdaptiveMobileBoardLayout(
  boardId: string | null | undefined,
  isMobile: boolean,
): boolean {
  return isMobile && isMemberMobileBoard(boardId)
}

export function isMemberWorkspaceBoard(
  board: string | null | undefined,
): board is MemberMobileBoardId {
  return isMemberMobileBoard(board)
}

/** Canonical query key for Design board-definition selection. */
export const BOARD_DEFINITION_PARAM = "definition"

const LEGACY_BOARD_DEF_PARAM = "boardDef"

/** Write the public `?board=` value for an internal workspace id. */
export function toWorkspaceBoardUrlParam(boardId: WorkspaceBoardId): string {
  return boardId === "ide" ? BUILD_BOARD_URL_PARAM : boardId
}

export function parseWorkspaceBoardId(
  searchParams: URLSearchParams,
): WorkspaceBoardId | null {
  const board = searchParams.get("board")?.toLowerCase()
  if (board === "domain") return "domain"
  if (board === "realm") return "realm"
  if (board === "ide" || board === BUILD_BOARD_URL_PARAM) return "ide"
  if (board === "designer") return "designer"
  if (board === "agent") return "agent"
  return null
}

/** Design nav: selected board definition id (ide | agent | domain | designer). */
export function parseBoardDefinitionId(
  searchParams: URLSearchParams,
): string | null {
  const canonical = searchParams.get(BOARD_DEFINITION_PARAM)
  if (canonical) return canonical
  return searchParams.get(LEGACY_BOARD_DEF_PARAM) ?? null
}

/** Normalize `location.search` (or raw query) into URLSearchParams. */
export function readUrlSearchParams(search: string): URLSearchParams {
  const normalized = search.startsWith("?") ? search.slice(1) : search
  return new URLSearchParams(normalized)
}

/** Read workspace board from location.search — always re-parse; do not memoize on searchParams object identity. */
export function readWorkspaceBoardId(search: string): WorkspaceBoardId | null {
  return parseWorkspaceBoardId(readUrlSearchParams(search))
}

/** Read Design board-definition id from location.search. */
export function readBoardDefinitionId(search: string): string | null {
  return parseBoardDefinitionId(readUrlSearchParams(search))
}

/**
 * Resolve ?board= preferring window.location when React Router search lags.
 * Used for workspace routing and top-bar highlight.
 */
export function resolveWorkspaceBoardId(
  routerSearch: string,
  windowSearch?: string,
): WorkspaceBoardId | null {
  const routerBoard = parseWorkspaceBoardId(readUrlSearchParams(routerSearch))
  if (typeof window === "undefined" || windowSearch === undefined) {
    return routerBoard
  }
  const windowBoard = parseWorkspaceBoardId(readUrlSearchParams(windowSearch))
  if (windowBoard && routerBoard && windowBoard !== routerBoard) {
    return windowBoard
  }
  return routerBoard ?? windowBoard
}

/**
 * Resolve ?definition= on Design workspace; prefers window when router lags.
 */
export function resolveBoardDefinitionId(
  workspaceBoardId: WorkspaceBoardId | null,
  routerSearch: string,
  windowSearch?: string,
): string | null {
  if (workspaceBoardId !== "designer") return null
  const routerDef = parseBoardDefinitionId(readUrlSearchParams(routerSearch))
  if (typeof window === "undefined" || windowSearch === undefined) {
    return routerDef
  }
  const windowDef = parseBoardDefinitionId(readUrlSearchParams(windowSearch))
  if (windowDef && routerDef && windowDef !== routerDef) {
    return windowDef
  }
  return routerDef ?? windowDef
}

/** Search params for URL writes — window wins when ?board= diverges from router. */
export function readAuthoritativeSearchParams(
  routerSearch: string,
  windowSearch?: string,
): URLSearchParams {
  const routerParams = readUrlSearchParams(routerSearch)
  if (typeof window === "undefined" || windowSearch === undefined) {
    return new URLSearchParams(routerParams)
  }
  const windowParams = readUrlSearchParams(windowSearch)
  const routerBoard = parseWorkspaceBoardId(routerParams)
  const windowBoard = parseWorkspaceBoardId(windowParams)
  if (windowBoard && routerBoard && windowBoard !== routerBoard) {
    return new URLSearchParams(windowParams)
  }
  return new URLSearchParams(routerParams)
}

export function clearBoardDefinitionParams(prev: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(prev)
  next.delete(BOARD_DEFINITION_PARAM)
  next.delete(LEGACY_BOARD_DEF_PARAM)
  return next
}

/** Top-bar workspace switch — clears any Design definition param. */
export function applyWorkspaceBoardSwitch(
  prev: URLSearchParams,
  boardId: WorkspaceBoardId,
): URLSearchParams {
  const next = clearBoardDefinitionParams(new URLSearchParams(prev))
  next.set("board", toWorkspaceBoardUrlParam(boardId))
  return next
}

/**
 * Design sidebar: select a board definition spec.
 * Does not change `?board=` — caller must already be on Design workspace.
 */
export function applyBoardDefinitionSelection(
  prev: URLSearchParams,
  definitionId: string,
): URLSearchParams {
  const next = new URLSearchParams(prev)
  next.set(BOARD_DEFINITION_PARAM, definitionId)
  next.delete(LEGACY_BOARD_DEF_PARAM)
  return next
}

/** Migrate legacy ?boardDef= to ?definition= on Design workspace. */
export function migrateLegacyBoardDefParam(prev: URLSearchParams): URLSearchParams | null {
  const legacy = prev.get(LEGACY_BOARD_DEF_PARAM)
  if (!legacy || prev.get(BOARD_DEFINITION_PARAM)) return null
  const next = new URLSearchParams(prev)
  next.set(BOARD_DEFINITION_PARAM, legacy)
  next.delete(LEGACY_BOARD_DEF_PARAM)
  return next
}

export function buildWorkspaceBoardPath(
  domainSlug: string,
  searchParams: URLSearchParams,
): string {
  return buildRealmShellPath(domainSlug, searchParams)
}

/** No-op workspace + home nav for frame preview shells that override V0ShellProvider. */
export const BOARD_WORKSPACE_NAV_STUB = {
  workspaceBoardId: null as WorkspaceBoardId | null,
  boardDefinitionId: null as string | null,
  shellMode: "domain" as const,
  homeDisplayName: "Home",
  anchorDomainSlug: null as string | null,
  navigateHome: () => undefined,
  openDomainWorkspace: () => undefined,
  switchWorkspace: () => undefined,
  selectBoardDefinition: () => undefined,
  clearBoardDefinition: () => undefined,
}

/** @deprecated use clearBoardDefinitionParams */
export function clearBoardDefParam(prev: URLSearchParams): URLSearchParams {
  return clearBoardDefinitionParams(prev)
}

/** @deprecated use applyBoardDefinitionSelection — kept for gradual migration */
export function applyBoardDefSelection(
  prev: URLSearchParams,
  boardDefId: string,
): URLSearchParams {
  const next = applyBoardDefinitionSelection(prev, boardDefId)
  next.set("board", "designer")
  return next
}

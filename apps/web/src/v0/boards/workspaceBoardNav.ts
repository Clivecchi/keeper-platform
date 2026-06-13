/**
 * workspaceBoardNav
 * -----------------
 * Single source of truth for workspace board URL params (?board= / ?boardDef=).
 *
 * Workspace boards (Domain · IDE · Design · Agent) are switched via the top bar.
 * Design-only board definitions use ?boardDef= while ?board=designer.
 */

export type WorkspaceBoardId = "domain" | "ide" | "designer" | "agent"

export const WORKSPACE_BOARD_IDS: WorkspaceBoardId[] = [
  "domain",
  "ide",
  "designer",
  "agent",
]

export function parseWorkspaceBoardId(
  searchParams: URLSearchParams,
): WorkspaceBoardId | null {
  const board = searchParams.get("board")?.toLowerCase()
  if (board === "domain") return "domain"
  if (board === "ide") return "ide"
  if (board === "designer") return "designer"
  if (board === "agent") return "agent"
  return null
}

/** Apply a workspace board switch onto existing query params. */
export function applyWorkspaceBoardSwitch(
  prev: URLSearchParams,
  boardId: WorkspaceBoardId,
): URLSearchParams {
  const next = new URLSearchParams(prev)
  next.set("board", boardId)
  if (boardId !== "designer") {
    next.delete("boardDef")
  }
  return next
}

/** Design nav / Chronicle trail: select a board definition spec. */
export function applyBoardDefSelection(
  prev: URLSearchParams,
  boardDefId: string,
): URLSearchParams {
  const next = new URLSearchParams(prev)
  next.set("board", "designer")
  next.set("boardDef", boardDefId)
  return next
}

/** Remove boardDef deep-link param only (keeps workspace board). */
export function clearBoardDefParam(prev: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(prev)
  next.delete("boardDef")
  return next
}

export function buildWorkspaceBoardPath(
  domainSlug: string,
  searchParams: URLSearchParams,
): string {
  const search = searchParams.toString()
  return `/d/${encodeURIComponent(domainSlug)}${search ? `?${search}` : ""}`
}

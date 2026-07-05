/**
 * domainWorkspaceBoards
 * ---------------------
 * Which workspace boards (`?board=`) are available for a domain slug.
 *
 * Platform (KE3P / slug `ke3p`): build surfaces — IDE + Design (+ member boards).
 * All other domains: Domain + Agent (+ Realm home) — no IDE or Design.
 */

import {
  isPlatformDomainSlugAlias,
  LEGACY_PLATFORM_DOMAIN_SLUG,
  normalizePlatformDomainSlug,
  PLATFORM_DOMAIN_SLUG,
} from "@keeper/shared"
import type { WorkspaceBoardId } from "./workspaceBoardNav"

export {
  LEGACY_PLATFORM_DOMAIN_SLUG,
  normalizePlatformDomainSlug,
  PLATFORM_DOMAIN_SLUG,
} from "@keeper/shared"

const PLATFORM_WORKSPACE_BOARDS: readonly WorkspaceBoardId[] = [
  "domain",
  "ide",
  "designer",
  "agent",
]

/** Member domain workspaces — no Home here; Home lives at `/home`. */
const MEMBER_DOMAIN_WORKSPACE_BOARDS: readonly WorkspaceBoardId[] = [
  "domain",
  "agent",
]

/** User Home shell at `/home` — always Realm board experience. */
export const HOME_SHELL_BOARD: WorkspaceBoardId = "realm"

const WORKSPACE_BOARD_LABELS: Record<WorkspaceBoardId, string> = {
  realm: "Home",
  domain: "Domain",
  ide: "IDE",
  designer: "Design",
  agent: "Agent",
}

export function isPlatformDomainSlug(slug: string | null | undefined): boolean {
  return isPlatformDomainSlugAlias(slug)
}

export function resolveAvailableWorkspaceBoardIds(
  domainSlug: string | null | undefined,
): WorkspaceBoardId[] {
  const boards = isPlatformDomainSlug(domainSlug)
    ? PLATFORM_WORKSPACE_BOARDS
    : MEMBER_DOMAIN_WORKSPACE_BOARDS
  return [...boards]
}

export function isWorkspaceBoardAvailableForDomain(
  boardId: string | null | undefined,
  domainSlug: string | null | undefined,
): boardId is WorkspaceBoardId {
  if (!boardId) return false
  return resolveAvailableWorkspaceBoardIds(domainSlug).includes(boardId as WorkspaceBoardId)
}

/** Desktop default when landing on `/d/:slug` with no `?board=`. */
export function resolveDefaultWorkspaceBoardId(
  domainSlug: string | null | undefined,
): WorkspaceBoardId {
  void domainSlug
  return "domain"
}

export function resolveWorkspaceBoardLinks(
  domainSlug: string | null | undefined,
): Array<{ id: WorkspaceBoardId; label: string }> {
  return resolveAvailableWorkspaceBoardIds(domainSlug).map((id) => ({
    id,
    label: WORKSPACE_BOARD_LABELS[id],
  }))
}

export function resolveWorkspaceBoardNavItems(
  domainSlug: string | null | undefined,
  currentBoardId?: WorkspaceBoardId | null,
): Array<{ id: WorkspaceBoardId; label: string }> {
  return resolveAvailableWorkspaceBoardIds(domainSlug)
    .filter((id) => id !== currentBoardId)
    .map((id) => ({ id, label: WORKSPACE_BOARD_LABELS[id] }))
}

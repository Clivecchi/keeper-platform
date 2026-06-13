"use client"

/**
 * useBoardDefinitionFromUrl / useWorkspaceBoardFromUrl
 *
 * Read the active board definition from V0Shell — includes optimistic pending
 * selection plus window.location fallback when React Router search lags.
 * Writes stay on V0Shell.selectBoardDefinition / switchWorkspace.
 */

import { useV0ShellOptional } from "../shell/V0ShellContext"
import type { WorkspaceBoardId } from "./workspaceBoardNav"

export function useWorkspaceBoardFromUrl(): WorkspaceBoardId | null {
  const shell = useV0ShellOptional()
  return shell?.workspaceBoardId ?? null
}

/** Selected board spec on Design workspace (?definition=). Null on other workspaces. */
export function useBoardDefinitionFromUrl(): string | null {
  const shell = useV0ShellOptional()
  if (shell?.workspaceBoardId !== "designer") return null
  return shell.boardDefinitionId
}

"use client"

/**
 * useBoardDefinitionFromUrl / useWorkspaceBoardFromUrl
 *
 * Read ?board= and ?definition= directly from location.search on every navigation.
 * Use for all Design board-definition *reads* — avoids stale context or useSearchParams drift.
 * Writes stay on V0Shell.selectBoardDefinition / switchWorkspace.
 */

import { useLocation } from "react-router-dom"
import {
  parseBoardDefinitionId,
  parseWorkspaceBoardId,
  readUrlSearchParams,
  type WorkspaceBoardId,
} from "./workspaceBoardNav"

export function useWorkspaceBoardFromUrl(): WorkspaceBoardId | null {
  const { search } = useLocation()
  return parseWorkspaceBoardId(readUrlSearchParams(search))
}

/** Selected board spec on Design workspace (?definition=). Null on other workspaces. */
export function useBoardDefinitionFromUrl(): string | null {
  const { search } = useLocation()
  const params = readUrlSearchParams(search)
  if (parseWorkspaceBoardId(params) !== "designer") return null
  return parseBoardDefinitionId(params)
}

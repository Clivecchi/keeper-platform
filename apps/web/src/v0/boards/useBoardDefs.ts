// apps/web/src/v0/boards/useBoardDefs.ts
// Single source of board definitions for all consumers inside V0ShellProvider.
//
// useBoardDefs() prefers domainFrame.boards (seeded per-domain).
// Falls back to BOARD_DEFINITIONS_FALLBACK until a domain's frame_json carries boards[].

import { useV0ShellOptional } from "../shell/V0ShellContext"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import {
  IDE_BOARD_DEF,
  AGENT_BOARD_DEF,
  DOMAIN_BOARD_DEF,
  DESIGNER_BOARD_DEF,
} from "./UniversalBoardDefinition"

/**
 * Static fallback — mirrors the four built-in board definitions.
 * Used when domainFrame.boards is absent (domains not yet seeded).
 */
export const BOARD_DEFINITIONS_FALLBACK: Record<string, UniversalBoardDef> = {
  ide: IDE_BOARD_DEF,
  agent: AGENT_BOARD_DEF,
  domain: DOMAIN_BOARD_DEF,
  designer: DESIGNER_BOARD_DEF,
}

/**
 * useBoardDefs
 *
 * Returns the active board definitions for the current domain.
 * Reads domainFrame.boards from V0ShellContext when available.
 * Falls back to BOARD_DEFINITIONS_FALLBACK for unseeded domains.
 *
 * Must be called inside a V0ShellProvider.
 */
export function useBoardDefs(): UniversalBoardDef[] {
  const shell = useV0ShellOptional()
  const fromFrame = shell?.domainFrame?.boards
  if (fromFrame && fromFrame.length > 0) return fromFrame
  return Object.values(BOARD_DEFINITIONS_FALLBACK)
}

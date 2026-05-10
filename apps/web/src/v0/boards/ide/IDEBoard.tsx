"use client"

/**
 * IDEBoard — Moment 2.7
 *
 * Migrated to UniversalBoard + Chronicle (Level 3).
 * All panels — left, center, right — are now default Universal behavior
 * driven entirely by IDE_BOARD_DEF. No overrides, no local state.
 *
 * Right panel: Chronicle reads IDE_BOARD_DEF.contextSurface and renders
 * the appropriate view state for whatever is selected.
 */

import { UniversalBoard } from "../UniversalBoard"
import { IDE_BOARD_DEF } from "../UniversalBoardDefinition"

export function IDEBoard() {
  return <UniversalBoard def={IDE_BOARD_DEF} />
}

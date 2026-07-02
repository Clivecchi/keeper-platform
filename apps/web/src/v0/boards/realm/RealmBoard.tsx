"use client"

/**
 * RealmBoard — Phase 4A
 *
 * Personal domain primary board. Same Universal Board shell as Domain Board;
 * def drives contentGated nav, Cover-first Chronicle, and solo dialog orchestration.
 */

import { UniversalBoard } from "../UniversalBoard"
import { REALM_BOARD_DEF } from "../UniversalBoardDefinition"

export function RealmBoard() {
  return <UniversalBoard def={REALM_BOARD_DEF} />
}

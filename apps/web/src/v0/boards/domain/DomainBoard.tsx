"use client"

/**
 * DomainBoard — Moment 2.7
 *
 * The def is the board. No overrides.
 *
 * Left:   UniversalNavPanel reading DOMAIN_BOARD_DEF.nav (Keeper, Dialogs, Journeys, Boards)
 * Center: UniversalConversation (domain mode)
 * Right:  Chronicle reading DOMAIN_BOARD_DEF.contextSurface
 *
 * DomainSwitcher is wired in UniversalBoard — triggered by the top bar domain label.
 */

import { UniversalBoard } from "../UniversalBoard"
import { DOMAIN_BOARD_DEF } from "../UniversalBoardDefinition"

export function DomainBoard() {
  return <UniversalBoard def={DOMAIN_BOARD_DEF} />
}

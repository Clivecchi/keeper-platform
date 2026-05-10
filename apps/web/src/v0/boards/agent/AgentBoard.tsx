"use client"

/**
 * AgentBoard — Moment 2.5
 *
 * Migrated to UniversalBoard + UniversalConversation (Level 2).
 * All board-specific conversation and banner logic moved to UniversalConversation,
 * driven by AGENT_BOARD_DEF. This file is now a single-line board entry point.
 */

import { UniversalBoard } from "../UniversalBoard"
import { AGENT_BOARD_DEF } from "../UniversalBoardDefinition"

export function AgentBoard() {
  return <UniversalBoard def={AGENT_BOARD_DEF} />
}

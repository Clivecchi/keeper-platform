// apps/web/src/v0/boards/boardRegistry.ts
// Board Registry — parallel to FRAME_REGISTRY for V0 Boards.
// A Board owns chrome (top banner, InteractionBar) and composes Frames.
// Each Frame on a Board is configured by the Board via Props.
// Boards are accessed via ?board= URL parameter.
//
// Each entry now carries a `def` field — the UniversalBoardDef for that board.
// This is the source of truth for the board's panel configuration.
// New boards are entries here + a def in UniversalBoardDefinition.ts.

import * as React from "react"
import { DesignBoard } from "./designer/DesignBoard"
import { DomainBoard } from "./domain/DomainBoard"
import { AgentBoard } from "./agent/AgentBoard"
import { IDEBoard } from "./ide/IDEBoard"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import {
  IDE_BOARD_DEF,
  AGENT_BOARD_DEF,
  DOMAIN_BOARD_DEF,
  DESIGNER_BOARD_DEF,
} from "./UniversalBoardDefinition"

export type V0BoardKey = "designer" | "domain" | "agent" | "ide"

export interface BoardRegistryEntry {
  component: React.ComponentType<any>
  displayName: string
  isPrivate: boolean      // true = requires authentication
  isAdminOnly: boolean    // true = requires Platform Admin role
  /** Universal Board definition — drives panel configuration for this board. */
  def: UniversalBoardDef
}

export const BOARD_REGISTRY: Record<V0BoardKey, BoardRegistryEntry> = {
  designer: {
    component: DesignBoard,
    displayName: "Design Board",
    isPrivate: true,
    isAdminOnly: true,
    def: DESIGNER_BOARD_DEF,
  },
  domain: {
    component: DomainBoard,
    displayName: "Domain Board",
    isPrivate: true,
    isAdminOnly: false,
    def: DOMAIN_BOARD_DEF,
  },
  agent: {
    component: AgentBoard,
    displayName: "Agent Board",
    isPrivate: true,
    isAdminOnly: false,
    def: AGENT_BOARD_DEF,
  },
  ide: {
    component: IDEBoard,
    displayName: "IDE Board",
    isPrivate: true,
    isAdminOnly: false,
    def: IDE_BOARD_DEF,
  },
}

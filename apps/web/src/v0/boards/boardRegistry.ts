// apps/web/src/v0/boards/boardRegistry.ts
// Board Registry — parallel to FRAME_REGISTRY for V0 Boards.
// A Board owns chrome (top banner, InteractionBar) and composes Frames.
// Each Frame on a Board is configured by the Board via Props.
// Boards are accessed via ?board= URL parameter.

import * as React from "react"
import { DesignBoard } from "./designer/DesignBoard"

export type V0BoardKey = "designer"

export interface BoardRegistryEntry {
  component: React.ComponentType<any>
  displayName: string
  isPrivate: boolean      // true = requires authentication
  isAdminOnly: boolean    // true = requires Platform Admin role
}

export const BOARD_REGISTRY: Record<V0BoardKey, BoardRegistryEntry> = {
  designer: {
    component: DesignBoard,
    displayName: "Design Board",
    isPrivate: true,
    isAdminOnly: true,
  },
}

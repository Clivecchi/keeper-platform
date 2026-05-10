"use client"

import { UniversalBoard } from "../UniversalBoard"
import { DESIGNER_BOARD_DEF } from "../UniversalBoardDefinition"
import { UniversalSwitcherPanel } from "../panels/UniversalSwitcherPanel"

export function DesignerFrame() {
  return (
    <UniversalBoard
      def={DESIGNER_BOARD_DEF}
      left={() => <UniversalSwitcherPanel />}
    />
  )
}

export { DesignerFrame as DesignBoard }

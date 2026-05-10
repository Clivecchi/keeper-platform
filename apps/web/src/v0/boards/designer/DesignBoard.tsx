"use client"

import { UniversalBoard } from "../UniversalBoard"
import { DESIGNER_BOARD_DEF } from "../UniversalBoardDefinition"

export function DesignerFrame() {
  return <UniversalBoard def={DESIGNER_BOARD_DEF} />
}

export { DesignerFrame as DesignBoard }

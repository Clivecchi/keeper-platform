// @vitest-environment node
import { describe, expect, it } from "vitest"
import { resolveBoardDefs } from "./resolveBoardDefs"
import { BUILD_BOARD_DEF } from "./UniversalBoardDefinition"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"

describe("resolveBoardDefs", () => {
  it("maps stale frame JSON boardId ide onto Build", () => {
    const stale: UniversalBoardDef = {
      ...BUILD_BOARD_DEF,
      boardId: "ide",
      displayName: "Stale IDE label",
    }
    const defs = resolveBoardDefs([stale])
    const build = defs.find((d) => d.boardId === "build")
    expect(build).toBeDefined()
    expect(build?.boardId).toBe("build")
    expect(build?.displayName).toBe(BUILD_BOARD_DEF.displayName)
    expect(build?.conversation.kipMode).toBe("build")
  })
})

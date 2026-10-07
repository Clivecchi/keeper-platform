import { describe, expect, it } from "vitest"
import { BOARD_SURFACES, boardSurfaceProps } from "./boardSurface"

describe("board surfaces", () => {
  it("names the five addressable regions of the Board", () => {
    expect([...BOARD_SURFACES]).toEqual([
      "nav",
      "orientation",
      "stage",
      "composer",
      "chronicle",
    ])
  })

  it("marks one region on the element that owns it", () => {
    expect(boardSurfaceProps("orientation")).toEqual({
      "data-board-surface": "orientation",
    })
  })
})

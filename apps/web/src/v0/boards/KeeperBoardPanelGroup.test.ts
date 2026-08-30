// @vitest-environment node
import { describe, expect, it } from "vitest"
import { panelSplitForSurface, STAGE_CURTAIN_SPLIT } from "./KeeperBoardPanelGroup"

describe("panelSplitForSurface", () => {
  const stored = { leftPct: 15, rightPct: 35 }

  it("keeps the Dialog stored split", () => {
    expect(panelSplitForSurface("dialog", stored)).toEqual(stored)
    expect(panelSplitForSurface(undefined, stored)).toEqual(stored)
  })

  it("locks Stage to symmetric 15 / 70 / 15 curtains", () => {
    expect(STAGE_CURTAIN_SPLIT).toEqual({ leftPct: 15, rightPct: 15 })
    expect(panelSplitForSurface("stage", stored)).toEqual(STAGE_CURTAIN_SPLIT)
    expect(panelSplitForSurface("stage", { leftPct: 20, rightPct: 40 })).toEqual(
      STAGE_CURTAIN_SPLIT,
    )
  })
})

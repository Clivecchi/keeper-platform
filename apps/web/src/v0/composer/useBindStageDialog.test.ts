// @vitest-environment node
import { describe, expect, it } from "vitest"
import { dialogToBindOnStage } from "./useBindStageDialog"

describe("dialogToBindOnStage", () => {
  it("binds the first Dialog when Talking in is empty", () => {
    expect(dialogToBindOnStage(["plot", "touchdown"], null)).toBe("plot")
  })

  it("keeps Talking in when that Dialog is already on Stage", () => {
    expect(dialogToBindOnStage(["plot", "touchdown"], "touchdown")).toBe(null)
  })

  it("binds the first Dialog when Talking in is not on Stage", () => {
    expect(dialogToBindOnStage(["plot"], "elsewhere")).toBe("plot")
  })

  it("does nothing when Stage has no Dialog", () => {
    expect(dialogToBindOnStage([], "plot")).toBe(null)
  })
})

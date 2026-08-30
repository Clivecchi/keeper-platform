// @vitest-environment node
import { describe, expect, it } from "vitest"
import { nextWorkspaceSurface } from "./workspaceSurface"

describe("nextWorkspaceSurface", () => {
  it("enters Stage only when opening the room or inspecting a presence", () => {
    expect(nextWorkspaceSurface("open-stage")).toBe("stage")
    expect(nextWorkspaceSurface("stage-presence")).toBe("stage")
  })

  it("leaves Stage on platform navigation, board change, and domain change", () => {
    expect(nextWorkspaceSurface("platform-nav")).toBe("dialog")
    expect(nextWorkspaceSurface("board-change")).toBe("dialog")
    expect(nextWorkspaceSurface("domain-change")).toBe("dialog")
    expect(nextWorkspaceSurface("leave-stage")).toBe("dialog")
  })
})

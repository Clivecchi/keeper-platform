// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  applyWorkspaceBoardSwitch,
  parseWorkspaceBoardId,
  toWorkspaceBoardUrlParam,
} from "./workspaceBoardNav"

describe("workspaceBoardNav — Build alias", () => {
  it("parses legacy ?board=ide as the Build workspace", () => {
    expect(parseWorkspaceBoardId(new URLSearchParams("board=ide"))).toBe("ide")
  })

  it("parses canonical ?board=build as the same workspace", () => {
    expect(parseWorkspaceBoardId(new URLSearchParams("board=build"))).toBe("ide")
  })

  it("writes ?board=build when switching to the Build workspace", () => {
    const next = applyWorkspaceBoardSwitch(new URLSearchParams(), "ide")
    expect(next.get("board")).toBe("build")
    expect(toWorkspaceBoardUrlParam("ide")).toBe("build")
  })

  it("leaves other boards unchanged on write", () => {
    expect(toWorkspaceBoardUrlParam("domain")).toBe("domain")
    expect(toWorkspaceBoardUrlParam("designer")).toBe("designer")
  })
})

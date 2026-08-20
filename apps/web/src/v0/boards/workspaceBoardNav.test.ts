// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  applyWorkspaceBoardSwitch,
  parseBoardDefinitionId,
  parseWorkspaceBoardId,
  toWorkspaceBoardUrlParam,
} from "./workspaceBoardNav"

describe("workspaceBoardNav — Build Board", () => {
  it("parses canonical ?board=build as Build", () => {
    expect(parseWorkspaceBoardId(new URLSearchParams("board=build"))).toBe("build")
  })

  it("parses legacy ?board=ide as Build (URL alias only)", () => {
    expect(parseWorkspaceBoardId(new URLSearchParams("board=ide"))).toBe("build")
  })

  it("writes ?board=build when switching to Build", () => {
    const next = applyWorkspaceBoardSwitch(new URLSearchParams(), "build")
    expect(next.get("board")).toBe("build")
    expect(toWorkspaceBoardUrlParam("build")).toBe("build")
  })

  it("leaves other boards unchanged on write", () => {
    expect(toWorkspaceBoardUrlParam("domain")).toBe("domain")
    expect(toWorkspaceBoardUrlParam("designer")).toBe("designer")
  })

  it("normalizes legacy ?definition=ide to build", () => {
    expect(parseBoardDefinitionId(new URLSearchParams("definition=ide"))).toBe("build")
    expect(parseBoardDefinitionId(new URLSearchParams("definition=build"))).toBe("build")
  })
})

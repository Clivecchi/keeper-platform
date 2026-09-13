// @vitest-environment node
import { describe, expect, it } from "vitest"
import { resolveDomainConfigFrame } from "./domainConfigFrames"

describe("resolveDomainConfigFrame", () => {
  it("opens People without treating it as identity", () => {
    expect(resolveDomainConfigFrame("people")).toBe("people")
  })

  it("does not invent a Build frame unless that work exists", () => {
    expect(resolveDomainConfigFrame("build")).toBe("identity")
    expect(resolveDomainConfigFrame("build", { includeBuild: true })).toBe("build")
  })
})

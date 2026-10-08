import { describe, expect, it } from "vitest"
import { resolveEnteredPlaceName } from "./stagePlace"

describe("resolveEnteredPlaceName", () => {
  it("names Home even when an anchor domain is loaded", () => {
    expect(
      resolveEnteredPlaceName({
        shellMode: "home",
        homeDisplayName: "Home",
        domainName: "KE3P",
      }),
    ).toBe("Home")
  })

  it("names the domain a person opened", () => {
    expect(
      resolveEnteredPlaceName({
        shellMode: "domain",
        domainName: "House Frogmore",
      }),
    ).toBe("House Frogmore")
  })
})

// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  DEFAULT_KEEPER_DENSITY,
  isReadableDensity,
  parseKeeperDensity,
  toggleReadableDensity,
} from "./keeperDensity"

describe("keeperDensity", () => {
  it("defaults unknown values to comfortable (Readable)", () => {
    expect(parseKeeperDensity(null)).toBe("comfortable")
    expect(parseKeeperDensity(undefined)).toBe("comfortable")
    expect(parseKeeperDensity("roomy")).toBe(DEFAULT_KEEPER_DENSITY)
  })

  it("keeps compact or comfortable; upgrades leftover default; standard is Off", () => {
    expect(parseKeeperDensity("compact")).toBe("compact")
    expect(parseKeeperDensity("default")).toBe("comfortable")
    expect(parseKeeperDensity("standard")).toBe("default")
    expect(parseKeeperDensity("comfortable")).toBe("comfortable")
  })

  it("treats comfortable as Readable and toggles to default", () => {
    expect(isReadableDensity("comfortable")).toBe(true)
    expect(isReadableDensity("default")).toBe(false)
    expect(toggleReadableDensity("comfortable")).toBe("default")
    expect(toggleReadableDensity("default")).toBe("comfortable")
    expect(toggleReadableDensity("compact")).toBe("comfortable")
  })
})

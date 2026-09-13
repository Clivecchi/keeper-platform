import { describe, expect, it } from "vitest"
import {
  MIN_BODY_CONTRAST,
  PAPER_DARK_HEX,
  PAPER_LIGHT_HEX,
  contrastRatio,
  effectivePlacementLuminance,
  isMidtoneLuminance,
  relativeLuminanceHex,
  resolvePlacementReadingPlane,
} from "./placementContrast.js"

describe("placement contrast math", () => {
  it("treats cream and charcoal as opposite papers", () => {
    const cream = relativeLuminanceHex(PAPER_LIGHT_HEX) ?? 0
    const charcoal = relativeLuminanceHex(PAPER_DARK_HEX) ?? 1
    expect(cream).toBeGreaterThan(0.8)
    expect(charcoal).toBeLessThan(0.1)
    expect(contrastRatio(cream, charcoal)).toBeGreaterThan(MIN_BODY_CONTRAST)
  })

  it("flags muddy mid-tones that fail both inks", () => {
    expect(isMidtoneLuminance(0.38)).toBe(true)
    expect(isMidtoneLuminance(0.08)).toBe(false)
    expect(isMidtoneLuminance(0.88)).toBe(false)
  })

  it("mixes paper over atmosphere by glass alpha", () => {
    expect(effectivePlacementLuminance(0.9, 1)).toBeCloseTo(0.9)
    expect(effectivePlacementLuminance(0.9, 0.5, 0.1)).toBeCloseTo(0.5)
  })
})

describe("resolvePlacementReadingPlane", () => {
  it("keeps cream paper and dark ink on a light surface", () => {
    const plane = resolvePlacementReadingPlane({
      surfaceHex: "#f5f0e8",
      hasAtmosphere: true,
    })
    expect(plane.darkSurface).toBe(false)
    expect(plane.contrast).toBeGreaterThanOrEqual(MIN_BODY_CONTRAST)
    expect(plane.ink.primary).toMatch(/hsl\(\d+/)
    expect(plane.glassAlpha).toBeGreaterThanOrEqual(0.94)
  })

  it("pushes a muddy mid-tone onto sealed paper", () => {
    const plane = resolvePlacementReadingPlane({
      surfaceHex: "#8a7a68",
      hasAtmosphere: true,
    })
    expect(plane.adjusted).toBe(true)
    expect(["midtone-paper", "contrast-seal"]).toContain(plane.reason)
    expect([PAPER_LIGHT_HEX, PAPER_DARK_HEX]).toContain(plane.surfaceHex)
    expect(plane.contrast).toBeGreaterThanOrEqual(MIN_BODY_CONTRAST)
  })

  it("uses light ink on a dark painted surface", () => {
    const plane = resolvePlacementReadingPlane({
      surfaceHex: "#1f1d18",
      hasAtmosphere: true,
    })
    expect(plane.darkSurface).toBe(true)
    expect(plane.ink.primary).toMatch(/94%\)$/)
  })
})

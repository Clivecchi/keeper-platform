import { describe, expect, it } from "vitest"
import {
  GOLD_ON_DARK,
  LIFE_ON_DARK,
  hexContrast,
  resolveTreatmentSwatches,
} from "./treatmentSwatches.js"

describe("resolveTreatmentSwatches", () => {
  it("keeps a colorful accent on cream paper", () => {
    const swatches = resolveTreatmentSwatches({
      background: "#f5f0e8",
      accent: "#2d6a7f",
    })
    expect(swatches.darkSurface).toBe(false)
    expect(hexContrast(swatches.ink, swatches.paper)).toBeGreaterThanOrEqual(4.5)
    expect(hexContrast(swatches.accent, swatches.paper)).toBeGreaterThanOrEqual(3)
    expect(swatches.signal).not.toBe(swatches.paper)
  })

  it("gives a brown-on-brown domain gold and life on dark paper", () => {
    const swatches = resolveTreatmentSwatches({
      background: "#83736c",
      accent: "#3a1e0f",
      hasAtmosphere: true,
    })
    expect(swatches.darkSurface).toBe(true)
    expect(swatches.accent).toBe(GOLD_ON_DARK)
    expect(swatches.signal).toBe(LIFE_ON_DARK)
    expect(hexContrast(swatches.ink, swatches.paper)).toBeGreaterThanOrEqual(4.5)
    expect(hexContrast(swatches.action, swatches.paper)).toBeGreaterThanOrEqual(3)
  })
})

import { describe, expect, it } from "vitest"
import {
  derivePaletteFromRgbSamples,
  relativeLuminanceRgb,
  rgbToHex,
} from "./imagePalette.js"

describe("derivePaletteFromRgbSamples", () => {
  it("returns the Warm Minimal fallback when there are no samples", () => {
    expect(derivePaletteFromRgbSamples([])).toEqual({
      background: "#f5f0e8",
      accent: "#2d6a7f",
      primary: "#2d6a7f",
      surface: "#f5f0e8",
      dark: false,
    })
  })

  it("uses the average as surface and a saturated distinct color as accent", () => {
    const palette = derivePaletteFromRgbSamples([
      { r: 245, g: 241, b: 237 },
      { r: 246, g: 240, b: 236 },
      { r: 46, g: 177, b: 167 },
    ])
    expect(palette.dark).toBe(false)
    expect(palette.accent).toBe("#2eb1a7")
    expect(palette.surface).toBe(palette.background)
  })

  it("marks a dark-brown field as dark", () => {
    const palette = derivePaletteFromRgbSamples([
      { r: 31, g: 29, b: 24 },
      { r: 28, g: 26, b: 22 },
      { r: 40, g: 36, b: 30 },
    ])
    expect(palette.dark).toBe(true)
    expect(relativeLuminanceRgb(31, 29, 24)).toBeLessThan(0.35)
  })
})

describe("rgbToHex", () => {
  it("pads single-digit channels", () => {
    expect(rgbToHex(2, 11, 10)).toBe("#020b0a")
  })
})

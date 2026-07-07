import { describe, expect, it } from "vitest"
import { resolveDomainTreatment } from "./resolveDomainTreatment"
import { DEFAULT_DOMAIN_FRAME } from "../data/domain-frame.default"

describe("resolveDomainTreatment", () => {
  it("returns explicit treatment when present on frame JSON", () => {
    const result = resolveDomainTreatment({
      ...DEFAULT_DOMAIN_FRAME,
      treatment: {
        name: "Warm Minimal",
        palette: { background: "#1a1410", accent: "#3d9a8a" },
        font: { family: "Palatino, serif" },
      },
    })

    expect(result.name).toBe("Warm Minimal")
    expect(result.palette.background).toBe("#1a1410")
    expect(result.palette.accent).toBe("#3d9a8a")
    expect(result.font.family).toBe("Palatino, serif")
  })

  it("derives from theme when treatment block is missing", () => {
    const { treatment: _treatment, ...frameWithoutTreatment } = DEFAULT_DOMAIN_FRAME
    const result = resolveDomainTreatment(frameWithoutTreatment)

    expect(result.palette.background).toBe(DEFAULT_DOMAIN_FRAME.theme.colors.surface)
    expect(result.palette.accent).toBe(DEFAULT_DOMAIN_FRAME.theme.colors.accent)
    expect(result.font.family).toBe(DEFAULT_DOMAIN_FRAME.theme.fonts.display)
  })

  it("accepts hex colors without a leading hash", () => {
    const result = resolveDomainTreatment({
      ...DEFAULT_DOMAIN_FRAME,
      treatment: {
        name: "Dark",
        palette: { background: "121410", accent: "2d6a7f" },
        font: { family: "Georgia, serif" },
      },
    })

    expect(result.palette.background).toBe("#121410")
    expect(result.palette.accent).toBe("#2d6a7f")
  })

  it("falls back to platform default when frame is null", () => {
    const result = resolveDomainTreatment(null)
    expect(result.name).toBe(DEFAULT_DOMAIN_FRAME.treatment!.name)
    expect(result.palette.background).toBe(DEFAULT_DOMAIN_FRAME.treatment!.palette.background)
  })
})

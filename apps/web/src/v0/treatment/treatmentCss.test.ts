import { describe, expect, it } from "vitest"
import { treatmentAccentStyle, treatmentShellStyle } from "./treatmentCss"
import type { ResolvedDomainTreatment } from "./resolveDomainTreatment"

const sample: ResolvedDomainTreatment = {
  name: "Warm Minimal",
  palette: { background: "#f5f0e8", accent: "#2d6a7f" },
  font: { family: "Georgia, serif" },
}

describe("treatmentShellStyle", () => {
  it("applies full background, font, and accent border", () => {
    const style = treatmentShellStyle(sample)
    expect(style.backgroundColor).toBe("#f5f0e8")
    expect(style.fontFamily).toBe("Georgia, serif")
    expect(style.borderLeft).toBe("3px solid #2d6a7f")
    expect((style as Record<string, string>)["--treatment-font-family"]).toBe("Georgia, serif")
    expect((style as Record<string, string>)["--treatment-color"]).toMatch(/\d+/)
  })
})

describe("treatmentAccentStyle", () => {
  it("does not replace layout with treatment background or body font", () => {
    const style = treatmentAccentStyle(sample)
    expect(style.fontFamily).toBeUndefined()
    expect(style.backgroundColor).not.toBe("#f5f0e8")
    expect(style.borderLeft).toBe("3px solid #2d6a7f")
    expect((style as Record<string, string>)["--treatment-font-family"]).toBe("Georgia, serif")
    expect((style as Record<string, string>)["--treatment-color"]).toMatch(/\d+/)
  })
})

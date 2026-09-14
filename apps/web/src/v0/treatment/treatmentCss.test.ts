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
    expect((style as Record<string, string>)["--treatment-surface"]).toBe("#f5f0e8")
    expect((style as Record<string, string>)["--treatment-color"]).toMatch(/\d+/)
    expect((style as Record<string, string>)["--theme-ink-primary"]).toMatch(/12%$/)
    expect((style as Record<string, string>)["--theme-ink-reading"]).toMatch(/12%$/)
    expect((style as Record<string, string>)["--treatment-signal"]).toMatch(/^#/)
    expect((style as Record<string, string>)["--treatment-action"]).toMatch(/^#/)
  })

  it("flips ink and paints atmosphere when the background is dark", () => {
    const style = treatmentShellStyle(
      { ...sample, palette: { background: "#1f1d18", accent: "#2eb1a7" } },
      { atmosphereUrl: "https://cdn.example/cover.png" },
    )
    expect((style as Record<string, string>)["--theme-ink-primary"]).toMatch(/94%$/)
    expect(style.color).toMatch(/94%\)$/)
    expect(style.backgroundImage).toContain("url(https://cdn.example/cover.png)")
  })

  it("seals a muddy mid-tone onto paper so Chronicle type can hold", () => {
    const style = treatmentShellStyle({
      ...sample,
      palette: { background: "#8a7a68", accent: "#2d6a7f" },
    })
    const paper = (style as Record<string, string>)["--treatment-surface"]
    expect(["#f3ebe0", "#26221e"]).toContain(paper)
    expect(style.backgroundColor).toBe(paper)
    expect((style as Record<string, string>)["--theme-ink-primary"]).toMatch(/(12%|94%)$/)
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

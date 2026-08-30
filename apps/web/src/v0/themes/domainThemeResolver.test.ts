import { describe, expect, it } from "vitest"
import { resolveDomainThemeSync } from "./domainThemeResolver"
import type { DomainFrameTheme } from "../data/domain-frame.types"

const lightTheme: DomainFrameTheme = {
  wordmark: "Test",
  tagline: "",
  background: "",
  colors: {
    primary: "#2eb1a7",
    accent: "#2eb1a7",
    surface: "#f5f1ed",
  },
  fonts: { display: "Georgia, serif", ui: "Georgia, serif" },
}

const darkTheme: DomainFrameTheme = {
  ...lightTheme,
  colors: {
    primary: "#2eb1a7",
    accent: "#2eb1a7",
    surface: "#1f1d18",
  },
}

function inkLightness(token: string | undefined): number {
  const match = token?.match(/,\s*(\d+)%\)\s*$/)
  return match ? Number(match[1]) : -1
}

describe("resolveDomainThemeSync", () => {
  it("uses dark ink when the domain surface is light, even in a dark OS scheme", () => {
    const tokens = resolveDomainThemeSync(lightTheme, "dark")
    expect(inkLightness(tokens["ink.primary"])).toBeLessThan(40)
  })

  it("uses light ink when the domain surface is dark, even in a light OS scheme", () => {
    const tokens = resolveDomainThemeSync(darkTheme, "light")
    expect(inkLightness(tokens["ink.primary"])).toBeGreaterThan(80)
  })
})

import { describe, expect, it } from "vitest"
import {
  GLASS_OPEN,
  GLASS_SEALED,
  alphaToHexSuffix,
  deriveAtmosphereContrast,
  domainHasAtmosphere,
  hslStringToComponents,
} from "./atmosphereContrast"

function inkLightness(token: string): number {
  const match = token.match(/,\s*(\d+)%\)\s*$/)
  return match ? Number(match[1]) : -1
}

describe("deriveAtmosphereContrast", () => {
  it("seals glass and widens ink when a dark surface has atmosphere", () => {
    const tokens = deriveAtmosphereContrast({
      darkSurface: true,
      hasAtmosphere: true,
    })

    expect(tokens["atmosphere.present"]).toBe("1")
    expect(Number(tokens["glass.panel"])).toBe(GLASS_SEALED.panel)
    expect(Number(tokens["glass.nav"])).toBeGreaterThan(GLASS_OPEN.nav)
    expect(Number(tokens["atmosphere.washStart"])).toBeGreaterThan(GLASS_OPEN.washStart)

    const primary = inkLightness(tokens["ink.primary"])
    const tertiary = inkLightness(tokens["ink.tertiary"])
    expect(primary).toBeGreaterThanOrEqual(90)
    expect(primary - tertiary).toBeGreaterThanOrEqual(30)

    expect(inkLightness(tokens["surface.reading"])).toBeGreaterThanOrEqual(90)
    expect(inkLightness(tokens["ink.reading"])).toBeLessThan(20)
    expect(Number(tokens["glass.reading"])).toBe(GLASS_SEALED.reading)
  })

  it("keeps open glass when there is no atmosphere", () => {
    const tokens = deriveAtmosphereContrast({
      darkSurface: true,
      hasAtmosphere: false,
    })

    expect(tokens["atmosphere.present"]).toBe("0")
    expect(Number(tokens["glass.panel"])).toBe(GLASS_OPEN.panel)
    expect(inkLightness(tokens["ink.primary"])).toBeLessThan(90)
  })

  it("uses dark ink on a light surface and still seals glass for atmosphere", () => {
    const tokens = deriveAtmosphereContrast({
      darkSurface: false,
      hasAtmosphere: true,
    })

    expect(inkLightness(tokens["ink.primary"])).toBeLessThan(20)
    expect(Number(tokens["glass.panel"])).toBe(GLASS_SEALED.panel)
  })
})

describe("domainHasAtmosphere", () => {
  it("treats a cover URL or theme background as atmosphere", () => {
    expect(domainHasAtmosphere({ background: "" }, null)).toBe(false)
    expect(domainHasAtmosphere({ background: "/images/dawn.jpg" }, null)).toBe(true)
    expect(domainHasAtmosphere({ background: "" }, "https://cdn.example/cover.png")).toBe(true)
  })
})

describe("contrast helpers", () => {
  it("converts alpha and hsl strings for CSS / hex washes", () => {
    expect(alphaToHexSuffix(1)).toBe("ff")
    expect(alphaToHexSuffix(0.88)).toBe("e0")
    expect(hslStringToComponents("hsl(38, 20%, 94%)")).toBe("38 20% 94%")
  })
})

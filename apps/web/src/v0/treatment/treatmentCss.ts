import type { CSSProperties } from "react"
import type { ResolvedDomainTreatment } from "./resolveDomainTreatment"

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function expandHex(hex: string): string | null {
  const clean = hex.replace(/^#/, "")
  const expanded =
    clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean
  if (expanded.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(expanded)) return null
  return expanded
}

/** Hex → `H S% L%` components for `hsl(var(--treatment-color) / alpha)` usage. */
export function hexToHslComponents(hex: string): string | null {
  const expanded = expandHex(hex)
  if (!expanded) return null

  const r = parseInt(expanded.slice(0, 2), 16) / 255
  const g = parseInt(expanded.slice(2, 4), 16) / 255
  const b = parseInt(expanded.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function relativeLuminance(hex: string): number {
  const expanded = expandHex(hex)
  if (!expanded) return 1

  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(expanded.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

export function treatmentShellStyle(
  treatment: ResolvedDomainTreatment,
): CSSProperties {
  const background = HEX_COLOR.test(treatment.palette.background)
    ? treatment.palette.background
    : "#f5f0e8"
  const accentComponents = hexToHslComponents(treatment.palette.accent)
  const darkBackground = relativeLuminance(background) < 0.35

  const style: CSSProperties = {
    backgroundColor: background,
    fontFamily: treatment.font.family,
    borderLeft: `3px solid ${treatment.palette.accent}`,
  }

  if (darkBackground) {
    style.color = "hsl(40 18% 92%)"
  }

  if (accentComponents) {
    ;(style as Record<string, string>)["--treatment-color"] = accentComponents
    ;(style as Record<string, string>)["--treatment-color-alpha-08"] =
      `hsl(${accentComponents} / 0.08)`
    ;(style as Record<string, string>)["--treatment-color-alpha-12"] =
      `hsl(${accentComponents} / 0.12)`
    ;(style as Record<string, string>)["--treatment-color-alpha-20"] =
      `hsl(${accentComponents} / 0.20)`
  }

  return style
}

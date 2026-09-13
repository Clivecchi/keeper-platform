import type { CSSProperties } from "react"
import {
  resolvePlacementReadingPlane,
  type PlacementReadingPlane,
} from "@keeper/shared"
import type { ResolvedDomainTreatment } from "./resolveDomainTreatment"
import {
  alphaToHexSuffix,
  deriveAtmosphereContrast,
  hslStringToComponents,
} from "../themes/atmosphereContrast"

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

function applyTreatmentColorVars(
  style: CSSProperties,
  accentHex: string,
): void {
  const accentComponents = hexToHslComponents(accentHex)
  if (!accentComponents) return
  ;(style as Record<string, string>)["--treatment-color"] = accentComponents
  ;(style as Record<string, string>)["--treatment-color-alpha-08"] =
    `hsl(${accentComponents} / 0.08)`
  ;(style as Record<string, string>)["--treatment-color-alpha-12"] =
    `hsl(${accentComponents} / 0.12)`
  ;(style as Record<string, string>)["--treatment-color-alpha-20"] =
    `hsl(${accentComponents} / 0.20)`
}

export type TreatmentShellOptions = {
  /** Domain cover — painted under a Treatment wash so Chronicle reads as the upload. */
  atmosphereUrl?: string | null
}

function applyTreatmentInkVars(
  style: CSSProperties,
  plane: PlacementReadingPlane,
): void {
  const vars = style as Record<string, string>
  vars["--theme-ink-primary"] = hslStringToComponents(plane.ink.primary)
  vars["--theme-ink-secondary"] = hslStringToComponents(plane.ink.secondary)
  vars["--theme-ink-tertiary"] = hslStringToComponents(plane.ink.tertiary)
  vars["--theme-ink-placeholder"] = hslStringToComponents(plane.ink.placeholder)
  vars["--theme-ink-primary-color"] = plane.ink.primary
  vars["--theme-ink-secondary-color"] = plane.ink.secondary
  vars["--theme-ink-tertiary-color"] = plane.ink.tertiary
  vars["--theme-ink-placeholder-color"] = plane.ink.placeholder
  vars["--theme-ink-reading"] = hslStringToComponents(plane.ink.primary)
  vars["--theme-ink-reading-secondary"] = hslStringToComponents(plane.ink.secondary)
  vars["--theme-ink-reading-color"] = plane.ink.primary
  vars["--theme-surface-reading"] = plane.surfaceComponents
  vars["--theme-glass-reading-alpha"] = String(plane.glassAlpha)
  style.color = plane.ink.primary
}

/** Full Treatment — Chronicle + Presents (background, accent, font). */
export function treatmentShellStyle(
  treatment: ResolvedDomainTreatment,
  options: TreatmentShellOptions = {},
): CSSProperties {
  const background = HEX_COLOR.test(treatment.palette.background)
    ? treatment.palette.background
    : "#f5f0e8"
  const atmosphereUrl = options.atmosphereUrl?.trim() || null
  const hasAtmosphere = Boolean(atmosphereUrl)
  const plane = resolvePlacementReadingPlane({
    surfaceHex: background,
    hasAtmosphere,
  })
  const contrast = deriveAtmosphereContrast({
    darkSurface: plane.darkSurface,
    hasAtmosphere,
  })
  const washStartAlpha = plane.adjusted
    ? Math.max(Number(contrast["atmosphere.treatmentWashStart"]), plane.glassAlpha)
    : Number(contrast["atmosphere.treatmentWashStart"])
  const washEndAlpha = plane.adjusted
    ? Math.max(Number(contrast["atmosphere.treatmentWashEnd"]), Math.min(1, plane.glassAlpha + 0.02))
    : Number(contrast["atmosphere.treatmentWashEnd"])

  const style: CSSProperties = {
    backgroundColor: background,
    fontFamily: treatment.font.family,
    borderLeft: `3px solid ${treatment.palette.accent}`,
  }

  if (atmosphereUrl) {
    const washStart = `${background}${alphaToHexSuffix(washStartAlpha)}`
    const washEnd = `${background}${alphaToHexSuffix(washEndAlpha)}`
    style.backgroundImage = `linear-gradient(180deg, ${washStart}, ${washEnd}), url(${atmosphereUrl})`
    style.backgroundSize = "cover"
    style.backgroundPosition = "center"
    style.backgroundRepeat = "no-repeat"
  }

  applyTreatmentInkVars(style, plane)
  applyTreatmentColorVars(style, treatment.palette.accent)
  ;(style as Record<string, string>)["--treatment-surface"] = plane.surfaceHex
  ;(style as Record<string, string>)["--treatment-font-family"] =
    treatment.font.family

  return style
}

/**
 * Accent-only Treatment — Nav + center Dialog.
 * Keeps Theme layout/surfaces; exposes accent border/wash, color vars, and title font var.
 */
export function treatmentAccentStyle(
  treatment: ResolvedDomainTreatment,
): CSSProperties {
  const accent = HEX_COLOR.test(treatment.palette.accent)
    ? treatment.palette.accent
    : "#2d6a7f"
  const accentComponents = hexToHslComponents(accent)

  const style: CSSProperties = {
    borderLeft: `3px solid ${accent}`,
  }

  if (accentComponents) {
    style.backgroundColor = `hsl(${accentComponents} / 0.04)`
  }

  applyTreatmentColorVars(style, accent)
  ;(style as Record<string, string>)["--treatment-font-family"] =
    treatment.font.family.trim() || "Georgia, serif"

  return style
}

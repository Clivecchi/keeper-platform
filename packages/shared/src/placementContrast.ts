/**
 * Placement contrast — theme math that knows where color will sit.
 *
 * Extracted palettes are atmosphere. Type sits on paper, often with glass
 * alpha over that atmosphere. Mid-tone averages fail both light and dark ink.
 * Call this at creation (palette) and again at placement (Chronicle / cover).
 */

export const MIN_BODY_CONTRAST = 4.5

/** Surfaces in this band look like neither paper nor night — both inks wash out. */
export const MIDTONE_LUMINANCE_LOW = 0.16
export const MIDTONE_LUMINANCE_HIGH = 0.6

export const PAPER_LIGHT_HEX = "#f3ebe0"
export const PAPER_DARK_HEX = "#26221e"

export const PAPER_GLASS_OPEN = 0.88
export const PAPER_GLASS_SEALED = 0.96
export const PAPER_GLASS_MIDTONE = 0.98

export type PlacementInkRole = {
  primary: string
  secondary: string
  tertiary: string
  placeholder: string
}

export type PlacementReadingPlane = {
  /** Paper the type sits on (may be pushed off a mid-tone). */
  surfaceHex: string
  /** HSL components for `hsl(var(--theme-surface-reading))`. */
  surfaceComponents: string
  ink: PlacementInkRole
  inkPrimaryHex: string
  darkSurface: boolean
  glassAlpha: number
  contrast: number
  adjusted: boolean
  reason: "as-painted" | "midtone-paper" | "contrast-seal"
}

export type ResolvePlacementReadingPlaneInput = {
  surfaceHex: string
  hasAtmosphere?: boolean
  /** 0–1. When omitted, atmosphere seals paper; open glass otherwise. */
  glassAlpha?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function expandHex(hex: string): string | null {
  const clean = hex.trim().replace(/^#/, "")
  const expanded =
    clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean
  if (expanded.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(expanded)) return null
  return expanded.toLowerCase()
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const expanded = expandHex(hex)
  if (!expanded) return null
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  }
}

function relativeLuminanceRgb(r: number, g: number, b: number): number {
  const channels = [r, g, b].map((raw) => {
    const c = raw / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

export function relativeLuminanceHex(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return relativeLuminanceRgb(rgb.r, rgb.g, rgb.b)
}

export function contrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Effective luminance of paper*alpha over an unknown atmosphere (assume mid gray). */
export function effectivePlacementLuminance(
  surfaceLuminance: number,
  glassAlpha: number,
  atmosphereLuminance = 0.5,
): number {
  const alpha = clamp(glassAlpha, 0, 1)
  return surfaceLuminance * alpha + atmosphereLuminance * (1 - alpha)
}

export function isMidtoneLuminance(luminance: number): boolean {
  return luminance > MIDTONE_LUMINANCE_LOW && luminance < MIDTONE_LUMINANCE_HIGH
}

function hexToHslComponents(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return "36 22% 95%"

  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
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
      default:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function hslToken(h: number, s: number, l: number): string {
  return `hsl(${h}, ${Math.max(0, s)}%, ${Math.max(0, Math.min(100, l))}%)`
}

function inkOnLight(hue: number): PlacementInkRole {
  return {
    primary: hslToken(hue, 22, 12),
    secondary: hslToken(hue, 14, 28),
    tertiary: hslToken(hue, 10, 40),
    placeholder: hslToken(hue, 8, 48),
  }
}

function inkOnDark(hue: number): PlacementInkRole {
  return {
    primary: hslToken(hue, 20, 94),
    secondary: hslToken(hue, 14, 76),
    tertiary: hslToken(hue, 10, 58),
    placeholder: hslToken(hue, 8, 50),
  }
}

function paperHue(hex: string): number {
  const match = hexToHslComponents(hex).match(/^(\d+)/)
  return match ? Number(match[1]) : 30
}

function inkHex(darkSurface: boolean): string {
  return darkSurface ? "#f4eee6" : "#231910"
}

/**
 * Choose the paper + ink for a reading placement.
 * Mid-tone surfaces become cream or charcoal. Atmosphere raises glass seal.
 */
export function resolvePlacementReadingPlane(
  input: ResolvePlacementReadingPlaneInput,
): PlacementReadingPlane {
  const painted = expandHex(input.surfaceHex)
  const paintedHex = painted ? `#${painted}` : PAPER_LIGHT_HEX
  const paintedLum = relativeLuminanceHex(paintedHex) ?? 0.88
  const hasAtmosphere = input.hasAtmosphere === true
  let glassAlpha =
    input.glassAlpha ?? (hasAtmosphere ? PAPER_GLASS_SEALED : PAPER_GLASS_OPEN)
  let surfaceHex = paintedHex
  let reason: PlacementReadingPlane["reason"] = "as-painted"
  let adjusted = false

  if (isMidtoneLuminance(paintedLum)) {
    surfaceHex = paintedLum >= 0.35 ? PAPER_LIGHT_HEX : PAPER_DARK_HEX
    glassAlpha = Math.max(glassAlpha, PAPER_GLASS_MIDTONE)
    reason = "midtone-paper"
    adjusted = true
  }

  const surfaceLum = relativeLuminanceHex(surfaceHex) ?? (surfaceHex === PAPER_DARK_HEX ? 0.08 : 0.88)
  let effective = hasAtmosphere
    ? effectivePlacementLuminance(surfaceLum, glassAlpha)
    : surfaceLum
  let darkSurface = effective < 0.45

  let contrast = contrastRatio(effective, darkSurface ? 0.94 : 0.12)
  if (contrast < MIN_BODY_CONTRAST) {
    glassAlpha = Math.max(glassAlpha, PAPER_GLASS_MIDTONE)
    surfaceHex = darkSurface ? PAPER_DARK_HEX : PAPER_LIGHT_HEX
    const sealedLum = relativeLuminanceHex(surfaceHex) ?? surfaceLum
    effective = hasAtmosphere
      ? effectivePlacementLuminance(sealedLum, glassAlpha)
      : sealedLum
    darkSurface = effective < 0.45
    contrast = contrastRatio(effective, darkSurface ? 0.94 : 0.12)
    if (reason === "as-painted") reason = "contrast-seal"
    adjusted = true
  }

  const hue = paperHue(surfaceHex)
  const ink = darkSurface ? inkOnDark(hue) : inkOnLight(hue)

  return {
    surfaceHex,
    surfaceComponents: hexToHslComponents(surfaceHex),
    ink,
    inkPrimaryHex: inkHex(darkSurface),
    darkSurface,
    glassAlpha: Math.round(clamp(glassAlpha, 0, 1) * 100) / 100,
    contrast: Math.round(contrast * 10) / 10,
    adjusted,
    reason,
  }
}

/** Ink + seal for a painted Chronicle / treatment surface (keeps the hue when it already reads). */
export function resolvePlacementInk(
  surfaceHex: string,
  options: { hasAtmosphere?: boolean; glassAlpha?: number } = {},
): PlacementReadingPlane {
  return resolvePlacementReadingPlane({
    surfaceHex,
    hasAtmosphere: options.hasAtmosphere,
    glassAlpha: options.glassAlpha,
  })
}

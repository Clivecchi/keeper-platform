/**
 * Treatment swatches — the living-book roles a Domain actually uses.
 *
 * Paper + Accent were a storage shortcut. Type, life, and actions still need
 * their own colors, and those colors must hold against the paper after glass.
 */

import {
  contrastRatio,
  hexToRgb,
  relativeLuminanceHex,
  resolvePlacementReadingPlane,
} from "./placementContrast.js"

export const LIFE_ON_DARK = "#3ecfbf"
export const LIFE_ON_LIGHT = "#1a7a72"
export const GOLD_ON_DARK = "#e0b35c"
export const GOLD_ON_LIGHT = "#9a6b1e"
export const TEAL_ACCENT = "#2d6a7f"

export type TreatmentSwatches = {
  paper: string
  ink: string
  accent: string
  signal: string
  action: string
  actionInk: string
  darkSurface: boolean
}

export type ResolveTreatmentSwatchesInput = {
  background: string
  accent?: string
  ink?: string
  signal?: string
  action?: string
  hasAtmosphere?: boolean
}

type Hsl = { h: number; s: number; l: number }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / d + 2) / 6
        break
      default:
        h = ((rn - gn) / d + 4) / 6
        break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hueToRgb(p: number, q: number, t: number): number {
  let tone = t
  if (tone < 0) tone += 1
  if (tone > 1) tone -= 1
  if (tone < 1 / 6) return p + (q - p) * 6 * tone
  if (tone < 1 / 2) return q
  if (tone < 2 / 3) return p + (q - p) * (2 / 3 - tone) * 6
  return p
}

function hslToHex(hsl: Hsl): string {
  const h = ((hsl.h % 360) + 360) % 360 / 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hueToRgb(p, q, h) * 255)
  const b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255)
  return `#${[r, g, b].map((c) => clamp(c, 0, 255).toString(16).padStart(2, "0")).join("")}`
}

function hexToHsl(hex: string): Hsl | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return rgbToHsl(rgb.r, rgb.g, rgb.b)
}

export function hexContrast(a: string, b: string): number {
  return contrastRatio(relativeLuminanceHex(a) ?? 0, relativeLuminanceHex(b) ?? 1)
}

export function inkOnColor(hex: string): string {
  const lum = relativeLuminanceHex(hex) ?? 0.5
  return lum < 0.45 ? "#f7f1e8" : "#1a1612"
}

function ensureOnPaper(color: string, paper: string, min: number): string {
  const hsl = hexToHsl(color)
  if (!hsl) return color
  const paperLum = relativeLuminanceHex(paper) ?? 0.5
  const next = { ...hsl }
  for (let i = 0; i < 14; i += 1) {
    const hex = hslToHex(next)
    if (hexContrast(hex, paper) >= min) return hex
    if (paperLum < 0.45) next.l = Math.min(92, next.l + 6)
    else next.l = Math.max(12, next.l - 6)
  }
  return hslToHex(next)
}

function hueDistance(a: string, b: string): number {
  const ha = hexToHsl(a)?.h ?? 0
  const hb = hexToHsl(b)?.h ?? 0
  const diff = Math.abs(ha - hb)
  return Math.min(diff, 360 - diff)
}

function saturationOf(hex: string): number {
  return (hexToHsl(hex)?.s ?? 0) / 100
}

function accentNeedsPop(accent: string, paper: string): boolean {
  if (hexContrast(accent, paper) < 3) return true
  return hueDistance(accent, paper) < 28 && saturationOf(accent) < 0.28
}

/**
 * Expand a stored Treatment (often only paper + accent) into the roles the UI paints.
 * Missing or muddy roles are derived so a brown-on-brown Domain still has life.
 */
export function resolveTreatmentSwatches(
  input: ResolveTreatmentSwatchesInput,
): TreatmentSwatches {
  const plane = resolvePlacementReadingPlane({
    surfaceHex: input.background,
    hasAtmosphere: input.hasAtmosphere === true,
  })
  const paper = plane.surfaceHex
  const ink = ensureOnPaper(input.ink?.trim() || plane.inkPrimaryHex, paper, 4.5)

  let accent = input.accent?.trim() || TEAL_ACCENT
  if (accentNeedsPop(accent, paper)) {
    accent = plane.darkSurface ? GOLD_ON_DARK : TEAL_ACCENT
  }
  accent = ensureOnPaper(accent, paper, 3.2)

  let signal = input.signal?.trim() || (plane.darkSurface ? LIFE_ON_DARK : LIFE_ON_LIGHT)
  if (hexContrast(signal, paper) < 3.2 || hueDistance(signal, paper) < 18) {
    signal = plane.darkSurface ? LIFE_ON_DARK : LIFE_ON_LIGHT
  }
  signal = ensureOnPaper(signal, paper, 3.2)

  let action = input.action?.trim() || ""
  if (!action || accentNeedsPop(action, paper)) {
    action = saturationOf(accent) >= 0.28 ? accent : plane.darkSurface ? GOLD_ON_DARK : GOLD_ON_LIGHT
  }
  action = ensureOnPaper(action, paper, 3.2)

  return {
    paper,
    ink,
    accent,
    signal,
    action,
    actionInk: inkOnColor(action),
    darkSurface: plane.darkSurface,
  }
}

/**
 * Apply a Stage-local look from extracted imagery.
 * Inherit (null / inherit:true) leaves domain tokens in place.
 */

import type { CSSProperties } from "react"
import type { KeeperStageTheme } from "@keeper/shared"
import { stageThemeInheritsDomain } from "@keeper/shared"

function hexToHslComponents(hex: string): string | null {
  const clean = hex.replace("#", "")
  const match = /^([0-9a-fA-F]{6})$/.exec(clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean)
  if (!match) return null
  const n = parseInt(match[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
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

/** CSS vars for a Stage that grew its own look. Empty when inheriting the domain. */
export function stageThemeCssVars(theme: KeeperStageTheme | null | undefined): CSSProperties {
  if (stageThemeInheritsDomain(theme) || !theme?.palette) return {}
  const surface = hexToHslComponents(theme.palette.surface)
  const accent = hexToHslComponents(theme.palette.accent)
  if (!surface) return {}
  const ink = theme.palette.dark ? "38 20% 94%" : "30 22% 12%"
  const inkSecondary = theme.palette.dark ? "38 14% 76%" : "30 14% 28%"
  const readingSurface = theme.palette.dark ? "36 22% 95%" : surface
  return {
    ["--theme-focus-ring" as string]: accent ?? "168 70% 38%",
    ["--theme-surface-reading" as string]: readingSurface,
    ["--theme-ink-reading" as string]: theme.palette.dark ? "30 22% 12%" : ink,
    ["--theme-ink-reading-secondary" as string]: theme.palette.dark ? "30 14% 28%" : inkSecondary,
    ["--theme-ink-reading-color" as string]: theme.palette.dark
      ? "hsl(30 22% 12%)"
      : `hsl(${ink})`,
  }
}

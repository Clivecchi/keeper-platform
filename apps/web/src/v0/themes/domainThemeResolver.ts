/**
 * domainThemeResolver.ts
 *
 * Bridges DomainFrameTheme (from domain JSON) to StyleScope ThemeTokens.
 * This is the single place where domain identity → visual tokens mapping happens.
 *
 * Architecture:
 *   DomainFrameTheme (wordmark, colors, fonts, background)
 *     → resolveDomainTheme()
 *       → ThemeTokens (surface.page, ink.primary, focus.ring, ...)
 *         → registerRuntimeTheme() in themeResolver
 *           → StyleScope reads via resolveThemeTokens('domain-resolved')
 *
 * Font gap: DomainFrameTheme carries fonts.display and fonts.ui, but ThemeTokens
 * has no font-family keys and tokensToCSSVars does not emit font vars.
 * Font wiring is deferred to Pass 2.
 */

import type { DomainFrameTheme } from '../data/domain-frame.types'
import type { ThemeTokens } from './themeRegistry'
import { getThemeTokensBySlug } from './themeRegistry'
import type { ColorScheme } from '../../context/ThemeContext'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface HSL { h: number; s: number; l: number }

/** Parse a hex color string to {h, s, l} (0-360, 0-100, 0-100). Returns null on invalid input. */
function hexToHSL(hex: string): HSL | null {
  const clean = hex.replace(/^#/, '')
  const expanded = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  if (expanded.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(expanded)) return null

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
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/** Produce a full HSL string compatible with StyleScope's tokensToCSSVars parser. */
function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${Math.max(0, s)}%, ${Math.max(0, Math.min(100, l))}%)`
}

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ---------------------------------------------------------------------------
// Light mode token resolution
// ---------------------------------------------------------------------------

function resolveLight(primary: HSL, accent: HSL, surface: HSL, base: ThemeTokens): ThemeTokens {
  // Surface hue: use the surface color's hue for backgrounds, cap saturation so it reads as near-white
  const sH = surface.h
  const sS = clamp(surface.s, 0, 20)

  // Ink hue: use the primary color's hue, keep it dark for legibility
  const pH = primary.h
  const pS = clamp(primary.s, 0, 45)
  const pL = clamp(primary.l, 0, 35)

  // Accent hue: for interactive states and focus
  const aH = accent.h
  const aS = clamp(accent.s, 30, 80)
  const aL = clamp(accent.l, 40, 65)

  return {
    ...base,

    // Surfaces — tinted very lightly by the surface color
    'surface.page':     hsl(sH, sS,      97),
    'surface.paper':    hsl(sH, sS - 3,  96),
    'surface.panel':    hsl(sH, sS - 1,  94),
    'surface.elevated': hsl(sH, sS - 5,  98),

    // Ink — derived from the primary hue, dark for contrast
    'ink.primary':     hsl(pH, pS,      pL),
    'ink.secondary':   hsl(pH, clamp(pS * 0.7, 0, 30), clamp(pL + 20, 35, 55)),
    'ink.tertiary':    hsl(pH, clamp(pS * 0.5, 0, 20), clamp(pL + 35, 50, 65)),
    'ink.placeholder': hsl(pH, 10,      70),

    // Lines and borders — surface-tinted
    'line.hairline':   hsl(sH, 10, 80),
    'line.ruled':      hsl(sH, 10, 80),
    'border.soft':     hsl(sH, 12, 88),
    'border.strong':   hsl(sH, 15, 78),

    // Shadow — keep from base (neutral)
    'shadow.soft': base['shadow.soft'],

    // Interactive — accent-driven
    'focus.ring':     hsl(aH, aS, aL),
    'hover.surface':  hsl(sH, sS + 3,  92),
    'press.surface':  hsl(sH, sS + 5,  88),

    // Dialogue — carry through from base unchanged in light mode
    'dialogue.userBg':  base['dialogue.userBg'],
    'dialogue.agentBg': base['dialogue.agentBg'],
    'dialogue.areaBg':  base['dialogue.areaBg'],
    'dialogue.border':  base['dialogue.border'],

    // Layout — always from base
    'radius.sheet':        base['radius.sheet'],
    'space.framePadding':  base['space.framePadding'],
    'space.sheetPadding':  base['space.sheetPadding'],
  }
}

// ---------------------------------------------------------------------------
// Dark mode token resolution
// ---------------------------------------------------------------------------

function resolveDark(primary: HSL, accent: HSL, surface: HSL, base: ThemeTokens): ThemeTokens {
  // In dark mode, use the surface hue to tint the dark backgrounds
  const sH = surface.h
  const sS = clamp(surface.s, 0, 15)

  // Accent hue: brighten slightly for dark backgrounds
  const aH = accent.h
  const aS = clamp(accent.s, 40, 85)
  const aL = clamp(accent.l, 50, 70)

  return {
    ...base,

    // Surfaces — very dark, tinted by surface hue
    'surface.page':     hsl(sH, sS,     8),
    'surface.paper':    hsl(sH, sS,     12),
    'surface.panel':    hsl(sH, sS,     15),
    'surface.elevated': hsl(sH, sS + 2, 18),

    // Ink — near-white, tinted by primary hue
    'ink.primary':     hsl(primary.h, 10, 92),
    'ink.secondary':   hsl(primary.h,  8, 65),
    'ink.tertiary':    hsl(primary.h,  5, 50),
    'ink.placeholder': hsl(primary.h,  5, 38),

    // Lines and borders — dark, surface-tinted
    'line.hairline':   hsl(sH, 12, 22),
    'line.ruled':      hsl(sH, 12, 22),
    'border.soft':     hsl(sH, 10, 20),
    'border.strong':   hsl(sH, 12, 35),

    // Shadow — stronger in dark mode
    'shadow.soft': '0 1px 3px hsl(0, 0%, 0%, 0.4), 0 1px 2px hsl(0, 0%, 0%, 0.3)',

    // Interactive
    'focus.ring':     hsl(aH, aS, aL),
    'hover.surface':  hsl(sH, sS, 20),
    'press.surface':  hsl(sH, sS + 3, 25),

    // Dialogue — dark-adjusted
    'dialogue.userBg':  base['dialogue.userBg'],
    'dialogue.agentBg': hsl(sH, sS, 15),
    'dialogue.areaBg':  hsl(sH, sS, 12),
    'dialogue.border':  hsl(sH, 12, 22),

    // Layout — always from base
    'radius.sheet':        base['radius.sheet'],
    'space.framePadding':  base['space.framePadding'],
    'space.sheetPadding':  base['space.sheetPadding'],
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve domain JSON theme block to StyleScope ThemeTokens.
 *
 * Priority:
 *   1. Load base tokens from themeRegistry by baseThemeSlug (default: 'neutral')
 *   2. If domainTheme.colors is present, map primary/accent/surface hex values to tokens
 *   3. If colorScheme is 'dark', apply dark mode token inversions
 *   4. Return merged ThemeTokens
 *
 * Font gap: domainTheme.fonts (display, ui) cannot be mapped because ThemeTokens
 * has no font-family keys and tokensToCSSVars does not emit font vars.
 * Fonts are a Pass 2 concern.
 */
export function resolveDomainThemeSync(
  domainTheme: DomainFrameTheme,
  colorScheme: ColorScheme,
  baseThemeSlug = 'neutral',
): ThemeTokens {
  const base = getThemeTokensBySlug(baseThemeSlug) ?? getThemeTokensBySlug('neutral') ?? {}

  const { colors } = domainTheme

  // If no colors provided, fall back to the base tokens with dark-mode handling only
  if (!colors?.primary && !colors?.accent && !colors?.surface) {
    if (colorScheme === 'dark') {
      const fallbackPrimary: HSL = { h: 0, s: 0, l: 30 }
      const fallbackAccent: HSL = { h: 221, s: 83, l: 53 }
      const fallbackSurface: HSL = { h: 0, s: 0, l: 50 }
      return resolveDark(fallbackPrimary, fallbackAccent, fallbackSurface, base)
    }
    return { ...base }
  }

  const primary = hexToHSL(colors.primary ?? '#2d6a7f') ?? { h: 200, s: 48, l: 34 }
  const accent  = hexToHSL(colors.accent  ?? '#b8963e') ?? { h: 38,  s: 50, l: 48 }
  const surface = hexToHSL(colors.surface ?? '#fdfaf4') ?? { h: 42,  s: 50, l: 97 }

  return colorScheme === 'dark'
    ? resolveDark(primary, accent, surface, base)
    : resolveLight(primary, accent, surface, base)
}

/**
 * Async variant — same logic, async for future extensibility (e.g. API-fetched base themes).
 */
export async function resolveDomainTheme(
  domainTheme: DomainFrameTheme,
  colorScheme: ColorScheme,
  baseThemeSlug = 'neutral',
): Promise<ThemeTokens> {
  return resolveDomainThemeSync(domainTheme, colorScheme, baseThemeSlug)
}

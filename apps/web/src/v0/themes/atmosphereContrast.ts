/**
 * Atmosphere contrast — the theme-engine step that decides where contrast is required.
 *
 * Cover images sit behind glass. Fixed low alphas let texture bleed through type.
 * This module derives:
 *   1. Glass alphas — how sealed panels must be when atmosphere is present
 *   2. Ink roles — must-read (primary) vs supporting (secondary) vs muted (tertiary)
 *
 * Callers apply the tokens. CSS must not invent its own opacity or ink hierarchy.
 */

import type { DomainFrameTheme } from '../data/domain-frame.types'

export type AtmosphereContrastInput = {
  /** True when the reading surface is dark (Warm Dark board, or a dark domain surface). */
  darkSurface: boolean
  /** True when a cover / atmosphere image sits behind glass. */
  hasAtmosphere: boolean
}

export type AtmosphereGlassAlphas = {
  panel: number
  nav: number
  navItem: number
  header: number
  bubble: number
  chronicle: number
  composer: number
  composerInput: number
  reading: number
  washStart: number
  washEnd: number
  treatmentWashStart: number
  treatmentWashEnd: number
}

export type AtmosphereContrastTokens = {
  'atmosphere.present': '0' | '1'
  'glass.panel': string
  'glass.nav': string
  'glass.navItem': string
  'glass.header': string
  'glass.bubble': string
  'glass.chronicle': string
  'glass.composer': string
  'glass.composerInput': string
  'glass.reading': string
  'atmosphere.washStart': string
  'atmosphere.washEnd': string
  'atmosphere.treatmentWashStart': string
  'atmosphere.treatmentWashEnd': string
  'surface.reading': string
  'ink.reading': string
  'ink.readingSecondary': string
  'ink.primary': string
  'ink.secondary': string
  'ink.tertiary': string
  'ink.placeholder': string
  'composer.text': string
  'composer.placeholder': string
  'composer.caret': string
}

/** Current board glass — atmosphere is allowed to breathe. */
export const GLASS_OPEN: AtmosphereGlassAlphas = {
  panel: 0.38,
  nav: 0.62,
  navItem: 0.55,
  header: 0.55,
  bubble: 0.72,
  chronicle: 0.76,
  composer: 0.55,
  composerInput: 0.9,
  reading: 0.88,
  washStart: 0.08,
  washEnd: 0.75,
  treatmentWashStart: 0.77,
  treatmentWashEnd: 0.93,
}

/** Atmosphere present — darken bleed-through so type can hold a reading plane. */
export const GLASS_SEALED: AtmosphereGlassAlphas = {
  panel: 0.8,
  nav: 0.86,
  navItem: 0.78,
  header: 0.8,
  bubble: 0.88,
  chronicle: 0.88,
  composer: 0.82,
  composerInput: 0.94,
  reading: 0.94,
  washStart: 0.42,
  washEnd: 0.86,
  treatmentWashStart: 0.88,
  treatmentWashEnd: 0.96,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hslToken(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`
}

function alphaToken(value: number): string {
  return String(Math.round(clamp(value, 0, 1) * 100) / 100)
}

/** 0–1 alpha → two-digit hex suffix for `#rrggbbaa` washes. */
export function alphaToHexSuffix(alpha: number): string {
  return Math.round(clamp(alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')
}

/** `hsl(38, 20%, 94%)` → `38 20% 94%` for `hsl(var(--theme-ink-primary))`. */
export function hslStringToComponents(value: string): string {
  const match = value.match(
    /hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)/,
  )
  if (!match) return value
  return `${match[1]} ${match[2]}% ${match[3]}%`
}

export function domainHasAtmosphere(
  domainTheme: Pick<DomainFrameTheme, 'background'> | null | undefined,
  coverUrl?: string | null,
): boolean {
  return Boolean(domainTheme?.background?.trim() || coverUrl?.trim())
}

function deriveInk(darkSurface: boolean, hasAtmosphere: boolean): Pick<
  AtmosphereContrastTokens,
  'ink.primary' | 'ink.secondary' | 'ink.tertiary' | 'ink.placeholder'
> {
  if (darkSurface && hasAtmosphere) {
    return {
      'ink.primary': hslToken(38, 20, 94),
      'ink.secondary': hslToken(38, 14, 76),
      'ink.tertiary': hslToken(36, 10, 58),
      'ink.placeholder': hslToken(36, 8, 50),
    }
  }
  if (darkSurface) {
    return {
      'ink.primary': hslToken(38, 22, 88),
      'ink.secondary': hslToken(38, 16, 72),
      'ink.tertiary': hslToken(36, 12, 54),
      'ink.placeholder': hslToken(36, 10, 44),
    }
  }
  if (hasAtmosphere) {
    return {
      'ink.primary': hslToken(30, 22, 14),
      'ink.secondary': hslToken(30, 14, 28),
      'ink.tertiary': hslToken(30, 10, 40),
      'ink.placeholder': hslToken(30, 8, 48),
    }
  }
  return {
    'ink.primary': hslToken(30, 20, 18),
    'ink.secondary': hslToken(30, 14, 32),
    'ink.tertiary': hslToken(30, 10, 46),
    'ink.placeholder': hslToken(30, 8, 58),
  }
}

/**
 * Paper card that sits on atmosphere (Cover, Stage Root, invitation frames).
 * Board chrome stays Warm Dark; the card is a cream reading plane so type and
 * frame edges hold against a dark cover photo.
 */
function deriveReadingPlane(
  darkSurface: boolean,
  hasAtmosphere: boolean,
): Pick<AtmosphereContrastTokens, 'surface.reading' | 'ink.reading' | 'ink.readingSecondary'> {
  if (hasAtmosphere) {
    return {
      'surface.reading': hslToken(36, 22, 95),
      'ink.reading': hslToken(30, 22, 12),
      'ink.readingSecondary': hslToken(30, 14, 28),
    }
  }
  if (darkSurface) {
    return {
      'surface.reading': hslToken(28, 10, 14),
      'ink.reading': hslToken(38, 22, 88),
      'ink.readingSecondary': hslToken(38, 16, 72),
    }
  }
  return {
    'surface.reading': hslToken(35, 15, 96),
    'ink.reading': hslToken(30, 20, 18),
    'ink.readingSecondary': hslToken(30, 14, 32),
  }
}

function deriveComposer(
  darkSurface: boolean,
  hasAtmosphere: boolean,
): Pick<AtmosphereContrastTokens, 'composer.text' | 'composer.placeholder' | 'composer.caret'> {
  if (darkSurface) {
    return {
      'composer.text': hasAtmosphere ? hslToken(28, 70, 72) : hslToken(28, 75, 62),
      'composer.placeholder': hasAtmosphere ? hslToken(38, 16, 64) : hslToken(28, 40, 56),
      'composer.caret': hslToken(22, 80, 58),
    }
  }
  return {
    'composer.text': hslToken(30, 22, 18),
    'composer.placeholder': hslToken(30, 10, 46),
    'composer.caret': hslToken(25, 40, 40),
  }
}

export function deriveAtmosphereContrast(
  input: AtmosphereContrastInput,
): AtmosphereContrastTokens {
  const glass = input.hasAtmosphere ? GLASS_SEALED : GLASS_OPEN
  return {
    'atmosphere.present': input.hasAtmosphere ? '1' : '0',
    'glass.panel': alphaToken(glass.panel),
    'glass.nav': alphaToken(glass.nav),
    'glass.navItem': alphaToken(glass.navItem),
    'glass.header': alphaToken(glass.header),
    'glass.bubble': alphaToken(glass.bubble),
    'glass.chronicle': alphaToken(glass.chronicle),
    'glass.composer': alphaToken(glass.composer),
    'glass.composerInput': alphaToken(glass.composerInput),
    'glass.reading': alphaToken(glass.reading),
    'atmosphere.washStart': alphaToken(glass.washStart),
    'atmosphere.washEnd': alphaToken(glass.washEnd),
    'atmosphere.treatmentWashStart': alphaToken(glass.treatmentWashStart),
    'atmosphere.treatmentWashEnd': alphaToken(glass.treatmentWashEnd),
    ...deriveInk(input.darkSurface, input.hasAtmosphere),
    ...deriveReadingPlane(input.darkSurface, input.hasAtmosphere),
    ...deriveComposer(input.darkSurface, input.hasAtmosphere),
  }
}

export const ATMOSPHERE_CONTRAST_KEYS = [
  'atmosphere.present',
  'glass.panel',
  'glass.nav',
  'glass.navItem',
  'glass.header',
  'glass.bubble',
  'glass.chronicle',
  'glass.composer',
  'glass.composerInput',
  'glass.reading',
  'atmosphere.washStart',
  'atmosphere.washEnd',
  'atmosphere.treatmentWashStart',
  'atmosphere.treatmentWashEnd',
  'surface.reading',
  'ink.reading',
  'ink.readingSecondary',
  'ink.primary',
  'ink.secondary',
  'ink.tertiary',
  'ink.placeholder',
  'composer.text',
  'composer.placeholder',
  'composer.caret',
] as const

export function pickAtmosphereContrastTokens(
  tokens: Record<string, string>,
): Partial<AtmosphereContrastTokens> {
  const picked: Partial<AtmosphereContrastTokens> = {}
  for (const key of ATMOSPHERE_CONTRAST_KEYS) {
    const value = tokens[key]
    if (value != null) {
      ;(picked as Record<string, string>)[key] = value
    }
  }
  return picked
}

export function atmospherePresentFromTokens(
  tokens: Record<string, string> | null | undefined,
): boolean {
  return tokens?.['atmosphere.present'] === '1'
}

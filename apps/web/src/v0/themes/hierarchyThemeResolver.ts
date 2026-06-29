/**
 * Hierarchy theme resolution — Moment → Path → Journey → Keeper → domain frame JSON.
 *
 * DB `themes.style` (full V0 tokens) wins when present; otherwise palette hex is
 * mapped through domainThemeResolver (same path as Ke3p brand colors).
 */

import { apiFetch } from '../../lib/api'
import type { DomainFrameTheme } from '../data/domain-frame.types'
import type { ColorScheme } from '../../context/ThemeContext'
import type { UniversalBoardSelection } from '../boards/UniversalBoardContext'
import { resolveDomainThemeSync } from './domainThemeResolver'
import type { ThemeTokens } from './themeRegistry'
import { DEFAULT_BASE_THEME_SLUG } from './constants'

export interface DbThemeRecord {
  id: string
  slug: string
  label: string
  palette: Record<string, string>
  style?: Record<string, string> | null
  default_mode?: string
}

const STYLE_TOKEN_KEYS = [
  'surface.page',
  'ink.primary',
  'focus.ring',
] as const

export function hasV0StyleTokens(style: Record<string, unknown> | null | undefined): style is ThemeTokens {
  if (!style || typeof style !== 'object') return false
  return STYLE_TOKEN_KEYS.every((key) => typeof style[key] === 'string')
}

export function paletteToDomainTheme(palette: Record<string, string>): DomainFrameTheme {
  return {
    wordmark: '',
    tagline: '',
    background: '',
    colors: {
      primary: palette.primary ?? palette.text ?? '#3d3830',
      accent: palette.accent ?? palette.secondary ?? '#6b7355',
      surface: palette.surface ?? palette.background ?? '#f5f3ef',
    },
    fonts: {
      display: 'Cormorant Garamond',
      ui: 'Outfit',
    },
  }
}

export function resolveDbThemeTokens(
  theme: DbThemeRecord,
  colorScheme: ColorScheme,
  baseThemeSlug = DEFAULT_BASE_THEME_SLUG,
): ThemeTokens {
  if (hasV0StyleTokens(theme.style ?? undefined)) {
    if (colorScheme === 'dark' && theme.default_mode !== 'dark') {
      return resolveDomainThemeSync(
        paletteToDomainTheme(theme.palette),
        'dark',
        baseThemeSlug,
      )
    }
    return { ...(theme.style as ThemeTokens) }
  }

  return resolveDomainThemeSync(
    paletteToDomainTheme(theme.palette),
    colorScheme,
    baseThemeSlug,
  )
}

export async function fetchDbThemeById(themeId: string): Promise<DbThemeRecord | null> {
  try {
    const response = await apiFetch(`/api/themes/${themeId}`)
    const data = response?.data ?? response
    if (!data?.id) return null
    return data as DbThemeRecord
  } catch {
    return null
  }
}

/** Walk entity chain — most specific theme_id wins. */
export async function resolveThemeIdFromSelection(
  selection: UniversalBoardSelection | undefined,
): Promise<string | null> {
  if (!selection) return null

  if (selection.selectedMomentId) {
    const data = await apiFetch(`/api/moments/${encodeURIComponent(selection.selectedMomentId)}`)
    const themeId = (data?.moment?.theme_id ?? data?.theme_id) as string | undefined
    if (themeId) return themeId
  }

  if (selection.selectedPathId) {
    const data = await apiFetch(`/api/paths/${encodeURIComponent(selection.selectedPathId)}`)
    const themeId = (data?.path?.theme_id ?? data?.theme_id) as string | undefined
    if (themeId) return themeId
  }

  const journeyId = selection.selectedJourneyId ?? selection.activeJourneyId
  if (journeyId) {
    const data = await apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`)
    const themeId = (data?.theme?.id ?? data?.theme_id) as string | undefined
    if (themeId) return themeId
  }

  if (selection.selectedKeeperId) {
    const data = await apiFetch(`/api/keepers/${encodeURIComponent(selection.selectedKeeperId)}`)
    const themeId = (data?.keeper?.theme_id ?? data?.theme_id) as string | undefined
    if (themeId) return themeId
  }

  return null
}

export async function resolveBoardThemeTokens(params: {
  domainTheme: DomainFrameTheme
  colorScheme: ColorScheme
  selection?: UniversalBoardSelection
}): Promise<ThemeTokens> {
  const { domainTheme, colorScheme, selection } = params
  const domainTokens = resolveDomainThemeSync(domainTheme, colorScheme)

  const themeId = await resolveThemeIdFromSelection(selection)
  if (!themeId) return domainTokens

  const dbTheme = await fetchDbThemeById(themeId)
  if (!dbTheme) return domainTokens

  const entityTokens = resolveDbThemeTokens(dbTheme, colorScheme)
  return { ...domainTokens, ...entityTokens }
}

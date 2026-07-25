"use client"

/**
 * Re-registers domain-resolved theme tokens when hierarchy selection changes.
 * Runs inside UniversalBoardProvider so Moment → Path → Journey hierarchy applies.
 *
 * Atmosphere rule: cast / instrument toggles must NOT touch global theme.
 * Only Moment / Path / Journey / Keeper theme_id walks may re-register tokens.
 */

import * as React from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useV0ShellOptional } from '../shell/V0ShellContext'
import { useUniversalBoardOptional } from '../boards/UniversalBoardContext'
import { DOMAIN_THEME_SLUG } from './constants'
import { registerRuntimeTheme } from './themeResolver'
import {
  resolveBoardThemeTokens,
  type BoardThemeHierarchySelection,
} from './hierarchyThemeResolver'
import { resolveDomainThemeSync } from './domainThemeResolver'
import type { DomainFrameTheme } from '../data/domain-frame.types'

const EMPTY_DOMAIN_THEME: DomainFrameTheme = {
  wordmark: '',
  tagline: '',
  background: '',
  colors: { primary: '', accent: '', surface: '' },
  fonts: { display: 'Outfit', ui: 'Outfit' },
}

export function useBoardThemeRegistration(): void {
  const shell = useV0ShellOptional()
  const board = useUniversalBoardOptional()
  const { colorScheme } = useTheme()

  const domainFrame = shell?.domainFrame
  const urlThemeSlug = shell?.themeSlug

  const selection = board?.selection
  const momentId = selection?.selectedMomentId ?? null
  const pathId = selection?.selectedPathId ?? null
  const journeyId = selection?.selectedJourneyId ?? selection?.activeJourneyId ?? null
  const keeperId = selection?.selectedKeeperId ?? null

  React.useEffect(() => {
    if (urlThemeSlug) return
    if (!domainFrame?.theme) return

    let cancelled = false

    const hierarchy: BoardThemeHierarchySelection = {
      selectedMomentId: momentId,
      selectedPathId: pathId,
      selectedJourneyId: journeyId,
      selectedKeeperId: keeperId,
    }

    void (async () => {
      try {
        const tokens = await resolveBoardThemeTokens({
          domainTheme: domainFrame.theme ?? EMPTY_DOMAIN_THEME,
          colorScheme,
          selection: hierarchy,
        })

        if (!cancelled) {
          registerRuntimeTheme(DOMAIN_THEME_SLUG, tokens)
        }
      } catch (error) {
        console.warn('[BoardTheme] Hierarchy resolution failed, keeping domain tokens:', error)
        if (!cancelled) {
          registerRuntimeTheme(
            DOMAIN_THEME_SLUG,
            resolveDomainThemeSync(domainFrame.theme ?? EMPTY_DOMAIN_THEME, colorScheme),
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    urlThemeSlug,
    domainFrame?.theme,
    colorScheme,
    momentId,
    pathId,
    journeyId,
    keeperId,
  ])
}

"use client"

/**
 * Re-registers domain-resolved theme tokens when hierarchy selection changes.
 *
 * Visual hierarchy:
 *   Domain cover → Domain Treatment / theme (floor)
 *   Surfaced Chronicle subject overlays (Library image; Moment → Path → Journey → Keeper theme_id)
 *   Cast / instruments never change atmosphere
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
import { apiFetch } from '../../lib/apiFetch'
import { getBlobProxyUrl } from '../../lib/blobProxy'
import { isLibraryImageSource } from '../boards/libraryBrowse'
import { extractPaletteFromImageSource } from './extractImagePalette'
import { clearSurfaceLook, setSurfaceLook } from './surfaceLookStore'

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
  const libraryItemId = selection?.selectedLibraryItemId ?? null

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
        const domainTheme = domainFrame.theme ?? EMPTY_DOMAIN_THEME
        let overlayTheme = domainTheme

        if (libraryItemId) {
          try {
            const row = (await apiFetch(
              `/api/library-items/${encodeURIComponent(libraryItemId)}`,
            )) as { source_type?: string; source_ref?: string }
            const sourceType = typeof row.source_type === 'string' ? row.source_type : ''
            const sourceRef = typeof row.source_ref === 'string' ? row.source_ref.trim() : ''
            if (sourceRef && isLibraryImageSource({ source_type: sourceType, source_ref: sourceRef })) {
              const palette = await extractPaletteFromImageSource(sourceRef)
              const atmosphereUrl = getBlobProxyUrl(sourceRef)
              overlayTheme = {
                ...domainTheme,
                colors: {
                  primary: palette.primary,
                  accent: palette.accent,
                  surface: palette.surface,
                },
              }
              if (!cancelled) {
                setSurfaceLook({
                  source: 'library',
                  subjectId: libraryItemId,
                  atmosphereUrl,
                  palette,
                })
              }
            } else if (!cancelled) {
              clearSurfaceLook()
            }
          } catch (error) {
            console.warn('[BoardTheme] Library surface look skipped:', error)
            if (!cancelled) clearSurfaceLook()
          }
        } else if (!cancelled) {
          clearSurfaceLook()
        }

        const tokens = await resolveBoardThemeTokens({
          domainTheme: overlayTheme,
          colorScheme,
          selection: hierarchy,
        })

        if (!cancelled) {
          registerRuntimeTheme(DOMAIN_THEME_SLUG, tokens)
        }
      } catch (error) {
        console.warn('[BoardTheme] Hierarchy resolution failed, keeping domain tokens:', error)
        if (!cancelled) {
          clearSurfaceLook()
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
    libraryItemId,
  ])
}

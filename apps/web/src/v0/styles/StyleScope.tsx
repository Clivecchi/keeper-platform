import React from 'react'
import type { StyleId } from './styles'
import { getStyleDefinition, tokensToCSSVars } from './styleRegistry'
import type { StyleTokens } from './styleRegistry'
import { useStyleOverride } from './StyleOverrideProvider'
import {
  getRuntimeThemeTokens,
  getRuntimeThemeVersion,
  resolveThemeTokens,
  subscribeRuntimeTheme,
} from '../themes/themeResolver'
import {
  atmospherePresentFromTokens,
  deriveAtmosphereContrast,
  pickAtmosphereContrastTokens,
} from '../themes/atmosphereContrast'

/**
 * How a themeSlug merges onto the style registry shell:
 * - `full` — theme replaces surfaces, ink, dialogue, etc. (Cover / ?theme= preview)
 * - `treatment` — keep Warm Dark (or active style) surfaces; take focus.ring plus
 *   atmosphere contrast (glass alphas + high-contrast vs muted ink) so cover
 *   images cannot wash out type. Domain cream surfaces still do not replace the shell.
 */
export type StyleThemeApply = 'full' | 'treatment'

interface StyleScopeProps {
  styleId: StyleId
  themeSlug?: string | null
  /**
   * Member Universal Board default is `treatment` (Warm Dark surfaces + domain accent
   * + atmosphere contrast). Public frames and `?theme=` previews use `full`.
   */
  themeApply?: StyleThemeApply
  children: React.ReactNode
  /** Merged with `v0-style-scope` for flex layout in shells (e.g. boards). */
  className?: string
}

export function StyleScope({
  styleId,
  themeSlug,
  themeApply = 'full',
  children,
  className,
}: StyleScopeProps) {
  const { exportTokens, setCurrentStyle } = useStyleOverride()

  // Set the current style in the provider
  React.useEffect(() => {
    setCurrentStyle(styleId)
  }, [styleId, setCurrentStyle])

  // Subscribe so Curtain / V0Shell / board hierarchy registerRuntimeTheme() re-paints.
  // A plain Map read during render never notified React — board could keep DEFAULT after curtain.
  const runtimeVersion = React.useSyncExternalStore(
    subscribeRuntimeTheme,
    getRuntimeThemeVersion,
    getRuntimeThemeVersion,
  )

  // Resolve theme tokens if themeSlug is provided
  const [themeTokens, setThemeTokens] = React.useState<Record<string, string> | null>(() => {
    if (!themeSlug) return null
    const runtime = getRuntimeThemeTokens(themeSlug)
    return runtime ? (runtime as unknown as Record<string, string>) : null
  })
  const [themeLoading, setThemeLoading] = React.useState(() => {
    if (!themeSlug) return false
    return getRuntimeThemeTokens(themeSlug) === null
  })

  React.useEffect(() => {
    if (!themeSlug) {
      setThemeTokens(null)
      setThemeLoading(false)
      return
    }

    const runtime = getRuntimeThemeTokens(themeSlug)
    if (runtime) {
      setThemeTokens(runtime as unknown as Record<string, string>)
      setThemeLoading(false)
      return
    }

    setThemeLoading(true)
    resolveThemeTokens(themeSlug)
        .then((tokens) => {
          setThemeTokens(tokens)
          setThemeLoading(false)
        })
        .catch((error) => {
          console.error('Failed to resolve theme tokens:', error)
          setThemeTokens(null)
          setThemeLoading(false)
        })
  }, [themeSlug, runtimeVersion])

  // Prefer live runtime registry (version subscription above forces re-read after register).
  const liveRuntime = themeSlug
    ? (getRuntimeThemeTokens(themeSlug) as unknown as Record<string, string> | null)
    : null
  const effectiveThemeTokens = liveRuntime ?? themeTokens

  // Get base tokens - merge theme with style registry so dialogue tokens are always present
  const baseTokens = React.useMemo(() => {
    const styleDefinition = getStyleDefinition(styleId)
    const styleFallback = styleDefinition?.tokens ?? {
      'surface.page': '#ffffff',
      'surface.paper': '#fefefe',
      'surface.panel': '#fcfcfc',
      'surface.elevated': '#ffffff',
      'ink.primary': '#000000',
      'ink.secondary': '#666666',
      'ink.tertiary': '#999999',
      'ink.placeholder': '#cccccc',
      'line.hairline': '#e5e5e5',
      'line.ruled': '#e5e5e5',
      'border.soft': '#f0f0f0',
      'border.strong': '#d0d0d0',
      'shadow.soft': '0 1px 3px rgba(0,0,0,0.1)',
      'focus.ring': '#007acc',
      'hover.surface': '#f8f8f8',
      'press.surface': '#f0f0f0',
      'radius.sheet': '4px',
      'space.framePadding': '7px',
      'space.sheetPadding': '24px',
      'dialogue.userBg': 'hsl(14, 60%, 56%)',
      'dialogue.agentBg': 'hsl(0, 0%, 100%)',
      'dialogue.areaBg': 'hsl(35, 33%, 97%)',
      'dialogue.border': 'hsl(35, 20%, 88%)',
    } as StyleTokens

    if (effectiveThemeTokens) {
      if (themeApply === 'treatment') {
        // Board chrome: Warm Dark surfaces/dialogue stay. Accent + contrast come from the engine.
        const contrast = deriveAtmosphereContrast({
          darkSurface: true,
          hasAtmosphere: atmospherePresentFromTokens(effectiveThemeTokens),
        })
        return {
          ...styleFallback,
          'focus.ring': effectiveThemeTokens['focus.ring'] || styleFallback['focus.ring'],
          ...contrast,
        } as StyleTokens
      }

      // Override style tokens with theme tokens; theme may omit dialogue, so keep style fallbacks
      return {
        ...styleFallback,
        ...pickAtmosphereContrastTokens(effectiveThemeTokens),
        'surface.page': effectiveThemeTokens['surface.page'] || styleFallback['surface.page'],
        'surface.paper': effectiveThemeTokens['surface.paper'] || styleFallback['surface.paper'],
        'surface.panel': effectiveThemeTokens['surface.panel'] || styleFallback['surface.panel'],
        'surface.elevated': effectiveThemeTokens['surface.elevated'] || styleFallback['surface.elevated'],
        'ink.primary': effectiveThemeTokens['ink.primary'] || styleFallback['ink.primary'],
        'ink.secondary': effectiveThemeTokens['ink.secondary'] || styleFallback['ink.secondary'],
        'ink.tertiary': effectiveThemeTokens['ink.tertiary'] || styleFallback['ink.tertiary'],
        'ink.placeholder': effectiveThemeTokens['ink.placeholder'] || styleFallback['ink.placeholder'],
        'line.hairline': effectiveThemeTokens['line.hairline'] || styleFallback['line.hairline'],
        'line.ruled': effectiveThemeTokens['line.ruled'] || styleFallback['line.ruled'],
        'border.soft': effectiveThemeTokens['border.soft'] || styleFallback['border.soft'],
        'border.strong': effectiveThemeTokens['border.strong'] || styleFallback['border.strong'],
        'shadow.soft': effectiveThemeTokens['shadow.soft'] || styleFallback['shadow.soft'],
        'focus.ring': effectiveThemeTokens['focus.ring'] || styleFallback['focus.ring'],
        'hover.surface': effectiveThemeTokens['hover.surface'] || styleFallback['hover.surface'],
        'press.surface': effectiveThemeTokens['press.surface'] || styleFallback['press.surface'],
        'radius.sheet': effectiveThemeTokens['radius.sheet'] || styleFallback['radius.sheet'],
        'space.framePadding': effectiveThemeTokens['space.framePadding'] || styleFallback['space.framePadding'],
        'space.sheetPadding': effectiveThemeTokens['space.sheetPadding'] || styleFallback['space.sheetPadding'],
        // Theme can override dialogue; if not present, keep style values
        'dialogue.userBg': effectiveThemeTokens['dialogue.userBg'] || styleFallback['dialogue.userBg'],
        'dialogue.agentBg': effectiveThemeTokens['dialogue.agentBg'] || styleFallback['dialogue.agentBg'],
        'dialogue.areaBg': effectiveThemeTokens['dialogue.areaBg'] || styleFallback['dialogue.areaBg'],
        'dialogue.border': effectiveThemeTokens['dialogue.border'] || styleFallback['dialogue.border'],
      } as StyleTokens
    }
    return styleFallback
  }, [effectiveThemeTokens, styleId, themeApply])

  // Get merged tokens (base + overrides) and convert to CSS vars
  const finalTokens = exportTokens(baseTokens)
  const styleVars = React.useMemo(() => {
    return tokensToCSSVars(finalTokens)
  }, [finalTokens])

  // Show loading state while fetching theme
  if (themeLoading) {
    return (
      <div className="v0-style-scope min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading theme...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={["v0-style-scope", className].filter(Boolean).join(" ")}
      style={styleVars}
    >
      {children}
    </div>
  )
}
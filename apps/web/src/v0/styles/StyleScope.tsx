import React from 'react'
import type { StyleId } from './styles'
import { getStyleDefinition, tokensToCSSVars } from './styleRegistry'
import type { StyleTokens } from './styleRegistry'
import { useStyleOverride } from './StyleOverrideProvider'
import { resolveThemeTokens } from '../themes/themeResolver'

interface StyleScopeProps {
  styleId: StyleId
  themeSlug?: string | null
  children: React.ReactNode
}

export function StyleScope({ styleId, themeSlug, children }: StyleScopeProps) {
  const { exportTokens, setCurrentStyle } = useStyleOverride()

  // Set the current style in the provider
  React.useEffect(() => {
    setCurrentStyle(styleId)
  }, [styleId, setCurrentStyle])

  // Resolve theme tokens if themeSlug is provided
  const [themeTokens, setThemeTokens] = React.useState<Record<string, string> | null>(null)
  const [themeLoading, setThemeLoading] = React.useState(false)

  React.useEffect(() => {
    if (themeSlug) {
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
    } else {
      setThemeTokens(null)
      setThemeLoading(false)
    }
  }, [themeSlug])

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

    if (themeTokens) {
      // Override style tokens with theme tokens; theme may omit dialogue, so keep style fallbacks
      return {
        ...styleFallback,
        'surface.page': themeTokens['surface.page'] || styleFallback['surface.page'],
        'surface.paper': themeTokens['surface.paper'] || styleFallback['surface.paper'],
        'surface.panel': themeTokens['surface.panel'] || styleFallback['surface.panel'],
        'surface.elevated': themeTokens['surface.elevated'] || styleFallback['surface.elevated'],
        'ink.primary': themeTokens['ink.primary'] || styleFallback['ink.primary'],
        'ink.secondary': themeTokens['ink.secondary'] || styleFallback['ink.secondary'],
        'ink.tertiary': themeTokens['ink.tertiary'] || styleFallback['ink.tertiary'],
        'ink.placeholder': themeTokens['ink.placeholder'] || styleFallback['ink.placeholder'],
        'line.hairline': themeTokens['line.hairline'] || styleFallback['line.hairline'],
        'line.ruled': themeTokens['line.ruled'] || styleFallback['line.ruled'],
        'border.soft': themeTokens['border.soft'] || styleFallback['border.soft'],
        'border.strong': themeTokens['border.strong'] || styleFallback['border.strong'],
        'shadow.soft': themeTokens['shadow.soft'] || styleFallback['shadow.soft'],
        'focus.ring': themeTokens['focus.ring'] || styleFallback['focus.ring'],
        'hover.surface': themeTokens['hover.surface'] || styleFallback['hover.surface'],
        'press.surface': themeTokens['press.surface'] || styleFallback['press.surface'],
        'radius.sheet': themeTokens['radius.sheet'] || styleFallback['radius.sheet'],
        'space.framePadding': themeTokens['space.framePadding'] || styleFallback['space.framePadding'],
        'space.sheetPadding': themeTokens['space.sheetPadding'] || styleFallback['space.sheetPadding'],
        // Theme can override dialogue; if not present, keep style values
        'dialogue.userBg': themeTokens['dialogue.userBg'] || styleFallback['dialogue.userBg'],
        'dialogue.agentBg': themeTokens['dialogue.agentBg'] || styleFallback['dialogue.agentBg'],
        'dialogue.areaBg': themeTokens['dialogue.areaBg'] || styleFallback['dialogue.areaBg'],
        'dialogue.border': themeTokens['dialogue.border'] || styleFallback['dialogue.border'],
      } as StyleTokens
    }
    return styleFallback
  }, [themeTokens, styleId])

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
      className="v0-style-scope"
      style={styleVars}
    >
      {children}
    </div>
  )
}
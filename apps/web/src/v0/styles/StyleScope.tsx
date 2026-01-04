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

  // Get base tokens - either from theme or style registry
  const baseTokens = React.useMemo(() => {
    if (themeTokens) {
      // Convert theme tokens to StyleTokens format
      return {
        'surface.page': themeTokens['surface.page'] || '#ffffff',
        'surface.paper': themeTokens['surface.paper'] || '#fefefe',
        'surface.panel': themeTokens['surface.panel'] || '#fcfcfc',
        'surface.elevated': themeTokens['surface.elevated'] || '#ffffff',
        'ink.primary': themeTokens['ink.primary'] || '#000000',
        'ink.secondary': themeTokens['ink.secondary'] || '#666666',
        'ink.tertiary': themeTokens['ink.tertiary'] || '#999999',
        'ink.placeholder': themeTokens['ink.placeholder'] || '#cccccc',
        'line.hairline': themeTokens['line.hairline'] || '#e5e5e5',
        'line.ruled': themeTokens['line.ruled'] || '#e5e5e5',
        'border.soft': themeTokens['border.soft'] || '#f0f0f0',
        'border.strong': themeTokens['border.strong'] || '#d0d0d0',
        'shadow.soft': themeTokens['shadow.soft'] || '0 1px 3px rgba(0,0,0,0.1)',
        'focus.ring': themeTokens['focus.ring'] || '#007acc',
        'hover.surface': themeTokens['hover.surface'] || '#f8f8f8',
        'press.surface': themeTokens['press.surface'] || '#f0f0f0',
        'radius.sheet': themeTokens['radius.sheet'] || '4px',
        'space.framePadding': themeTokens['space.framePadding'] || '7px',
        'space.sheetPadding': themeTokens['space.sheetPadding'] || '24px',
      } as StyleTokens
    } else {
      // Fall back to style registry
      const styleDefinition = getStyleDefinition(styleId)
      return styleDefinition?.tokens || {
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
      } as StyleTokens
    }
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
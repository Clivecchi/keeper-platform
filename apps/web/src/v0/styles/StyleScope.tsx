import React from 'react'
import type { StyleId } from './styles'
import { getStyleDefinition, tokensToCSSVars } from './styleRegistry'
import type { StyleTokens } from './styleRegistry'
import { useStyleOverride } from './StyleOverrideProvider'

interface StyleScopeProps {
  styleId: StyleId
  children: React.ReactNode
}

export function StyleScope({ styleId, children }: StyleScopeProps) {
  const { exportTokens, setCurrentStyle } = useStyleOverride()

  // Set the current style in the provider
  React.useEffect(() => {
    setCurrentStyle(styleId)
  }, [styleId, setCurrentStyle])

  // Get base tokens for this style
  const styleDefinition = getStyleDefinition(styleId)
  const baseTokens = styleDefinition?.tokens || {
    'surface.page': '#ffffff',
    'surface.paper': '#fefefe',
    'surface.panel': '#fcfcfc',
    'surface.elevated': '#ffffff',
    'ink.primary': '#000000',
    'ink.secondary': '#666666',
    'ink.tertiary': '#999999',
    'ink.placeholder': '#cccccc',
    'line.hairline': '#e5e5e5',
    'line.ruled': 'rgba(0,0,0,0.06)',
    'border.soft': 'rgba(0,0,0,0.15)',
    'border.strong': '#000000',
    'shadow.soft': '0 1px 3px rgba(0,0,0,0.1)',
    'focus.ring': '#007acc',
    'hover.surface': 'rgba(0,0,0,0.03)',
    'press.surface': 'rgba(0,0,0,0.06)',
    'radius.sheet': '4px',
    'space.framePadding': '7px',
    'space.sheetPadding': '24px',
  } as StyleTokens

  // Get merged tokens (base + overrides) and convert to CSS vars
  const finalTokens = exportTokens(baseTokens)
  const styleVars = React.useMemo(() => {
    return tokensToCSSVars(finalTokens)
  }, [finalTokens])

  return (
    <div
      className="v0-style-scope"
      style={styleVars}
    >
      {children}
    </div>
  )
}
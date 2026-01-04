import React, { createContext, useContext, useEffect, useState } from 'react'
import type { StyleTokens } from './styleRegistry'

// Helper function to create style-specific storage keys
function getStorageKey(styleId: string): string {
  return `v0.styleOverrides.${styleId}`
}

interface StyleOverrideContextValue {
  currentStyleId: string
  overrides: Partial<StyleTokens>
  setOverride: (token: keyof StyleTokens, value: string) => void
  clearOverrides: () => void
  setCurrentStyle: (styleId: string) => void
  exportTokens: (baseTokens: StyleTokens) => StyleTokens
  importTokens: (tokens: Partial<StyleTokens>) => void
}

const StyleOverrideContext = createContext<StyleOverrideContextValue | null>(null)

interface StyleOverrideProviderProps {
  children: React.ReactNode
  initialStyleId?: string
}

export function StyleOverrideProvider({ children, initialStyleId = 'neutral' }: StyleOverrideProviderProps) {
  const [currentStyleId, setCurrentStyleId] = useState<string>(initialStyleId)
  const [overrides, setOverrides] = useState<Partial<StyleTokens>>(() => {
    // Load from localStorage on mount for the initial style
    try {
      const stored = localStorage.getItem(getStorageKey(initialStyleId))
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  // Load overrides when style changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(currentStyleId))
      const styleOverrides = stored ? JSON.parse(stored) : {}
      setOverrides(styleOverrides)
    } catch {
      setOverrides({})
    }
  }, [currentStyleId])

  // Save overrides to localStorage for current style (no longer apply globally)
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(currentStyleId), JSON.stringify(overrides))
    } catch {
      // Ignore localStorage errors
    }
  }, [overrides, currentStyleId])

  const setOverride = (token: keyof StyleTokens, value: string) => {
    setOverrides(prev => ({ ...prev, [token]: value }))
  }

  const clearOverrides = () => {
    setOverrides({})
  }

  const setCurrentStyle = (styleId: string) => {
    setCurrentStyleId(styleId)
  }

  const exportTokens = (baseTokens: StyleTokens): StyleTokens => {
    return { ...baseTokens, ...overrides }
  }

  const importTokens = (tokens: Partial<StyleTokens>) => {
    setOverrides(tokens)
  }

  const value: StyleOverrideContextValue = {
    currentStyleId,
    overrides,
    setOverride,
    clearOverrides,
    setCurrentStyle,
    exportTokens,
    importTokens,
  }

  return (
    <StyleOverrideContext.Provider value={value}>
      {children}
    </StyleOverrideContext.Provider>
  )
}

export function useStyleOverride() {
  const context = useContext(StyleOverrideContext)
  if (!context) {
    throw new Error('useStyleOverride must be used within a StyleOverrideProvider')
  }
  return context
}

// Helper to convert token keys to CSS variable names using platform --theme-* variables
export function tokenToCSSVar(token: keyof StyleTokens): string {
  const mapping: Record<keyof StyleTokens, string> = {
    'surface.page': '--theme-surface-page',
    'surface.paper': '--theme-surface-paper',
    'surface.panel': '--theme-surface-panel',
    'surface.elevated': '--theme-surface-elevated',
    'ink.primary': '--theme-ink-primary',
    'ink.secondary': '--theme-ink-secondary',
    'ink.tertiary': '--theme-ink-tertiary',
    'ink.placeholder': '--theme-ink-placeholder',
    'line.hairline': '--theme-line-hairline',
    'line.ruled': '--theme-line-ruled',
    'border.soft': '--theme-border-soft',
    'border.strong': '--theme-border-strong',
    'shadow.soft': '--theme-shadow-soft',
    'focus.ring': '--theme-focus-ring',
    'hover.surface': '--theme-hover-surface',
    'press.surface': '--theme-press-surface',
    'radius.sheet': '--theme-radius-sheet',
    'space.framePadding': '--theme-space-framePadding',
    'space.sheetPadding': '--theme-space-sheetPadding',
  }
  return mapping[token] || `--theme-${token.replace(/\./g, '-')}`
}
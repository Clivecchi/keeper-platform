// Lens/Style/Tone Model - Style Registry for Editor
// Lens = selection/meaning layer (future - not implemented)
// Style = appearance layer (current - how things look)
// Tone = attribute of Style (current - mood/atmosphere)

export type ToneId = 'neutral' | 'diary'

export interface StyleTokens {
  // Surface colors
  'surface.page': string
  'surface.paper': string
  'surface.panel': string
  'surface.elevated': string

  // Ink colors
  'ink.primary': string
  'ink.secondary': string
  'ink.tertiary': string
  'ink.placeholder': string

  // Line colors
  'line.hairline': string
  'line.ruled': string

  // Border colors
  'border.soft': string
  'border.strong': string

  // Shadow
  'shadow.soft': string

  // Interactive colors
  'focus.ring': string
  'hover.surface': string
  'press.surface': string

  // Border radius
  'radius.sheet': string

  // Spacing
  'space.framePadding': string
  'space.sheetPadding': string
}

export interface StyleDefinition {
  id: StyleId
  name: string
  tone: ToneId
  tokens: StyleTokens
}

export type StyleId = 'neutral' | 'diary-paper'

export const styleRegistry: StyleDefinition[] = [
  {
    id: 'neutral',
    name: 'Neutral',
    tone: 'neutral',
    tokens: {
      // Surface colors - neutral grays
      'surface.page': 'hsl(0, 0%, 100%)',
      'surface.paper': 'hsl(0, 0%, 98%)',
      'surface.panel': 'hsl(0, 0%, 96%)',
      'surface.elevated': 'hsl(0, 0%, 100%)',

      // Ink colors - neutral grays
      'ink.primary': 'hsl(0, 0%, 9%)',
      'ink.secondary': 'hsl(0, 0%, 45%)',
      'ink.tertiary': 'hsl(0, 0%, 60%)',
      'ink.placeholder': 'hsl(0, 0%, 65%)',

      // Line colors
      'line.hairline': 'hsl(0, 0%, 85%)',
      'line.ruled': 'hsl(0, 0%, 85%)',

      // Border colors
      'border.soft': 'hsl(0, 0%, 90%)',
      'border.strong': 'hsl(0, 0%, 80%)',

      // Shadow
      'shadow.soft': '0 1px 3px hsl(0, 0%, 0%, 0.1), 0 1px 2px hsl(0, 0%, 0%, 0.06)',

      // Interactive colors
      'focus.ring': 'hsl(221, 83%, 53%)',
      'hover.surface': 'hsl(0, 0%, 94%)',
      'press.surface': 'hsl(0, 0%, 92%)',

      // Border radius
      'radius.sheet': '6px',

      // Spacing
      'space.framePadding': '1.5rem',
      'space.sheetPadding': '1rem',
    },
  },
  {
    id: 'diary-paper',
    name: 'Diary Paper',
    tone: 'diary',
    tokens: {
      // Surface colors - warm paper tones
      'surface.page': 'hsl(35, 25%, 97%)',
      'surface.paper': 'hsl(35, 15%, 96%)',
      'surface.panel': 'hsl(35, 20%, 94%)',
      'surface.elevated': 'hsl(35, 15%, 98%)',

      // Ink colors - brown/charcoal
      'ink.primary': 'hsl(25, 30%, 25%)',
      'ink.secondary': 'hsl(25, 20%, 45%)',
      'ink.tertiary': 'hsl(25, 15%, 60%)',
      'ink.placeholder': 'hsl(25, 10%, 70%)',

      // Line colors
      'line.hairline': 'hsl(25, 8%, 75%)',
      'line.ruled': 'hsl(25, 8%, 75%)',

      // Border colors
      'border.soft': 'hsl(35, 10%, 85%)',
      'border.strong': 'hsl(35, 15%, 80%)',

      // Shadow
      'shadow.soft': '0 1px 3px hsl(35, 10%, 85%, 0.3), 0 1px 2px hsl(35, 10%, 85%, 0.2)',

      // Interactive colors
      'focus.ring': 'hsl(25, 40%, 50%)',
      'hover.surface': 'hsl(35, 15%, 92%)',
      'press.surface': 'hsl(35, 20%, 88%)',

      // Border radius
      'radius.sheet': '6px',

      // Spacing
      'space.framePadding': '1.5rem',
      'space.sheetPadding': '1rem',
    },
  },
]

export function getStyleDefinition(styleId: StyleId): StyleDefinition | undefined {
  return styleRegistry.find(style => style.id === styleId)
}

export function listStyles(): StyleDefinition[] {
  return [...styleRegistry]
}

// Convert tokens to CSS custom properties using platform --theme-* variables
export function tokensToCSSVars(tokens: StyleTokens): Record<string, string> {
  return {
    '--theme-surface-page': tokens['surface.page'],
    '--theme-surface-paper': tokens['surface.paper'],
    '--theme-surface-panel': tokens['surface.panel'],
    '--theme-surface-elevated': tokens['surface.elevated'],
    '--theme-ink-primary': tokens['ink.primary'],
    '--theme-ink-secondary': tokens['ink.secondary'],
    '--theme-ink-tertiary': tokens['ink.tertiary'],
    '--theme-ink-placeholder': tokens['ink.placeholder'],
    '--theme-line-hairline': tokens['line.hairline'],
    '--theme-line-ruled': tokens['line.ruled'],
    '--theme-border-soft': tokens['border.soft'],
    '--theme-border-strong': tokens['border.strong'],
    '--theme-shadow-soft': tokens['shadow.soft'],
    '--theme-focus-ring': tokens['focus.ring'],
    '--theme-hover-surface': tokens['hover.surface'],
    '--theme-press-surface': tokens['press.surface'],
    '--theme-radius-sheet': tokens['radius.sheet'],
    '--theme-space-framePadding': tokens['space.framePadding'],
    '--theme-space-sheetPadding': tokens['space.sheetPadding'],
  }
}
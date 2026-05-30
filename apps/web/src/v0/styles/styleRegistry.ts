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

  // Dialogue (agent conversation)
  'dialogue.userBg': string
  'dialogue.agentBg': string
  'dialogue.areaBg': string
  'dialogue.border': string

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
    name: 'Dusk Glass',
    tone: 'neutral',
    tokens: {
      // Surfaces — deep indigo-violet glass (panel CSS applies alpha for frosted depth)
      'surface.page': 'hsl(248, 38%, 10%)',
      'surface.paper': 'hsl(248, 32%, 16%)',
      'surface.panel': 'hsl(248, 28%, 22%)',
      'surface.elevated': 'hsl(248, 26%, 28%)',

      // Ink — warm evening light, readable on dark glass
      'ink.primary': 'hsl(36, 28%, 91%)',
      'ink.secondary': 'hsl(34, 20%, 78%)',
      'ink.tertiary': 'hsl(248, 14%, 62%)',
      'ink.placeholder': 'hsl(248, 10%, 48%)',

      // Line colors — glass edges, barely there
      'line.hairline': 'hsl(248, 14%, 32%)',
      'line.ruled': 'hsl(248, 14%, 32%)',

      // Border colors — soft rim light, not drawn lines
      'border.soft': 'hsl(248, 18%, 34%)',
      'border.strong': 'hsl(248, 16%, 42%)',

      // Shadow — depth behind floating panels
      'shadow.soft': '0 8px 32px hsl(248, 45%, 6%, 0.45), 0 2px 12px hsl(248, 30%, 4%, 0.35)',

      // Interactive — last light of day (warm amber accent)
      'focus.ring': 'hsl(32, 72%, 62%)',
      'hover.surface': 'hsl(248, 26%, 26%)',
      'press.surface': 'hsl(248, 28%, 20%)',

      // Dialogue — dusk-native bubbles (warm user / cool agent glass)
      'dialogue.userBg': 'hsl(22, 52%, 52%)',
      'dialogue.agentBg': 'hsl(248, 24%, 26%)',
      'dialogue.areaBg': 'hsl(248, 30%, 18%)',
      'dialogue.border': 'hsl(248, 16%, 36%)',

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

      // Ink colors - brown/charcoal (stronger contrast for board readability)
      'ink.primary': 'hsl(25, 30%, 22%)',
      'ink.secondary': 'hsl(25, 18%, 32%)',
      'ink.tertiary': 'hsl(25, 12%, 42%)',
      'ink.placeholder': 'hsl(25, 8%, 50%)',

      // Line colors
      'line.hairline': 'hsl(25, 8%, 68%)',
      'line.ruled': 'hsl(25, 8%, 68%)',

      // Border colors
      'border.soft': 'hsl(35, 10%, 72%)',
      'border.strong': 'hsl(35, 15%, 62%)',

      // Shadow
      'shadow.soft': '0 1px 3px hsl(35, 10%, 85%, 0.3), 0 1px 2px hsl(35, 10%, 85%, 0.2)',

      // Interactive colors
      'focus.ring': 'hsl(25, 40%, 50%)',
      'hover.surface': 'hsl(35, 15%, 92%)',
      'press.surface': 'hsl(35, 20%, 88%)',

      // Dialogue
      'dialogue.userBg': 'hsl(14, 60%, 56%)',
      'dialogue.agentBg': 'hsl(35, 15%, 99%)',
      'dialogue.areaBg': 'hsl(35, 25%, 96%)',
      'dialogue.border': 'hsl(35, 12%, 85%)',

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

/**
 * Normalize color tokens to HSL components (e.g. "0 0% 100%").
 * Components use hsl(var(--theme-*) / 0.5) for alpha; that requires
 * the variable to hold HSL components, not full hsl() strings.
 */
function toHSLComponents(value: string): string {
  const hslMatch = value.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:\/\s*[\d.]+)?\s*\)/)
  if (hslMatch) {
    return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`
  }
  // Already in "H S% L%" format
  if (/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%(\s+\/\s+[\d.]+)?$/.test(value.trim())) {
    return value.trim()
  }
  // Hex fallback (e.g. #ffffff, #000000 from StyleScope defaults)
  const hexMatch = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (hexMatch) {
    const hex = hexMatch[1]
    const r = hex.length === 3
      ? parseInt(hex[0] + hex[0], 16) / 255
      : parseInt(hex.slice(0, 2), 16) / 255
    const g = hex.length === 3
      ? parseInt(hex[1] + hex[1], 16) / 255
      : parseInt(hex.slice(2, 4), 16) / 255
    const b = hex.length === 3
      ? parseInt(hex[2] + hex[2], 16) / 255
      : parseInt(hex.slice(4, 6), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      h = max === r ? (g - b) / d + (g < b ? 6 : 0)
        : max === g ? (b - r) / d + 2
        : (r - g) / d + 4
      h /= 6
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }
  return value
}

// Convert tokens to CSS custom properties using platform --theme-* variables
export function tokensToCSSVars(tokens: StyleTokens): Record<string, string> {
  const colorKeys = [
    'surface.page', 'surface.paper', 'surface.panel', 'surface.elevated',
    'ink.primary', 'ink.secondary', 'ink.tertiary', 'ink.placeholder',
    'line.hairline', 'line.ruled', 'border.soft', 'border.strong',
    'focus.ring', 'hover.surface', 'press.surface',
    'dialogue.userBg', 'dialogue.agentBg', 'dialogue.areaBg', 'dialogue.border',
  ] as const
  const toVar = (key: keyof StyleTokens, raw: string) =>
    colorKeys.includes(key as typeof colorKeys[number]) ? toHSLComponents(raw) : raw

  // Ink variables hold HSL components for alpha usage (hsl(var(--theme-ink-primary) / 0.5)).
  // For direct color use, components must use hsl(var(--theme-ink-primary)) - raw var() is invalid.
  // We also emit -color suffixed vars for convenience: full color values for color/background properties.
  const inkPrimary = toVar('ink.primary', tokens['ink.primary'])
  const inkSecondary = toVar('ink.secondary', tokens['ink.secondary'])
  const inkTertiary = toVar('ink.tertiary', tokens['ink.tertiary'])
  const inkPlaceholder = toVar('ink.placeholder', tokens['ink.placeholder'])

  return {
    '--theme-surface-page': toVar('surface.page', tokens['surface.page']),
    '--theme-surface-paper': toVar('surface.paper', tokens['surface.paper']),
    '--theme-surface-panel': toVar('surface.panel', tokens['surface.panel']),
    '--theme-surface-elevated': toVar('surface.elevated', tokens['surface.elevated']),
    '--theme-ink-primary': inkPrimary,
    '--theme-ink-secondary': inkSecondary,
    '--theme-ink-tertiary': inkTertiary,
    '--theme-ink-placeholder': inkPlaceholder,
    '--theme-ink-primary-color': `hsl(${inkPrimary})`,
    '--theme-ink-secondary-color': `hsl(${inkSecondary})`,
    '--theme-ink-tertiary-color': `hsl(${inkTertiary})`,
    '--theme-ink-placeholder-color': `hsl(${inkPlaceholder})`,
    '--theme-line-hairline': toVar('line.hairline', tokens['line.hairline']),
    '--theme-line-ruled': toVar('line.ruled', tokens['line.ruled']),
    '--theme-border-soft': toVar('border.soft', tokens['border.soft']),
    '--theme-border-strong': toVar('border.strong', tokens['border.strong']),
    '--theme-shadow-soft': tokens['shadow.soft'],
    '--theme-focus-ring': toVar('focus.ring', tokens['focus.ring']),
    '--theme-hover-surface': toVar('hover.surface', tokens['hover.surface']),
    '--theme-press-surface': toVar('press.surface', tokens['press.surface']),
    '--theme-dialogue-user-bg': toVar('dialogue.userBg', tokens['dialogue.userBg']),
    '--theme-dialogue-agent-bg': toVar('dialogue.agentBg', tokens['dialogue.agentBg']),
    '--theme-dialogue-area-bg': toVar('dialogue.areaBg', tokens['dialogue.areaBg']),
    '--theme-dialogue-border': toVar('dialogue.border', tokens['dialogue.border']),
    '--theme-radius-sheet': tokens['radius.sheet'],
    '--theme-space-framePadding': tokens['space.framePadding'],
    '--theme-space-sheetPadding': tokens['space.sheetPadding'],

    /* Accent — referenced by presence, Chronicle feed dot, nav selection */
    '--theme-accent-primary': inkPrimary,
    '--theme-accent-subtle': toVar('surface.panel', tokens['surface.panel']),
    '--theme-accent-fg': inkPrimary,

    /* Status — readable on dark glass surfaces */
    '--theme-status-success': '152 55% 52%',
    '--theme-status-warning': '38 88% 58%',
    '--theme-status-error': '0 72% 58%',

    /* Short-name aliases (legacy CSS + components) */
    '--theme-surface': toVar('surface.panel', tokens['surface.panel']),
    '--theme-border': toVar('border.soft', tokens['border.soft']),
    '--theme-ink': inkPrimary,
    '--theme-ink-faint': inkTertiary,
  }
}
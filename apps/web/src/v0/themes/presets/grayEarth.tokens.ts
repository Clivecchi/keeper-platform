import type { StyleTokens } from '../../styles/styleRegistry'

/** Canonical gray earth tone — platform default for unbranded domains. */
export const GRAY_EARTH_PALETTE = {
  primary: '#3d3830',
  secondary: '#7a7268',
  accent: '#6b7355',
  background: '#f5f3ef',
  surface: '#edeae4',
  text: '#3d3830',
  muted: '#8a847a',
} as const

export const GRAY_EARTH_STYLE_TOKENS: StyleTokens = {
  'surface.page': 'hsl(40, 10%, 96%)',
  'surface.paper': 'hsl(38, 12%, 94%)',
  'surface.panel': 'hsl(36, 14%, 92%)',
  'surface.elevated': 'hsl(40, 8%, 98%)',
  'ink.primary': 'hsl(30, 8%, 22%)',
  'ink.secondary': 'hsl(30, 6%, 38%)',
  'ink.tertiary': 'hsl(28, 5%, 52%)',
  'ink.placeholder': 'hsl(28, 4%, 62%)',
  'line.hairline': 'hsl(35, 8%, 78%)',
  'line.ruled': 'hsl(35, 8%, 78%)',
  'border.soft': 'hsl(36, 10%, 84%)',
  'border.strong': 'hsl(34, 12%, 74%)',
  'shadow.soft': '0 1px 3px hsl(30, 10%, 20%, 0.08), 0 1px 2px hsl(30, 10%, 20%, 0.05)',
  'focus.ring': 'hsl(75, 18%, 42%)',
  'hover.surface': 'hsl(38, 12%, 90%)',
  'press.surface': 'hsl(36, 14%, 86%)',
  'dialogue.userBg': 'hsl(75, 22%, 38%)',
  'dialogue.agentBg': 'hsl(38, 12%, 96%)',
  'dialogue.areaBg': 'hsl(40, 10%, 94%)',
  'dialogue.border': 'hsl(36, 10%, 82%)',
  'radius.sheet': '6px',
  'space.framePadding': '1.5rem',
  'space.sheetPadding': '1rem',
}

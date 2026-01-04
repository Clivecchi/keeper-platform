// Lens/Style/Tone Model
// Lens = selection/meaning layer (future - not implemented)
// Style = appearance layer (current - how things look)
// Tone = attribute of Style (current - mood/atmosphere)

export type ToneId = 'neutral' | 'diary'

export interface Style {
  id: StyleId
  name: string
  tone: ToneId
  vars: Record<string, string>
}

export type StyleId = 'neutral' | 'diary-paper'

export const styles: Style[] = [
  {
    id: 'neutral',
    name: 'Neutral',
    tone: 'neutral',
    vars: {
      // Neutral theme (current defaults)
      '--v0-surface-page': 'hsl(var(--theme-surface-page, 0 0% 100%))',
      '--v0-surface-paper': 'hsl(var(--theme-surface-paper, 0 0% 98%))',
      '--v0-border-soft': 'hsl(var(--theme-border-soft, 0 0% 90%))',
      '--v0-ink-primary': 'hsl(var(--theme-ink-primary, 0 0% 9%))',
      '--v0-ink-secondary': 'hsl(var(--theme-ink-secondary, 0 0% 45%))',
      '--v0-ink-tertiary': 'hsl(var(--theme-ink-tertiary, 0 0% 60%))',
      '--v0-ink-placeholder': 'hsl(var(--theme-ink-placeholder, 0 0% 65%))',
      '--v0-line-ruled': 'hsl(var(--theme-line-ruled, 0 0% 85%))',
      '--v0-shadow-soft': 'var(--theme-shadow-soft, 0 1px 3px hsl(0 0% 0% / 0.1), 0 1px 2px hsl(0 0% 0% / 0.06))',
      '--v0-line-hairline': 'hsl(var(--theme-line-hairline, 0 0% 85%))',
    },
  },
  {
    id: 'diary-paper',
    name: 'Diary Paper',
    tone: 'diary',
    vars: {
      // Warm paper background
      '--v0-surface-page': 'hsl(35, 25%, 97%)',
      '--v0-surface-paper': 'hsl(35, 15%, 96%)',
      '--v0-border-soft': 'hsl(35, 10%, 85%)',
      // Brown/charcoal ink
      '--v0-ink-primary': 'hsl(25, 30%, 25%)',
      '--v0-ink-secondary': 'hsl(25, 20%, 45%)',
      '--v0-ink-tertiary': 'hsl(25, 15%, 60%)',
      '--v0-ink-placeholder': 'hsl(25, 10%, 70%)',
      // Ruled line color for diary paper
      '--v0-line-ruled': 'hsl(25, 8%, 75%)',
      // Soft shadow
      '--v0-shadow-soft': '0 1px 3px hsl(35, 10%, 85% / 0.3), 0 1px 2px hsl(35, 10%, 85% / 0.2)',
      // Hairline color for dividers
      '--v0-line-hairline': 'hsl(25, 8%, 75%)',
    },
  },
]

export function getStyleVars(styleId: StyleId): Record<string, string> {
  const style = styles.find(s => s.id === styleId)
  return style?.vars || styles[0].vars // fallback to neutral
}

export function getStyle(styleId: StyleId): Style | undefined {
  return styles.find(s => s.id === styleId)
}
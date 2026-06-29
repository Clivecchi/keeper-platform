/**
 * Static Theme Registry for V0 Development
 *
 * Provides theme tokens without requiring API server.
 * Matches exactly the seeded database themes.
 */

import { GRAY_EARTH_STYLE_TOKENS } from './presets/grayEarth.tokens'

export interface ThemeTokens {
  [key: string]: string;
}

export interface ThemeData {
  id: string;
  slug: string;
  label: string;
  tokens: ThemeTokens;
}

/**
 * Static theme registry - bundled with apps/web for dev independence
 */
const staticThemeRegistry: Record<string, ThemeData> = {
  'gray-earth': {
    id: 'gray-earth-id',
    slug: 'gray-earth',
    label: 'Gray Earth',
    tokens: { ...GRAY_EARTH_STYLE_TOKENS },
  },
  'diary-paper': {
    id: 'diary-paper-id',
    slug: 'diary-paper',
    label: 'Diary Paper',
    tokens: {
      "surface.page": "hsl(35, 25%, 97%)",
      "surface.paper": "hsl(35, 15%, 96%)",
      "surface.panel": "hsl(35, 20%, 94%)",
      "surface.elevated": "hsl(35, 15%, 98%)",
      "ink.primary": "hsl(25, 30%, 22%)",
      "ink.secondary": "hsl(25, 18%, 32%)",
      "ink.tertiary": "hsl(25, 12%, 42%)",
      "ink.placeholder": "hsl(25, 8%, 50%)",
      "line.hairline": "hsl(25, 8%, 68%)",
      "line.ruled": "hsl(25, 8%, 68%)",
      "border.soft": "hsl(35, 10%, 72%)",
      "border.strong": "hsl(35, 15%, 62%)",
      "shadow.soft": "0 1px 3px hsl(35, 10%, 85%, 0.3), 0 1px 2px hsl(35, 10%, 85%, 0.2)",
      "focus.ring": "hsl(25, 40%, 50%)",
      "hover.surface": "hsl(35, 15%, 92%)",
      "press.surface": "hsl(35, 20%, 88%)",
      "dialogue.userBg": "hsl(14, 60%, 56%)",
      "dialogue.agentBg": "hsl(35, 15%, 99%)",
      "dialogue.areaBg": "hsl(35, 25%, 96%)",
      "dialogue.border": "hsl(35, 12%, 85%)",
      "radius.sheet": "6px",
      "space.framePadding": "1.5rem",
      "space.sheetPadding": "1rem"
    }
  },
  'neutral': {
    id: 'neutral-id',
    slug: 'neutral',
    label: 'Neutral',
    tokens: {
      "surface.page": "hsl(0, 0%, 100%)",
      "surface.paper": "hsl(0, 0%, 98%)",
      "surface.panel": "hsl(0, 0%, 96%)",
      "surface.elevated": "hsl(0, 0%, 100%)",
      "ink.primary": "hsl(0, 0%, 9%)",
      "ink.secondary": "hsl(0, 0%, 32%)",
      "ink.tertiary": "hsl(0, 0%, 42%)",
      "ink.placeholder": "hsl(0, 0%, 50%)",
      "line.hairline": "hsl(0, 0%, 72%)",
      "line.ruled": "hsl(0, 0%, 72%)",
      "border.soft": "hsl(0, 0%, 78%)",
      "border.strong": "hsl(0, 0%, 68%)",
      "shadow.soft": "0 1px 3px hsl(0, 0%, 0%, 0.1), 0 1px 2px hsl(0, 0%, 0%, 0.06)",
      "focus.ring": "hsl(221, 83%, 53%)",
      "hover.surface": "hsl(0, 0%, 94%)",
      "press.surface": "hsl(0, 0%, 92%)",
      "dialogue.userBg": "hsl(14, 60%, 56%)",
      "dialogue.agentBg": "hsl(0, 0%, 100%)",
      "dialogue.areaBg": "hsl(35, 33%, 97%)",
      "dialogue.border": "hsl(35, 20%, 88%)",
      "radius.sheet": "6px",
      "space.framePadding": "1.5rem",
      "space.sheetPadding": "1rem"
    }
  }
};

/**
 * Get theme tokens by slug from static registry
 */
export function getThemeTokensBySlug(slug: string): ThemeTokens | null {
  const theme = staticThemeRegistry[slug];
  return theme ? theme.tokens : null;
}

/**
 * Get full theme data by slug from static registry
 */
export function getThemeBySlug(slug: string): ThemeData | null {
  return staticThemeRegistry[slug] || null;
}

/**
 * List all available themes in static registry
 */
export function listAvailableThemes(): ThemeData[] {
  return Object.values(staticThemeRegistry);
}

/**
 * Check if a theme slug exists in static registry
 */
export function hasTheme(slug: string): boolean {
  return slug in staticThemeRegistry;
}
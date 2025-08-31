import { apiFetch } from '@/lib/api';

/**
 * Represents the structure of color tokens for a single mode (light or dark).
 */
export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

/**
 * Represents a full theme, containing both light and dark mode palettes.
 */
export interface Theme {
  id: string;
  slug: string;
  name: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}

interface FetchedTheme {
  data: Theme;
}

const hexToHslString = (hex: string): string => {
  if (!hex) return '0 0% 0%';
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${(h * 360).toFixed(0)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
};

/**
 * Fetches a theme by its ID from the API. Can be authenticated or public.
 * @param themeId The UUID of the theme to fetch.
 * @param token The JWT for authenticating the request (optional).
 * @returns A Promise that resolves with the Theme object or null if an error occurs.
 */
export const fetchThemeById = async (themeId: string, token?: string): Promise<Theme | null> => {
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const data: FetchedTheme = await apiFetch(`/api/themes/${themeId}`, { headers });

    if (!data || !data.data) {
      console.error(`API response for theme ${themeId} is missing the 'data' field.`);
      return null;
    }

    // Convert the HEX colors from the API into the HSL strings required by the theme engine.
    const raw = data.data as Partial<Theme>;

    // Build a safe theme object with defaults if parts are missing
    const emptyTokens: ThemeTokens = {
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      popover: '#ffffff',
      popoverForeground: '#0f172a',
      primary: '#334155',
      primaryForeground: '#ffffff',
      secondary: '#e2e8f0',
      secondaryForeground: '#0f172a',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#0f172a',
      accentForeground: '#ffffff',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#94a3b8',
    };

    const theme: Theme = {
      id: raw.id || themeId,
      slug: raw.slug || 'default',
      name: raw.name || 'Default',
      light: (raw.light as ThemeTokens) || emptyTokens,
      dark: (raw.dark as ThemeTokens) || emptyTokens,
    };

    // Convert all hex values in both light and dark modes to HSL strings safely
    (Object.keys(theme.light || {}) as Array<keyof ThemeTokens>).forEach(key => {
      const value = theme.light[key] as unknown as string;
      theme.light[key] = hexToHslString(value);
    });
    (Object.keys(theme.dark || {}) as Array<keyof ThemeTokens>).forEach(key => {
      const value = theme.dark[key] as unknown as string;
      theme.dark[key] = hexToHslString(value);
    });

    return theme;
  } catch (error) {
    console.error('An error occurred while fetching the theme:', error);
    return null;
  }
}; 
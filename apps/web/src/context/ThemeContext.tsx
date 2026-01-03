import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Theme, ThemeTokens, fetchThemeById } from '../lib/themeApi';
import { apiFetch } from '@/lib/api';

// Hardcoded fallback theme to guarantee UI rendering if the API fails.
const KEEPER_CLASSIC_FALLBACK: Theme = {
  id: 'caa32a04-cd5a-4538-8572-f5ff5add85d0',
  slug: 'keeper-classic',
  name: 'Keeper Classic',
  light: {
    background: '0 0% 94.1%', foreground: '25 95% 21%', card: '0 0% 98%', cardForeground: '28 66% 21%', popover: '27 100% 96%', popoverForeground: '39 100% 15%', primary: '13 83% 21%', primaryForeground: '0 0% 100%', secondary: '35 48% 87%', secondaryForeground: '15 72% 38%', muted: '37 24% 80%', mutedForeground: '13 100% 18%', accent: '35 63% 69%', accentForeground: '25 80% 25%', destructive: '15 72% 38%', destructiveForeground: '33 97% 83%', border: '16 11% 43%', input: '210 17% 98%', ring: '33 97% 83%',
  },
  dark: {
    background: '0 0% 0%', foreground: '0 0% 100%', card: '0 0% 6.7%', cardForeground: '0 0% 93.3%', popover: '0 0% 13.3%', popoverForeground: '0 0% 93.3%', primary: '0 0% 80%', primaryForeground: '0 0% 0%', secondary: '0 0% 86.7%', secondaryForeground: '15 72% 38%', muted: '0 0% 93.3%', mutedForeground: '0 0% 0%', accent: '40 8% 79%', accentForeground: '0 0% 0%', destructive: '0 100% 50%', destructiveForeground: '0 0% 100%', border: '0 0% 75.3%', input: '0 0% 95.3%', ring: '40 8% 79%',
  }
};

type ThemeMode = 'light' | 'dark';

type CanonicalTokenKey =
  | 'surface-page'
  | 'surface-paper'
  | 'surface-panel'
  | 'surface-elevated'
  | 'ink-primary'
  | 'ink-secondary'
  | 'ink-tertiary'
  | 'ink-placeholder'
  | 'line-hairline'
  | 'line-ruled'
  | 'border-soft'
  | 'border-strong'
  | 'shadow-soft'
  | 'focus-ring'
  | 'hover-surface'
  | 'press-surface'
  | 'radius-sheet'
  | 'space-framePadding'
  | 'space-sheetPadding';

type CanonicalTokens = Record<CanonicalTokenKey, string>;

interface ThemeContextType {
  theme: Theme | null;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const CANONICAL_DEFAULTS: CanonicalTokens = {
  'surface-page': '0 0% 100%',
  'surface-paper': '0 0% 100% / 0.94',
  'surface-panel': '0 0% 98%',
  'surface-elevated': '0 0% 100%',
  'ink-primary': '25 10% 18%',
  'ink-secondary': '25 8% 35%',
  'ink-tertiary': '25 6% 45%',
  'ink-placeholder': '0 0% 50%',
  'line-hairline': '25 10% 30%',
  'line-ruled': '0 0% 50% / 0.06',
  'border-soft': '0 0% 70% / 0.45',
  'border-strong': '25 20% 30%',
  'shadow-soft': '0 10px 28px rgba(0,0,0,0.05)',
  'focus-ring': '33 97% 83%',
  'hover-surface': '0 0% 0% / 0.03',
  'press-surface': '0 0% 0% / 0.06',
  'radius-sheet': '4px',
  'space-framePadding': '7px',
  'space-sheetPadding': '24px',
};

function toCanonical(tokens: ThemeTokens | null | undefined): CanonicalTokens {
  const t = tokens || ({} as ThemeTokens);
  return {
    'surface-page': t.background || CANONICAL_DEFAULTS['surface-page'],
    'surface-paper': t.card || t.background || CANONICAL_DEFAULTS['surface-paper'],
    'surface-panel': t.popover || t.card || CANONICAL_DEFAULTS['surface-panel'],
    'surface-elevated': t.popover || t.card || CANONICAL_DEFAULTS['surface-elevated'],
    'ink-primary': t.foreground || CANONICAL_DEFAULTS['ink-primary'],
    'ink-secondary': t.secondaryForeground || t.mutedForeground || CANONICAL_DEFAULTS['ink-secondary'],
    'ink-tertiary': t.mutedForeground || t.secondaryForeground || CANONICAL_DEFAULTS['ink-tertiary'],
    'ink-placeholder': t.mutedForeground || CANONICAL_DEFAULTS['ink-placeholder'],
    'line-hairline': t.border || CANONICAL_DEFAULTS['line-hairline'],
    'line-ruled': t.muted || CANONICAL_DEFAULTS['line-ruled'],
    'border-soft': t.border || CANONICAL_DEFAULTS['border-soft'],
    'border-strong': t.primary || t.foreground || CANONICAL_DEFAULTS['border-strong'],
    'shadow-soft': CANONICAL_DEFAULTS['shadow-soft'],
    'focus-ring': t.ring || t.accent || CANONICAL_DEFAULTS['focus-ring'],
    'hover-surface': CANONICAL_DEFAULTS['hover-surface'],
    'press-surface': CANONICAL_DEFAULTS['press-surface'],
    'radius-sheet': CANONICAL_DEFAULTS['radius-sheet'],
    'space-framePadding': CANONICAL_DEFAULTS['space-framePadding'],
    'space-sheetPadding': CANONICAL_DEFAULTS['space-sheetPadding'],
  };
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const hasUsableBearer = Boolean(token && token !== 'cookie-based');
  const [theme, setTheme] = useState<Theme | null>(KEEPER_CLASSIC_FALLBACK); // Initialize with fallback
  const [mode, setMode] = useState<ThemeMode>('light');

  // 1. Detect user's system preference for color scheme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setMode(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => setMode(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 2. Fetch the user's preferred theme from the (mock) API
  useEffect(() => {
    const KEEPER_CLASSIC_ID = 'caa32a04-cd5a-4538-8572-f5ff5add85d0';

    const loadUserSettings = async () => {
      let themeIdToLoad = KEEPER_CLASSIC_ID;
      
      if (isAuthenticated && hasUsableBearer) {
        try {
          const settings = await apiFetch('/api/kam/settings', {
            headers: { Authorization: `Bearer ${token}` },
          });
          themeIdToLoad = settings.data?.preferred_theme_id || KEEPER_CLASSIC_ID;
        } catch (error) {
          console.error('Failed to fetch user settings, will use default theme.', error);
        }
        
        try {
          const fetchedTheme = await fetchThemeById(themeIdToLoad, token);
          setTheme(fetchedTheme || KEEPER_CLASSIC_FALLBACK);
        } catch (error) {
          console.error('An error occurred while fetching the theme:', error);
          setTheme(KEEPER_CLASSIC_FALLBACK);
        }

      } else {
        // For public visitors or cookie-auth flows (no bearer token), stick with the baked-in fallback.
        setTheme(KEEPER_CLASSIC_FALLBACK);
      }
    };
    
    loadUserSettings();
  }, [isAuthenticated, token, hasUsableBearer]);

  // 3. Apply the current theme and mode to the document
  useEffect(() => {
    const root = document.documentElement;
    if (!theme) return;

    // Apply the correct token set (light or dark)
    const tokensToApply: ThemeTokens = theme[mode];
    const canonicalTokens = toCanonical(tokensToApply);

    // Guard against undefined or null tokensToApply
    if (tokensToApply && typeof tokensToApply === 'object') {
      // Legacy export (keeps compatibility with existing consumers)
      Object.entries(tokensToApply).forEach(([key, value]) => {
        const cssVarName = `--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
        root.style.setProperty(cssVarName, value);
      });
    }

    // Canonical token export
    Object.entries(canonicalTokens).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
    
    // Add/remove 'dark' class for any vanilla CSS overrides
    root.classList.remove('light', 'dark');
    root.classList.add(mode);

  }, [theme, mode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 
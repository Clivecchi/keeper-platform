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

interface ThemeContextType {
  theme: Theme | null;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
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
      
      if (isAuthenticated && token) {
        try {
          const settings = await apiFetch('/api/kam/settings', {
            headers: { Authorization: `Bearer ${token}` },
          });
          themeIdToLoad = settings.data?.preferred_theme_id || KEEPER_CLASSIC_ID;
        } catch (error) {
          console.error('Failed to fetch user settings, will use default theme.', error);
        }
        
        const fetchedTheme = await fetchThemeById(themeIdToLoad, token);
        setTheme(fetchedTheme || KEEPER_CLASSIC_FALLBACK);

      } else {
        // For public visitors, use the hardcoded fallback immediately.
        setTheme(KEEPER_CLASSIC_FALLBACK);
      }
    };
    
    loadUserSettings();
  }, [isAuthenticated, token]);

  // 3. Apply the current theme and mode to the document
  useEffect(() => {
    const root = document.documentElement;
    if (!theme) return;

    // Apply the correct token set (light or dark)
    const tokensToApply: ThemeTokens = theme[mode];

    Object.entries(tokensToApply).forEach(([key, value]) => {
      const cssVarName = `--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
      root.style.setProperty(cssVarName, value);
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
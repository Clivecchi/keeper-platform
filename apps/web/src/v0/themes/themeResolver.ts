/**
 * Theme Resolver for V0
 *
 * Resolves theme tokens by slug with fallback strategy:
 * 1. Static registry (bundled, always available)
 * 2. API fetch (optional, short timeout, non-blocking)
 * 3. Fallback to style registry behavior
 */

import { getThemeTokensBySlug as getStaticTokens } from './themeRegistry';
import type { ThemeTokens } from './themeRegistry';

// API timeout for theme fetching (300ms)
const API_TIMEOUT_MS = 300;

/**
 * Resolve theme tokens by slug with intelligent fallback
 */
export async function resolveThemeTokens(slug: string): Promise<ThemeTokens | null> {
  // 1. Try static registry first (always fast, always available)
  const staticTokens = getStaticTokens(slug);
  if (staticTokens) {
    return staticTokens;
  }

  // 2. Try API fetch with short timeout (non-blocking)
  try {
    const apiTokens = await fetchThemeFromAPI(slug);
    if (apiTokens) {
      return apiTokens;
    }
  } catch (error) {
    // Silently ignore API failures - this is expected in dev without API running
    // Only log if explicitly requested via debug flag
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('v0-debug-theme-api')) {
      console.debug(`[V0 Theme] API fetch failed for ${slug}:`, error);
    }
  }

  // 3. No theme found - return null (will fall back to style registry)
  return null;
}

/**
 * Fetch theme from API with short timeout
 */
async function fetchThemeFromAPI(slug: string): Promise<ThemeTokens | null> {
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/themes/slug/${slug}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.success && data.data?.style) {
      return data.data.style as ThemeTokens;
    }

    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout - API not available, this is normal
      return null;
    }
    throw error;
  }
}

/**
 * Synchronous version for immediate static access
 */
export function getThemeTokensBySlug(slug: string): ThemeTokens | null {
  return getStaticTokens(slug);
}
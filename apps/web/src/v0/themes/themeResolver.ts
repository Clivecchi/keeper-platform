/**
 * Theme Resolver for V0
 *
 * Resolves theme tokens by slug with fallback strategy:
 * 0. Runtime registry (domain-resolved themes injected at runtime, e.g. 'domain-resolved')
 * 1. Static registry (bundled, always available)
 * 2. API fetch (optional, short timeout, non-blocking)
 * 3. Fallback to style registry behavior
 */

import { getThemeTokensBySlug as getStaticTokens } from './themeRegistry';
import type { ThemeTokens } from './themeRegistry';

// ---------------------------------------------------------------------------
// Runtime theme registry — populated by domainThemeResolver / Curtain at runtime
// ---------------------------------------------------------------------------

const runtimeThemeRegistry = new Map<string, ThemeTokens>()
/** Bumps on every register/clear so React subscribers (StyleScope) re-render. */
let runtimeThemeVersion = 0
const runtimeThemeListeners = new Set<() => void>()

function emitRuntimeThemeChange(): void {
  runtimeThemeVersion += 1
  for (const listener of runtimeThemeListeners) listener()
}

/** Value equality — V0Shell may re-register identical tokens each render with a new object. */
function runtimeTokensEqual(a: ThemeTokens | undefined, b: ThemeTokens): boolean {
  if (a === b) return true
  if (!a) return false
  const keys = Object.keys(b) as Array<keyof ThemeTokens>
  if (Object.keys(a).length !== keys.length) return false
  for (const key of keys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

/**
 * Register a resolved theme for use by the slug resolver.
 * Called by V0Shell / Curtain / board hierarchy after domain theme is resolved.
 */
export function registerRuntimeTheme(slug: string, tokens: ThemeTokens): void {
  const previous = runtimeThemeRegistry.get(slug)
  if (runtimeTokensEqual(previous, tokens)) return
  runtimeThemeRegistry.set(slug, tokens)
  emitRuntimeThemeChange()
}

/**
 * Remove a previously registered runtime theme.
 */
export function clearRuntimeTheme(slug: string): void {
  if (!runtimeThemeRegistry.delete(slug)) return
  emitRuntimeThemeChange()
}

/** Synchronous read — used by StyleScope to avoid a dark-style flash before async resolve. */
export function getRuntimeThemeTokens(slug: string): ThemeTokens | null {
  return runtimeThemeRegistry.get(slug) ?? null
}

/** Subscribe to runtime registry changes (for useSyncExternalStore). */
export function subscribeRuntimeTheme(onStoreChange: () => void): () => void {
  runtimeThemeListeners.add(onStoreChange)
  return () => {
    runtimeThemeListeners.delete(onStoreChange)
  }
}

/** Snapshot version for useSyncExternalStore — changes whenever any runtime theme updates. */
export function getRuntimeThemeVersion(): number {
  return runtimeThemeVersion
}

// API timeout for theme fetching (300ms)
const API_TIMEOUT_MS = 300;

/**
 * Resolve theme tokens by slug with intelligent fallback
 */
export async function resolveThemeTokens(slug: string): Promise<ThemeTokens | null> {
  // 0. Check runtime registry first (domain-resolved themes injected by V0Shell)
  const runtimeTokens = runtimeThemeRegistry.get(slug)
  if (runtimeTokens) return runtimeTokens

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
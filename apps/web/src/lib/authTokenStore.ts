/**
 * Auth Token Store
 * ================
 *
 * Simple in-memory + sessionStorage store for the JWT auth token.
 * This provides a reliable fallback for API authentication when
 * HttpOnly cookies are unavailable (browser settings, cross-subdomain
 * issues, SameSite restrictions, etc.).
 *
 * The token is:
 * - Stored in memory (fastest, cleared on page unload)
 * - Persisted to sessionStorage (survives page refresh within same tab)
 * - NOT stored in localStorage (cleared when tab closes for security)
 *
 * apiFetch.ts reads from this store to inject Authorization headers.
 */

const STORAGE_KEY = 'keeper_auth_token';

let memoryToken: string | null = null;

/**
 * Store the JWT token (called after successful login/register).
 */
export function setAuthToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem(STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // sessionStorage may be unavailable (private browsing, etc.)
  }
}

/**
 * Get the current JWT token.
 * Checks memory first, then sessionStorage.
 */
export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      memoryToken = stored; // Rehydrate memory cache
      return stored;
    }
  } catch {
    // sessionStorage unavailable
  }
  return null;
}

/**
 * Clear the stored token (called on logout).
 */
export function clearAuthToken(): void {
  memoryToken = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage unavailable
  }
}

/**
 * Explicit token helper - reads keeper_token from localStorage
 * Returns undefined if not found or invalid JWT format
 */
export function getStoredToken(): string | undefined {
  try {
    const t = localStorage.getItem('keeper_token');
    if (t && t.split('.').length === 3 && t.length > 50) return t; // explicit, but permissive
  } catch {}
  return undefined;
}


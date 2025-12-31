// src/auth/logout.ts
// Logout helper for HttpOnly cookie sessions
// Calls server to clear cookie, clears any dev tokens, and redirects to login

export async function logout() {
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/api/kam/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (_) {
    // Ignore network errors; we'll still nuke client state
  } finally {
    // Clear any stray dev tokens (PROD shouldn't rely on these, but safe to clear)
    try { localStorage.removeItem('keeper_token'); } catch {}
    try { localStorage.removeItem('keeper_user'); } catch {}
    try { sessionStorage.removeItem('keeper_token'); } catch {}
    try { sessionStorage.removeItem('keeper_user'); } catch {}
    
    // Hard redirect to login
    window.location.assign('/login');
  }
}


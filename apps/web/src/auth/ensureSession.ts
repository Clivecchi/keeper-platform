// src/auth/ensureSession.ts
// Validates that the client's stored token is still valid with the server
// Called at boot to prevent "phantom login" states

export async function ensureSession(): Promise<boolean> {
  const token = localStorage.getItem('keeper_token') || sessionStorage.getItem('keeper_token');
  
  if (!token) {
    console.log('[ensureSession] No token found in storage');
    return false;
  }

  try {
    const apiUrl = (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com';
    const res = await fetch(`${apiUrl}/api/domains/my`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    
    if (res.ok) {
      console.log('[ensureSession] Token validated successfully');
      return true;
    }
    
    console.warn('[ensureSession] Token validation failed:', res.status, res.statusText);
  } catch (err) {
    console.error('[ensureSession] Token validation error:', err);
  }

  // Server says 'nope' → clear client auth
  console.log('[ensureSession] Clearing invalid token from storage');
  localStorage.removeItem('keeper_token');
  sessionStorage.removeItem('keeper_token');
  return false;
}


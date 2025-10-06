// src/auth/AuthGate.tsx
// Strict authentication gate: validates with server before rendering app
// Prevents "phantom login" where UI shows logged-in state without valid token

import React from 'react';

type Status = 'checking' | 'authed' | 'guest';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>('checking');
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      // Do not trust local state: verify with server
      const token =
        localStorage.getItem('keeper_token') ||
        sessionStorage.getItem('keeper_token');

      if (!token) {
        // no token → definitely guest
        console.log('[AuthGate] No token found, setting guest status');
        setUser(null);
        setStatus('guest');
        return;
      }

      try {
        // Fast server ping to validate token using /api/domains/my
        console.log('[AuthGate] Validating token with server...');
        const apiUrl = (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com';
        const response = await fetch(`${apiUrl}/api/domains/my`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });

        if (response.ok) {
          // Token is valid - we don't need the domain data, just the 200 response
          console.log('[AuthGate] Token validated, user authenticated');
          // Set a minimal user object or null - AuthProvider will handle full user state
          setUser({ validated: true });
          setStatus('authed');
          return;
        }
        
        console.warn('[AuthGate] Server rejected token:', response.status);
      } catch (e) {
        console.error('[AuthGate] Token validation failed:', e);
      }

      // If server rejects, nuke any client auth and go guest
      console.log('[AuthGate] Clearing invalid token and setting guest status');
      localStorage.removeItem('keeper_token');
      localStorage.removeItem('keeper_user');
      sessionStorage.removeItem('keeper_token');
      sessionStorage.removeItem('keeper_user');
      setUser(null);
      setStatus('guest');
    })();
  }, []);

  if (status === 'checking') {
    // Minimal splash; ensure the app doesn't flash "logged in"
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#64748b'
      }}>
        Loading…
      </div>
    );
  }

  // Expose auth status to diagnostics
  (window as any).__keeper = { 
    ...(window as any).__keeper, 
    authStatus: status, 
    user,
    authGateLoaded: true
  };

  // Only render the app once we *know* the auth state
  return <>{children}</>;
}


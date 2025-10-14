// src/auth/AuthGate.tsx
// Strict authentication gate: validates with server before rendering app
// Uses HttpOnly cookie-based authentication (extension-proof)
// Prevents "phantom login" where UI shows logged-in state without valid token

import React from 'react';

type Status = 'checking' | 'authed' | 'guest';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>('checking');
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        // Verify session with server using HttpOnly cookie
        // No need to check localStorage - server uses cookie for auth
        if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log('[AuthGate] Validating session with server (cookie-based)...');
        const apiUrl = (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com';
        const response = await fetch(`${apiUrl}/api/kam/auth/me`, {
          method: 'GET',
          credentials: 'include', // Send HttpOnly cookie
        });

        if (response.ok) {
          const data = await response.json();
          if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log('[AuthGate] Session validated, user authenticated');
          setUser(data.user || { validated: true });
          setStatus('authed');
          return;
        }
        
        if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log('[AuthGate] No valid session, setting guest status');
      } catch (e) {
        console.error('[AuthGate] Session validation failed:', e);
      }

      // If server rejects or no session cookie, go guest
      // Clean up any stale localStorage data (legacy)
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


import React from 'react';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ViewModeProvider } from './context/ViewModeContext'
import { FrameProvider } from './context/FrameContext'
import { KeeperProvider } from './context/KeeperContext'
import { BoardProvider } from './context/BoardContext'
import './index.css'

// Helper to retrieve JWT from storage
function getJWT(): string | undefined {
  try {
    const k =
      localStorage.getItem('keeper_token') ||
      sessionStorage.getItem('keeper_token');
    if (k && k.split('.').length === 3 && k.length > 80) return k;
    // (Optional) tiny heuristic scan if needed:
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const v = store.getItem(store.key(i)!);
        if (v && v.split('.').length === 3 && v.length > 80) return v;
      }
    }
  } catch {}
  return undefined;
}

// TEMPORARY – fetch shim to enforce absolute API host and inject JWT until migration completes
// TODO: Remove after replacing all fetch('/api/...') usages with apiFetch
const VITE_API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const urlString = typeof input === 'string' ? input : (input as URL).toString();
      let absolute = urlString;

      // Rewrite relative /api/ paths to absolute if we have VITE_API_URL
      if (VITE_API_URL && /^\/?api\//.test(urlString)) {
        const normalized = urlString.replace(/^\/?api\//, '/api/');
        absolute = `${VITE_API_URL.replace(/\/$/, '')}${normalized}`;
      }

      // Check if this is an API request (relative /api/ or absolute to API domain)
      const isApiRequest = /^\/?api\//.test(urlString) || 
                          (VITE_API_URL && absolute.startsWith(VITE_API_URL)) ||
                          absolute.includes('api.ke3p.com');

      const headers = new Headers(init?.headers || {});
      // Inject Authorization for all API requests if not already set
      if (isApiRequest && !headers.has('Authorization')) {
        const jwt = getJWT();
        if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
      }

      return originalFetch(absolute, {
        ...init,
        headers,
        credentials: init?.credentials ?? 'include',
      });
    } catch {}
    return originalFetch(input as any, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ViewModeProvider>
            <KeeperProvider>
              <FrameProvider>
                <BoardProvider>
                  <App />
                </BoardProvider>
              </FrameProvider>
            </KeeperProvider>
          </ViewModeProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

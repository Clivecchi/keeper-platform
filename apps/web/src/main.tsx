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

// TEMPORARY – fetch shim to enforce absolute API host until migration completes
// TODO: Remove after replacing all fetch('/api/...') usages with apiFetch
const VITE_API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;
if (typeof window !== 'undefined' && VITE_API_URL) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const urlString = typeof input === 'string' ? input : (input as URL).toString();
      if (/^\/?api\//.test(urlString)) {
        const normalized = urlString.replace(/^\/?api\//, '/api/');
        const absolute = `${VITE_API_URL.replace(/\/$/, '')}${normalized}`;
        return originalFetch(absolute, { credentials: 'include', ...init });
      }
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

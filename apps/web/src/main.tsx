// MUST BE FIRST: Install global fetch shim before any other imports
try {
  await import('./boot/fetch-shim');
} catch (e) {
  console.warn('[fetch-shim] failed to load (continuing):', e);
}
import './lib/diagnostics';

import React from 'react';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthGate } from './auth/AuthGate'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ViewModeProvider } from './context/ViewModeContext'
import { FrameProvider } from './context/FrameContext'
import { KeeperProvider } from './context/KeeperContext'
import { BoardProvider } from './context/BoardContext'
import './index.css'

// AuthGate validates session before rendering app
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthGate>
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
    </AuthGate>
  </React.StrictMode>,
);

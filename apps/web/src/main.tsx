// MUST BE FIRST: Install global fetch shim before any other imports
import('./boot/fetch-shim').catch((e) => {
  console.warn('[fetch-shim] failed to load (continuing):', e);
});
import './lib/diagnostics';

import { createRoot } from 'react-dom/client'
import App from './App'
import { AppProviders } from './providers/AppProviders'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import './worlds/shared/world-mode.css'

if (import.meta.env.DEV) {
  void import('./v0/presents/theatre/initTheatreStudio.dev').then(
    ({ initTheatreStudio }) => { initTheatreStudio() }
  )
}

// AppProviders wraps all global providers (AuthGate, Router, Auth, Theme, etc.)
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AppProviders>
      <App />
    </AppProviders>
  </ErrorBoundary>
);

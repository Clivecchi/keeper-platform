# AppProviders

## 📌 Purpose

This folder contains the global provider wrapper that extracts all application-level providers from `main.tsx` into a reusable component. This ensures consistent provider hierarchy across all layouts while separating concerns between providers (data/state) and shell UI (navigation/chrome).

## 🧱 Key Files

- `AppProviders.tsx` - Global provider wrapper component

## 🔄 Data & Behavior

### Provider Hierarchy (in order)

1. **React.StrictMode** - React development mode checks
2. **BrowserRouter** - React Router for navigation
3. **AuthProvider** - Authentication state and user context (single /api/kam/auth/me on load)
4. **AuthGate** - Waits for authResolved before rendering app (no duplicate fetch)
5. **ThemeProvider** - Theme switching (light/dark)
6. **ViewModeProvider** - View mode state
7. **KeeperProvider** - Keeper-specific context
8. **FrameProvider** - Frame system context
9. **BoardProvider** - Board-specific context

### What AppProviders Does

- Wraps the entire application with all necessary providers
- Ensures consistent provider order across all layouts
- Provides global state (auth, theme, etc.) to all components
- Does NOT render any visual UI (no navbar, sidebar, etc.)

### What AppProviders Does NOT Include

- Shell UI components (Navbar, Sidebar, Footer)
- Layout components
- Page-specific providers
- HTTP interceptors (handled elsewhere)
- Global CSS (handled in index.css)

## 🎯 Usage

### In main.tsx

```tsx
import { AppProviders } from './providers/AppProviders';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>
);
```

### Benefits

- **Separation of Concerns:** Providers are separate from shell UI
- **Reusability:** Can be used across different app structures
- **Maintainability:** Single source of truth for provider hierarchy
- **Flexibility:** Layouts can add/remove shell UI without affecting providers

## ⚠️ Notes & ToDo

### Implementation Notes

- Provider order matters - do not reorder without testing
- All providers are required for the app to function properly
- If adding a new provider, add it to AppProviders and update this README

### Related Components

- `layouts/AppLayout.tsx` - Protected routes with Sidebar + Navbar
- `layouts/PublicLayout.tsx` - Public routes with Navbar only
- `layouts/BoardPublicLayout.tsx` - Board routes with no shell UI
- `main.tsx` - Application entry point
- `App.tsx` - Route definitions

### Phase 1 Changes (2025-11-06)

- Created AppProviders component
- Extracted all providers from main.tsx
- Simplified main.tsx from 30+ lines to 5 lines
- Maintained exact same provider hierarchy
- No breaking changes

## 📆 Update Log

### 2026-02-28 - Auth consolidation
- Reordered providers: AuthProvider now wraps AuthGate so AuthGate uses AuthContext (single auth fetch)
- Eliminates duplicate /api/kam/auth/me calls on load

### 2025-11-06 - Initial Creation
- Created `AppProviders.tsx` component
- Extracted all providers from `main.tsx`
- Documented provider hierarchy and usage
- Part of board-first interface Phase 1 refactor


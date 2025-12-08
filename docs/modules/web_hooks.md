# Web Hooks

## 📌 Purpose
Collection of reusable React hooks that encapsulate Keeper-specific behaviors (agent interactions, autosave, viewer context, user settings, etc.).

## 🧱 Key Files
- `useAgentEvents.ts` – Listens for agent lifecycle events.
- `useAutosave.ts` – Debounced persistence for editable resources.
- `useViewerContext.ts` – Syncs viewer state with layout shell.
- `useUserSettings.ts` – Fetches user preference data (themes, toggles) when a bearer token is available.

## 🔄 Data & Behavior
- Hooks always read from context/providers (`useAuth`, `useTheme`, etc.) instead of accessing storage directly.
- `useUserSettings` now guards against cookie-only sessions; it only hits `/api/kam/settings` when a real bearer token exists to prevent persistent 401 noise.
- Autosave hook emits debounced save callbacks plus dirty state helpers for editors.

## ⚠️ Notes & ToDo
- [ ] Port remaining class-based lifecycle code into composable hooks.
- [ ] Expose `useAgentEvents` telemetry for analytics dashboards.

## 📆 Update Log
### 2025-12-08 - useUserSettings Cookie-Aware Guard
- Ensured the hook skips `/api/kam/settings` unless a valid bearer token exists and added TODO guidance for the future cookie-auth endpoint.

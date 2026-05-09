# Web Hooks

## 📌 Purpose
Collection of reusable React hooks that encapsulate Keeper-specific behaviors (agent interactions, autosave, viewer context, user settings, etc.).

## 🧱 Key Files
- `useAgentDialog.ts` — Parameterized agent session hook. Supports any agent via `agentSlug` / `agentDisplayName`. Replaces and supersedes `useKipSession`. Used by IDE Board, Agent Board, and Domain Board.
- `useKipSession.ts` — Deprecated alias for `useAgentDialog`. Re-exported for backward compatibility only.
- `useDraftContext.ts` — Draft–session linking (IDE) and post-run draft list refresh (Agent).
- `useAgentEvents.ts` – Listens for agent lifecycle events.
- `useAgentSessions.ts` – Loads Kip sessions, exposes creation helpers, and normalizes previews for the Agent Board.
- `useAutosave.ts` – Debounced persistence for editable resources.
- `useViewerContext.ts` – Syncs viewer state with layout shell.
- `useUserSettings.ts` – Fetches user preference data (themes, toggles) when a bearer token is available.

## 🔄 Data & Behavior
- Hooks always read from context/providers (`useAuth`, `useTheme`, etc.) instead of accessing storage directly.
- `useAgentSessions` keeps a normalized cache of Kip sessions (sorted by `updatedAt`), exposes optimistic creation, and reports transient errors for the board UI.
- `useUserSettings` now guards against cookie-only sessions; it only hits `/api/kam/settings` when a real bearer token exists to prevent persistent 401 noise.
- Autosave hook emits debounced save callbacks plus dirty state helpers for editors.

## ⚠️ Notes & ToDo
- [ ] Port remaining class-based lifecycle code into composable hooks.
- [ ] Expose `useAgentEvents` telemetry for analytics dashboards.

## 📆 Update Log

### 2026-05-09 — useAgentDialog + useDraftContext agentId rename
- Created `useAgentDialog.ts` — parameterized agent session hook supporting any agent via `agentSlug` / `agentDisplayName`. Adds `mode: "domain" | "designer"`, `dialogBoard`, `dialogFrame`, `dialogSubject`, `sessionDisplayName`, `agentRunMode` params. Renames `kipAgentId` → `agentId` in result. Replaces all hardcoded "kip" / "Kip" strings with params.
- `useKipSession.ts` replaced with backward-compat re-export alias pointing to `useAgentDialog`.
- `useDraftContext.ts` — renamed `kipAgentId` → `agentId` in interface and implementation.
### 2025-12-16 - Active draft normalization
- `useAgentSessions` now surfaces `activeDraftId` from `kip_sessions`, keeping session cards aware of session-level draft pointers for the Drafts tab.
### 2025-12-11 - Session topic metadata
- `useAgentSessions` now normalizes topic/summary/tags, exposes metadata patching, and keeps local state in sync after edits for the Kip Agent Board.
### 2025-12-10 - Kip sessions envelope guard
- `useAgentSessions` now handles the `{ sessions, total, page }` response shape safely, guards against non-array payloads, and preserves updatedAt sorting to avoid `.map` runtime errors on the Kip Agent Board.
### 2025-12-09 - Kip Agent Sessions Hook
- Added `useAgentSessions` to back the Kip Agent Board V01 UI, including normalized previews, creation helpers, and refresh controls.

### 2025-12-08 - useUserSettings Cookie-Aware Guard
- Ensured the hook skips `/api/kam/settings` unless a valid bearer token exists and added TODO guidance for the future cookie-auth endpoint.

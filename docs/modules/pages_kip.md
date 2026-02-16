# Kip Agent Board Pages

## 📌 Purpose
Kip-specific board pages that recreate the V0 Agent Board layout (Dialogue, Cockpit, Sessions) inside the Keeper dashboard shell.

## 🧱 Key Files
- `KipAgentBoardPage.tsx` – Routed at `/kip`, redirects into `/d/:slug/board?frame=agent` while exporting `KipAgentBoard` for reuse inside the v0 agent frame.

## 🔄 Data & Behavior
- `KipAgentBoard` (exported from this page) encapsulates the header, tabs, session column, and dialogue frame so other routes (e.g., v0 AgentFrame) can reuse the exact layout.
- Relies on `useAgentSessions` to load, normalize, and create `kip_sessions` via `/api/kip/agents?sessions=true&agentId=...` and `action="createSession"`.
- Dialogue tab fetches `kip_messages` with `/api/kip/agents?messages=true&sessionId=...`, renders metadata cards, and posts user input through `action="run"` when sending messages.
- Cockpit and context cards share the latest session metadata plus placeholder journey/keeper links until those APIs are wired.

## ⚠️ Notes & ToDo
- [ ] Wire Related Journeys / Active Keeper cards to real data sources.
- [ ] Replace Cockpit diagnostics placeholders with backend stats once exposed.
- **Deprecation**: KipAgentBoardPage uses AgentPostureHeader; deprecation planned. Prefer v0 AgentBoardFrame at `?frame=agent`.

## 📆 Update Log
### 2026-02-15 - AgentPostureHeader integration
- Replaced AgentHeader with AgentPostureHeader (governance stack: agent, domain, lens, mode, governance, voice). Added DialogueModeToggle for mode switching. Deprecation planned; prefer v0 AgentBoardFrame.
### 2026-01-27 - Public Kip scope
- Added a public-scope banner, limited tabs/tools for guests, and clarified scope labeling in the header.
### 2026-01-19 - Redirect /kip into v0 agent frame
- `/kip` now redirects to `/d/default/board?frame=agent` to keep v0 shell canonical while reusing `KipAgentBoard` inside the agent frame.
### 2025-12-16 - Drafts tab + session active draft linkage
- Added Drafts tab with domain-scoped directory, JSON editor, and Save flow plus set/clear active draft actions tied to the current session and KAM environment summary.
### 2025-12-15 - Session edit modal + PATCH summary/tags
- Added Session Edit modal with name/summary/tags fields launched from Session cards; uses Dialog UI, prevents click bubbling, and logs open/save for quick wiring verification.
- Save now PATCHes `updateSessionMetadata` (topic/summary/tags), keeps the modal open on error with inline messaging, and updates the sessions list immediately after success.
### 2025-12-14 - Mode dropdown + per-mode config
- Replaced Normal with Domain mode, introduced dropdown + gear to open a right-side Mode Config drawer with per-mode lens selection, output style, limits, and debug capture settings; wired to `/api/kip/agents/:id/mode-config` and `/api/kip/lenses`.
### 2025-12-14 - Dialogue Debug Brief + auth context
- Debug Mode now shows auth context presence (user/auth/kam keys, authz header) and adds a Debug Brief generator with symptom capture and copy buttons.
- Agent prompt gains a Debug Investigator Lens when Debug Mode is on to request concise evidence-focused replies.
### 2025-12-12 - Dialogue debug mode V01
- Added session-scoped Dialogue Debug Mode toggle plus drawer with recent request capture and copy-to-clipboard bundle (redacted headers, last 50 requests).
- Debug drawer surfaces agent/session/domain context and highlights recent failures for Kip sessions.
### 2025-12-13 - Session create instrumentation + domain payload + edit fetch
- "New Session" logs URL/body and sends optional domainId/domainSlug so backend traces are clear.
- Edit now triggers a session fetch on click (visible network activity) while opening the inline editor.
- Error banners include HTTP status/request id for creation/message loads.
### 2025-12-12 - New session payload + edit wiring + richer errors
- Kip "New Session" now sends the expected `action=createSession` payload (with request id surfaced) and shows backend error details/status when creation fails.
- Session cards now open the inline edit panel when clicking Edit, even before the session is active.
- Dialogue/message errors also surface the API message from session create/message fetch failures instead of generic 500 text.
### 2025-12-12 - Strict agent fetch + API error surfacing
- Kip Agent fetch no longer falls back to mock data on API 4xx, preventing invalid agent IDs from reaching create-session.
### 2025-12-11 - Session topic/summary surface + edit
- Session cards now show `topic` with summary fallback, and the Sessions view includes a lightweight editor that patches session metadata (topic/summary) via `/api/kip/agents` PATCH.
### 2025-12-10 - Sessions guard + context stub hooks
- Guarded session rendering against non-array payloads, ensured new sessions activate immediately, and wrapped Related Journeys / Active Keeper panels in placeholder hooks ready for real data.
### 2025-12-09 - Shared Kip Agent Board Component
- Exported `KipAgentBoard` so `/d/:slug/agent` can reuse the same Dialogue/Cockpit/Sessions layout and API wiring without duplicating UI logic.
### 2025-12-09 - LinkedCard Context Panels
- Wired Related Journeys + Active Keeper panels and dialogue metadata to the shared `LinkedCard` component + prop type, replacing the temporary inline card markup.
### 2025-12-09 - Kip Agent Board V01
- Introduced `KipAgentBoardPage` with tabbed layout, context column, and dialogue wiring backed by `kip_sessions` + `kip_messages`.
- Added `useAgentSessions` consumption plus create-session + run-agent flows for the `/kip` route.
### 2026-02-08 - Quota/credit error messaging in dialogue UI
- **KipAgentBoardPage.tsx**: Enhanced the error display in `DialogueMessageList` to visually distinguish quota/credit errors (amber warning style with triangle icon) from other errors (red error style). Quota errors show an "AI Model Needs Credits" heading with the detailed message below.
### 2026-02-08 - Agent loading fix after authentication
- Added `isAuthenticated` to the dependency array of the agent-loading useEffect in `KipAgentBoardPage.tsx`, ensuring the agent data is re-fetched after the user logs in.
- Clears `agentError` on retry to provide a clean error state.

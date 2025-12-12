# Kip Agent Board Pages

## 📌 Purpose
Kip-specific board pages that recreate the V0 Agent Board layout (Dialogue, Cockpit, Sessions) inside the Keeper dashboard shell.

## 🧱 Key Files
- `KipAgentBoardPage.tsx` – Routed at `/kip`, renders the Agent Board layout (header, tabs, context column, and right-side frames) on top of `KeeperDashboardLayout`.

## 🔄 Data & Behavior
- `KipAgentBoard` (exported from this page) encapsulates the header, tabs, session column, and dialogue frame so other routes (e.g., `/d/:slug/agent`) can reuse the exact layout.
- Relies on `useAgentSessions` to load, normalize, and create `kip_sessions` via `/api/kip/agents?sessions=true&agentId=...` and `action="createSession"`.
- Dialogue tab fetches `kip_messages` with `/api/kip/agents?messages=true&sessionId=...`, renders metadata cards, and posts user input through `action="run"` when sending messages.
- Cockpit and context cards share the latest session metadata plus placeholder journey/keeper links until those APIs are wired.

## ⚠️ Notes & ToDo
- [ ] Wire Related Journeys / Active Keeper cards to real data sources.
- [ ] Replace Cockpit diagnostics placeholders with backend stats once exposed.

## 📆 Update Log
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


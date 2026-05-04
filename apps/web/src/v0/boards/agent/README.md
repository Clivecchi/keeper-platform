# Agent Board

## 📌 Purpose
The Agent Board is the workspace for interacting with registered Kip agents and managing drafts. It uses `KeeperBoardPanelGroup` for resizable three-panel layout (nav / conversation / right panel).

## 🧱 Key Files
- `AgentBoard.tsx` — Board root. Owns `domainId`, `selectedAgentId`, `selectedDraftId`, `domainError` state. Provides Board-level view state branching in right panel.
- `AgentBoardNav.tsx` — Left nav. Renders Agents (primary), Journeys, Keepers, Drafts (secondary). Receives `domainId` from Board — does not resolve it independently.
- `AgentBoardConversation.tsx` — Center panel. Owns `KeeperDialogFrame` directly. Wired to `useKipSession` in `mode: "agent"`.
- `AgentBoardPanel.tsx` — Right panel. Accepts `mode: "draft" | "agent"` prop from Board. Renders `DraftView` or `AgentView` based on mode.
- `AgentBoardIdlePanel.tsx` — Right panel idle state. Named component matching `HomeViewPanel` visual standard. Shown when no agent or draft is selected.

## 🔄 Data & Behavior
- `AgentBoard` fetches `domainId` from `/api/domains/by-slug/[slug]`. On failure, renders visible error state (`domainError`).
- `AgentBoardNav` receives `domainId` as a prop and fires the Keeper fetch directly against `/api/keepers?domainId=` — no duplicate slug resolution.
- Right panel view state is determined at Board level: `selectedDraftId && domainId` → draft mode; `selectedAgentId` → agent mode; else → idle.
- `AgentBoardPanel` accepts `mode` prop; the Board, not the panel, determines which mode is active.
- Keeper list renders all API-returned keepers. When count exceeds 10, a "Show all" affordance expands the list.

## ⚠️ Notes & ToDo
- [ ] Confirm `isPrivate` intent for Agent Board (boardRegistry.ts shows `true`; Moment 2.1 schema doc listed `false`)
- [ ] "More" footer items (Dialogue, Configuration, Diagnostics) are not wired — marked with TODO
- [ ] Agent "Configure" button in AgentBoardPanel is disabled — not yet wired
- [ ] Journey list is hard-capped at 5 — no "Show all" affordance yet (Keeper list addressed in Moment 2.2)

## 📆 Update Log
### 2026-05-04 — Moment 2.2: AgentBoard Reconciliation
- `AgentBoardNav`: receives `domainId` from Board (was re-resolving independently — primary Keeper defect fixed)
- `AgentBoardNav`: removed duplicate `/api/domains/by-slug` call; Keeper fetch now keyed on `domainId`
- `AgentBoardNav`: response shape parse confirmed (`data.keepers`); removed double-path fallback
- `AgentBoardNav`: removed `.slice(0, 5)` cap; added "Show all" affordance at 10+ keepers
- `AgentBoardNav`: removed unused `refreshDrafts` prop (`_refreshDrafts`)
- `AgentBoard`: added `domainError` state — failed fetch renders visible error, not silent null
- `AgentBoard`: Board-level right panel view state surfaced (`draft | agent | idle` branching)
- `AgentBoard`: imports and renders `AgentBoardIdlePanel` for idle state
- `AgentBoardPanel`: added `mode: "draft" | "agent"` prop; Board determines mode
- `AgentBoardPanel`: removed anonymous inline idle block (replaced by `AgentBoardIdlePanel`)
- `AgentBoardConversation`: removed unused `agents` prop and `AgentItem` type
- `AgentBoardIdlePanel.tsx`: created — named idle state component matching `HomeViewPanel` visual standard (Option B)

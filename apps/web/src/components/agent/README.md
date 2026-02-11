# Agent Components

## Purpose
Shared presentational components for the agent/Kip interface. Extracted from the legacy `KipAgentBoardPage` monolith for reuse by the new `AgentBoardFrame` and any future agent surfaces.

## Key Files
- `DialogueMessageList.tsx` -- Scrollable conversation message list with action receipts, skeleton loading, and error states. Agent name is dynamic (passed as prop, never hardcoded).
- `SessionCard.tsx` -- Clickable session card for conversation session lists. Compact and full variants.
- `CockpitPanel.tsx` -- Agent configuration and diagnostics overview: SOLE memory, model config, tools/integrations, session stats. Also exports `FrameCard` utility component.
- `AgentContextBar.tsx` -- Thin persistent bar showing active journey scope, keeper scope, SOLE memory status, and session ID. Displayed above the workspace to make agent operating context visible.
- `types.ts` -- Shared types: `AgentDialogueMessage`, `DialogueMetaItem`, `normalizeActionReceipt()`.
- `helpers.ts` -- Shared formatting utilities: `formatDate`, `formatTime`, `formatRelative`, `shortId`.

## Data and Behavior
- `DialogueMessageList` renders `AgentDialogueMessage[]` with role-based styling (user messages right-aligned, agent messages left-aligned). Supports `LinkedCard` inline rendering and `ActionReceiptCard` for draft/entity creation receipts.
- `SessionCard` displays `AgentConversationSession` from the `useAgentSessions` hook. Supports edit callbacks and active highlighting.
- `CockpitPanel` reads `FrameContext` for keeper/journey selection to determine capability indicators (SOLE, journey tracking, etc.).
- `AgentContextBar` is a pure presentational component with no data fetching.

## Notes and ToDo
- [ ] Consider extracting the debug drawer and mode config components if the new Agent Board needs debug mode
- [ ] Replace hardcoded `#C96E59` colors in SessionCard/DialogueMessageList with theme variables

## Update Log
- 2026-02-09: Initial extraction from KipAgentBoardPage. Created DialogueMessageList, SessionCard, CockpitPanel, AgentContextBar, types, and helpers.

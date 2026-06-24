# Agent Components

## Purpose
Shared presentational components for the agent/Kip interface. Extracted from the legacy `KipAgentBoardPage` monolith for reuse by the new `AgentBoardFrame` and any future agent surfaces.

## Key Files
- `AgentComposer.tsx` -- Cursor-style chat input with tool kit: agent/mode dropdown, config dropdown (model/lens, Open Cockpit), textarea, library upload (composer clip), submit, feedback area. Used by AgentBoardFrame and KeeperDialogFrame.
- `AgentContextBanner.tsx` -- Context-first banner for Agent Board: domain · keeper/journey/studio, Live indicator, Open Cockpit. Agent name lives in AgentComposer.
- `AgentPostureHeader.tsx` -- Legacy governance stack banner (agent, domain, lens, mode, governance, voice). Used by KipAgentBoardPage.
- `DraftCard.tsx` -- Inline-editing draft card: title, summary, status pill, sections (add/delete), JSON toggle, bottom toolbar (Save, JSON/Edit, ← Dialogue).
- `JourneyCard.tsx` -- Detail view for a Journey (Draft UI style): title, forward, paths, moments, Set as Active, ← Dialogue.
- `KeeperCard.tsx` -- Detail view for a Keeper (Draft UI style): title, purpose, domain, Set as Active, ← Dialogue.
- `DialogueMessageList.tsx` -- Scrollable conversation message list with action receipts, skeleton loading, and error states. Agent name is dynamic (passed as prop, never hardcoded).
- `errorPresentation.ts` -- Shared category/tone mapping for Kip dialogue errors such as provider overloads, quota, timeouts, missing keys, and invalid models.
- `SessionCard.tsx` -- Clickable session card for conversation session lists. Compact and full variants.
- `CockpitPanel.tsx` -- Agent configuration and diagnostics overview: SOLE memory, model config, tools/actions (allowedActions prop), session stats, governance compliance (when showCompliance). Also exports `FrameCard` utility component.
- `AgentContextBar.tsx` -- Thin persistent bar showing active journey scope, keeper scope, SOLE memory status, and session ID. Displayed above the workspace to make agent operating context visible.
- `SessionBannerCard.tsx` -- Unified dialogue session banner: editable session title, session ID, Journey/Keeper/SOLE/Session/Model context row, Change model button. Replaces WorkspaceHeader + AgentContextBar in dialogue workspace.
- `types.ts` -- Shared types: `AgentDialogueMessage`, `DialogueMetaItem`, `normalizeActionReceipt()`.
- `helpers.ts` -- Shared formatting utilities: `formatDate`, `formatTime`, `formatRelative`, `shortId`.

## Data and Behavior
- `AgentComposer` owns the dialogue input: agent name + mode selector (Domain/Debug), config dropdown (model/lens + Open Cockpit link), textarea, clip attach (uploads to Library, stages in Thinking Space on Dialog boards), submit. `onLibraryFileUpload` returns `{ url, name, libraryItemId }`. Controlled `attachments` + `attachmentDisplay="thinking-space"` used by `KeeperDialogFrame`.
- `DialogueMessageList` renders `AgentDialogueMessage[]` with role-based styling (user messages right-aligned, agent messages left-aligned). Supports `LinkedCard` inline rendering and `ActionReceiptCard` for draft/entity creation receipts.
- Dialogue errors route through `getAgentErrorPresentation()` so provider overloads and configuration issues receive informational headings instead of generic failure copy.
- Unsupported action receipts (`NOT_ALLOWED`) are filtered from the visible transcript because the server logs/skips them; they should not appear as user-facing failures.
- `SessionCard` displays `AgentConversationSession` from the `useAgentSessions` hook. Supports edit callbacks and active highlighting.
- `CockpitPanel` reads `FrameContext` for keeper/journey selection to determine capability indicators (SOLE, journey tracking, etc.). When `allowedActions` is provided (e.g. from AgentBoardFrame), it displays the actual action list (draft.create, moment.create, sole.save, etc.); otherwise falls back to hardcoded capability labels. Option B: fetches keeper-scoped SOLE when `activeKeeperId` is set, domain anchor SOLE when only `domainId` is set.
- `AgentContextBar` is a pure presentational component with no data fetching.

## Notes and ToDo
- [ ] Consider extracting the debug drawer and mode config components if the new Agent Board needs debug mode

## Update Log
- 2026-06-24: Filtered unsupported `NOT_ALLOWED` action receipts from `DialogueMessageList` so invented/unsupported coordination actions do not render as red failure cards.
- 2026-06-24: Added shared agent error presentation helper; `DialogueMessageList` titles Kip failures by category (overload, quota, timeout, provider key, invalid model) instead of generic "Something went wrong".
- 2026-06-18: `DialogueMessageList` — hides director delegation beats when content is internal failure copy ("did not respond this turn").
- 2026-06-17: Clip upload returns Library URL; staged attachments show in Dialog Thinking Space until send (still added to Library + Nav on pick). PDFs attach as `file` type to agent API.
- 2026-06-17: Composer clip uploads to domain Library (`onLibraryFileUpload`) — same as Library nav +; no longer inlines `.md`/text into the message box.
- 2026-05-30: Rendr treatment correction — warm dark message bubbles (agent 72% / user 65% alpha), teal user text, composer input uses `--theme-surface-elevated` at 90% opacity with teal send button and caret; service bar icons recede via placeholder ink.
- 2026-05-26 (Agent Echo rename): Echo attribution fallback uses `echoAgentName` prop (board def agentName), not hardcoded "Kip".
- 2026-05-26 (Agent Board Phase 4 — agent echo): `types.ts` — added `DialogResponseEcho` and optional `echo` on `AgentDialogueMessage`. `DialogueMessageList.tsx` — renders agent echo as subordinate beat beneath agent message (attributed name, smaller type, no avatar). Primary agent bubble rendering unchanged.
- 2026-05-02 (Sprint Item 5 — Kip System Prompt / keeper-card): Created `KipResponseCard.tsx` — structured card component for Kip's operational responses. Props: `type`, `title`, `body`, `meta`, `items`. Type "status" suppresses label; "error" shows warm-red label; "summary"/"info" show small-caps label. Uses Cormorant Garamond for title. `DialogueMessageList.tsx` updated: added `parseContentSegments()` helper that splits message content on `\`\`\`keeper-card` fences; valid JSON with `type`+`title` fields renders `KipResponseCard`; invalid JSON or missing fields falls back to standard ReactMarkdown code block. `MD_COMPONENTS` extracted to module constant; `AgentMessageContent` sub-component replaces inline ReactMarkdown call. `packages/database/prisma/seeds/lenses.seed.ts` Domain Lens system prompt extended with keeper-card format instructions — append only, nothing removed. Re-seed required to propagate to live DB.
- 2026-04-25: AgentComposer: Added image vision unavailability banner — when an image attachment is pending, a yellow notice appears ("Kip can't currently see attached images — describe what you're seeing for best results."). DialogueMessageList: Added `onOpenJourney` prop; wired to ActionReceiptCard so tapping a Journey receipt card loads it in the right panel. IDEBoardConversation now passes `onOpenJourney` → `onKipContextSync({ type: "journey", id })`.
- 2026-02-28: Added SessionBannerCard — unified session banner for dialogue workspace. Combines session title (editable inline), session ID, Journey/Keeper/SOLE/Session/Model context row, and Change model button. Replaces separate WorkspaceHeader + AgentContextBar in AgentBoardFrame dialogue view.
- 2026-02-26: CockpitPanel: Dynamic model loading from GET /api/kip/models?provider=X. Fetches from provider API (OpenAI, Anthropic) server-side; loading state; fallback to minimal hardcoded list on fetch failure. Keeps current model selectable when not in fetched list.
- 2026-02-19: CockpitPanel: Added "Change model" button and modal. Fetches model catalog from GET /api/kip/models. onAgentUpdated callback refreshes parent agent state.
- 2026-02-19: AgentComposer: Cursor-style layout. Toolbar (∞ Kip Domain | attach | send) above full-width input. Attachment bar shows file previews above input; files upload to blob, no longer inlined as text. Act/Kip/kip-old moved below composer by Margin.
- 2026-02-18: ActionReceiptCard: entity names (draft title, moment title) now clickable links when onOpenDraft/onOpenMoment provided. DialogueMessageList passes onOpenMoment; AgentBoardFrame wires to navigateToFrame("moment", { draftId }).
- 2026-02-18: AgentComposer: compact toolbar (send inside), sticky above Margin when Kip active, expanded uploads (images, video, docs via Vercel Blob; text files inlined; URLs referenced as [Attached: name](url)).
- 2026-02-18: Added AgentComposer (Cursor-style chat tool kit: agent/mode dropdown, config dropdown, attach, submit, feedback area). Simplified AgentContextBanner: removed agent name (moved to composer), kept domain · keeper/journey, Live, Open Cockpit. useAgentPostureData extended with setDialogueMode for mode switching.
- 2026-02-17: Added JourneyCard and KeeperCard for workspace detail views (Draft UI style). Used by AgentBoardFrame when sidebar journey/keeper items are clicked.
- 2026-02-17: Added AgentContextBanner (context-first: domain, keeper/journey, agent). Added DraftCard for inline-editing draft UI with sections and JSON toggle. AgentBoardFrame now uses AgentContextBanner; AgentPostureHeader remains for legacy KipAgentBoardPage.
- 2026-02-15: Added AgentPostureHeader for governance stack banner (agent, domain, lens, mode, governance, voice).
- 2026-02-15: CockpitPanel SOLE Records: robust parsing for API response shapes ({ success, data } or raw array).
- 2026-02-09: Option B SOLE: CockpitPanel accepts domainId; fetches domain anchor SOLE when no keeper selected via GET /api/domains/:domainId/kip/sole-memory-cards; shows SOLE Records card for both keeper and domain anchor.
- 2026-02-09: Composed system prompt always visible (from action pack preview); soleStatus prop for Memory section; keeper sharpening indicator.
- 2026-02-09: Added composedSystemPrompt, activeKeeperId props; SOLE records fetch and display; theme tokens for dialogue colors; actionResults from message metadata.
- 2026-02-09: Added allowedActions prop to CockpitPanel to display agent tools/actions. Falls back to hardcoded capabilities when not provided.
- 2026-02-09: Initial extraction from KipAgentBoardPage. Created DialogueMessageList, SessionCard, CockpitPanel, AgentContextBar, types, and helpers.
- 2026-02-14: Added showCompliance prop and GovernanceCompliancePanel to CockpitPanel. When showCompliance (admin view), displays Draft Trigger Success %, Tool-First Violations, Total checks via GET /api/domains/:domainId/governance/compliance.

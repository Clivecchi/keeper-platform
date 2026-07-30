# Agent Components

## Purpose
Shared presentational components for the agent/Kip interface. Extracted from the legacy `KipAgentBoardPage` monolith for reuse by the new `AgentBoardFrame` and any future agent surfaces.

## Key Files
- `AgentComposer.tsx` -- Cursor-style chat input with tool kit: agent/mode dropdown, config dropdown (model/lens, Open Cockpit), textarea, library upload (composer clip), submit, feedback area. Used by AgentBoardFrame and KeeperDialogFrame.
- `SupportingDocumentTile.tsx` -- Compact "Pasted" tile for ephemeral supporting context in the composer (Claude-style).
- `composerSupporting.ts` -- Paste capture threshold, message assembly for supporting documents.
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
- `AgentComposer` owns the dialogue input: agent name + mode selector (Domain/Debug), config dropdown (model/lens + Open Cockpit link), textarea, clip attach (uploads to Library, stages in Thinking Space on Dialog boards), submit. Large paste (≥280 chars or multi-line block) becomes an ephemeral **supporting document** — staged in Thinking Space on Dialog boards (`attachmentDisplay="thinking-space"`), or above the textarea on legacy composer surfaces. Full context is sent with the next message; the Dialog transcript shows a short label via `displayContent`.
- `DialogueMessageList` renders `AgentDialogueMessage[]` with role-based styling (user messages right-aligned, agent messages left-aligned). Supports `LinkedCard` inline rendering and `ActionReceiptCard` for draft/entity creation receipts. Skipped and error action receipts (including `NOT_ALLOWED`) are shown when the server returns a message.
- Dialogue errors route through `getAgentErrorPresentation()` so provider overloads and configuration issues receive informational headings instead of generic failure copy.
- Skipped/error action receipts render in the transcript (including `NOT_ALLOWED`) so users see when Kip could not run an action.
- `SessionCard` displays `AgentConversationSession` from the `useAgentSessions` hook. Supports edit callbacks and active highlighting.
- `CockpitPanel` reads `FrameContext` for keeper/journey selection to determine capability indicators (SOLE, journey tracking, etc.). When `allowedActions` is provided (e.g. from AgentBoardFrame), it displays the actual action list (draft.create, moment.create, sole.save, etc.); otherwise falls back to hardcoded capability labels. Option B: fetches keeper-scoped SOLE when `activeKeeperId` is set, domain anchor SOLE when only `domainId` is set.
- `AgentContextBar` is a pure presentational component with no data fetching.

## Notes and ToDo
- [ ] Consider extracting the debug drawer and mode config components if the new Agent Board needs debug mode

## Update Log
- 2026-07-30: **Agent Echo persistence** — `DialogResponseEcho` documents `metadata.echo` on the primary message (`content` / `attributedTo` / `status`). Rehydrated in `useAgentDialog.normalizeMessage`; empty/silent stays visually silent; Voice Cards (`castVoices`) unchanged.
- 2026-07-28: **Universal Board composer unlock** — `AgentComposer` no longer requires `activeSessionId` to type or send. Matches lazy Dialog creation (`resume` on mount, `resumeOrCreate` on first send) so Domain, IDE, Designer, Agent, and Realm share one unlocked composer path. Still gated by `disabled` (unresolved agent → "Preparing conversation…").
- 2026-07-27: **Mobile-compact composer height** — `composerSize="mobile-compact"` uses `rows={1}` and skips the auto-resize MIN_ROWS floor so staged response height (44–56px) is not forced back to 80px+.
- 2026-07-25: **Equal cast voice cards** — multi-select consults attach `castVoices[]` on the lead message; each engaged agent renders as its own accent-rail voice card before Lead synthesis. `KipResponseCard` gets matching left rail. Lead synthesis prompt told not to re-roll-call nested quotes.
- 2026-07-11: **Attachment + Enter send** — Enter now requires typed prompt text (staged files ride along); Send button still allows attachment-only. Controlled Thinking Space attachments clear only after parent send completes. Dialog submit awaits agent run and blocks double-send during Library commit.
- 2026-07-08: **Gloss bubble framing** — `GlossSurface` wraps the chat bubble shell (not just `<p>`); hover recolors the existing border and places the Gloss pill on the top border rail without overlapping message text.
- 2026-07-02: **P4.1 paste in Thinking Space** — large paste tiles render in Broadcast Strip (`DialogUploadStream`) on Dialog boards; transcript uses `displayContent` not raw supporting context. **P2.3 Cloud routing** — failed/empty director delegation shows amber notice beat (`status: failed|empty`) instead of hiding routing failure.
- 2026-07-02: **P2.1 action failure visibility** — `DialogueMessageList` shows skipped/error action receipts including `NOT_ALLOWED`; removed filter that hid unsupported actions from the transcript.
- 2026-06-29: **Multi-agent turn grouping** — director delegation + lead (+ echo) render inside `.dialog-multi-agent-turn`: slight indent, hairline border, left accent, inner beats separated by dividers (single combined output, not separate bubbles).
- 2026-06-28: **Multi-agent collaborative bubbles** — director delegation + echo render as separate equal-weight chat bubbles (name label + tinted surface per agent) instead of nested smaller beats inside one bubble. Collaborator uses domain treatment tint; lead uses paper; echo uses dialogue-area tint.
- 2026-06-28: `normalizeActionReceipt` guards null/invalid action payloads; `DialogueMessageList` skips malformed receipts so Dialog panel does not crash on bad metadata.
- 2026-06-28: `DialogueMessageList` — passes `contextNarrative` (agent message body) and `onKeepAsMoment` to `ActionReceiptCard` for **Keep as Moment** on generated images; wired from Domain Board via `KeeperDialogFrame`.
- 2026-06-27: **Supporting documents** — large paste captured as ephemeral composer tile (`SupportingDocumentTile`, label "Pasted"); full text sent as supporting context with prompt; transcript shows short label; not saved to Library; file uploads still stage in Thinking Space.
- 2026-06-26: Restored **director delegation** (Cloud/Rendr beat above Kip) and **agent echo** (subordinate beat below) in `DialogueMessageList` — regressed during UI simplification; hides internal failure copy via `isDirectorDelegationFailureContent`.
- 2026-06-24: Filtered unsupported `NOT_ALLOWED` action receipts from `DialogueMessageList` so invented/unsupported coordination actions do not render as red failure cards.
- 2026-06-24: Added shared agent error presentation helper; `DialogueMessageList` titles Kip failures by category (overload, quota, timeout, provider key, invalid model) instead of generic "Something went wrong".
- 2026-06-18: `DialogueMessageList` — hides director delegation beats when content is internal failure copy ("did not respond this turn").
- 2026-06-17: Clip upload returns Library URL; staged attachments show in Dialog Thinking Space until send (still added to Library + Nav on pick). PDFs attach as `file` type to agent API.
- 2026-06-17: Composer clip uploads to domain Library (`onLibraryFileUpload`) — same as Library nav +; no longer inlines `.md`/text into the message box.
- 2026-05-30: Rendr treatment correction — warm dark message bubbles (agent 72% / user 65% alpha), teal user text, composer input uses `--theme-surface-elevated` at 90% opacity with teal send button and caret; service bar icons recede via placeholder ink.
- 2026-05-26 (Agent Echo rename): Echo attribution fallback uses `echoAgentName` prop (board def agentName), not hardcoded "Kip".
- 2026-05-26 (Agent Board Phase 4 — agent echo): `types.ts` — added `DialogResponseEcho` and optional `echo` on `AgentDialogueMessage`. `DialogueMessageList.tsx` — renders agent echo as subordinate beat beneath agent message (attributed name, smaller type, no avatar). Primary agent bubble rendering unchanged.
- 2026-07-14: Restored **keeper-card rendering** — `AgentMessageContent.tsx` parses ` ```keeper-card ` fences again; `DialogueMessageList` uses it instead of plain `whitespace-pre-line` (regressed during June multi-agent/Gloss UI simplification). Added `onOpenLibraryItem` + `LibraryItemReceiptCard` for tappable Library picks → Chronicle.
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

- 2026-07-15: **keeper-card reliability** � AgentMessageContent prefers structured metadata.card; fences remain fallback. Unit tests for parse/normalize/strip.


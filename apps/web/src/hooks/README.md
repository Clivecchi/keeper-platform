# Web Hooks

## 📌 Purpose
Collection of reusable React hooks that encapsulate Keeper-specific behaviors (agent interactions, autosave, viewer context, user settings, etc.).

## 🧱 Key Files
- `useDraftPointAccept.ts` — Shared Accept handler for draft points (Dialog receipts + Chronicle blocks).
- `useDraftPointPromote.ts` — Promote accepted journey_spec points to Journey (Nav selection or spec `targetJourneyId`).
- `useAgentDialog.ts` — Parameterized agent session hook (`agentSlug` / `agentDisplayName`). Used by IDE, Agent, and Domain boards.
- `useComposerDraftAutosave.ts` — SessionStorage-backed unsent composer recovery for all Kip dialog surfaces.
- `useKipSession.ts` — Deprecated alias for `useAgentDialog`. Re-exported for backward compatibility only.
- `useDraftContext.ts` — Draft–session linking (IDE) and post-run draft list refresh (Agent).
- `useAgentEvents.ts` – Listens for agent lifecycle events.
- `useAgentSessions.ts` – Loads Kip sessions, exposes creation helpers, and normalizes previews for the Agent Board.
- `useSelectionSessionResume.ts` — Resumes the most recent Dialog session when Nav selection changes (Dialog, Journey, Keeper, Draft, Agent).
- `useAutosave.ts` – Debounced persistence for editable resources.
- `useViewerContext.ts` – Syncs viewer state with layout shell.
- `useUserSettings.ts` – Fetches user preference data (themes, toggles) when a bearer token is available.
- `useTalkMode.ts` — Web Speech API hook for Talk mode (listen → transcript → composer confirm → send). Shared by mobile Kip and future Realm Screen composer.

## 🔄 Data & Behavior
- Hooks always read from context/providers (`useAuth`, `useTheme`, etc.) instead of accessing storage directly.
- `useAgentSessions` keeps a normalized cache of Kip sessions (sorted by `updatedAt`), exposes optimistic creation, and reports transient errors for the board UI.
- `useUserSettings` now guards against cookie-only sessions; it only hits `/api/kam/settings` when a real bearer token exists to prevent persistent 401 noise.
- Autosave hook emits debounced save callbacks plus dirty state helpers for editors.
- `useTalkMode` exposes `idle | listening | transcribing | error` states; `onTranscript` merges into composer via parent — never auto-sends.

## ⚠️ Notes & ToDo
- [ ] Port remaining class-based lifecycle code into composable hooks.
- [ ] Expose `useAgentEvents` telemetry for analytics dashboards.

## 📆 Update Log

### 2026-07-18 — Director instrument split (HTTP 502 fix)
- `useAgentDialog` — on director boards, runs the pinned/addressed instrument (e.g. Rendr) in its own `runAgent` call, then Kip synthesis with `instrumentRanClientSide`. Avoids nested AI calls in one Vercel→Railway proxy hop that returned HTTP 502.

### 2026-07-11 — Attachment thinking beats
- `useAgentDialog` — attachment run-trace label is now "Including … in your message" (not "Reviewing"), matching what the API actually does.

### 2026-07-03 — Domain/Realm composer session bootstrap
- `useAgentDialog` — when Universal Board controls session id, domain/agent board init now calls `onControlledSessionIdChange(sessionId)` after `resumeOrCreateBoardSession` (matches IDE). Fixes composer locked with "Create a session to start chatting" after controlled-session regression.

### 2026-07-03 — Session accuracy + resume scope
- `useAgentDialog` — controlled boards ignore stale internal session ids; reset transcript on board key change.
- `useSelectionSessionResume` — Agent Board agent nav uses board-scoped session resolve.

### 2026-07-03 — First-load dedupe pass
- `domainMomentsCache`: single fetch per slug (limit 50), callers slice — fixes limit=12 vs limit=50 double fetch
- `boardNavDataCache`: library slice + board-aware prefetch (Domain board skips drafts)
- `FrameContext`: keepers via shared nav cache
- `KipApi`: inflight dedupe for `getAgentBySlug` + `getSessionMessages`
- `frameLeadAgentIdentity`: remember missing lead slugs — one 404 then fallback to `kip`
- `useAgentDialog`: `resolveLeadAgentId` for slug lookup (404 → `kip`); domain mode defers session history via `requestIdleCallback` so nav/frame paint first.

### 2026-07-02 — P3.2 Draft–Journey promote fallback
- **`useDraftPointPromote`**: optional `resolveJourneyId` when Nav has no selected Journey; surfaces error on promote without resolvable target.

### 2026-07-02 — P4.1 paste transcript + P2.3 Cloud routing visibility
- `sendMessage` uses `displayContent` when patching session messages (supporting paste no longer appears raw in user bubble).
- `extractRunAgentPayload` accepts `directorDelegation.status` of `failed` | `empty`; attaches `buildInstrumentUnavailableDelegationBeat` when Cloud/Rendr was targeted but API returned no beat.

### 2026-07-01 — Talk mode STT hook (Phase 4D.1–4D.2)
- Added `useTalkMode.ts` — Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`); states `idle | listening | transcribing | error`.
- Wired via `KeeperDialogFrame` `talkMode` prop → `AgentComposer` mic control; enabled on mobile `KipScreen` and `RealmScreen` composer.
- Graceful fallback: unsupported browsers show disabled mic with tooltip; no auto-send — user confirms in composer.

### 2026-06-30 — Draft point promote hook
- Added `useDraftPointPromote.ts` — calls `KipApi.promoteDraftPoint`; bumps draft + journey nav on success

### 2026-06-28 — Domain Board dialog preserved on draft nav
- `useSelectionSessionResume` — Domain Board draft/journey/keeper nav no longer clears center Dialog (Chronicle-only, same as Agent Board).
- `UniversalBoardContext` — Dialog/Journey/Keeper/Moment/Agent nav clears `?draftId=` so URL sync does not undo Dialog selection.
- `openIdle` — refetches active session instead of wiping transcript when session id still exists.
- IDE draft resume — when no draft-linked session exists, links the active session to the draft instead of wiping to idle greeting.

### 2026-06-22 — Universal composer draft autosave
- Added `useComposerDraftAutosave.ts` — debounced `sessionStorage` persist keyed by domain, board, agent, and session.
- Wired into `useAgentDialog` (Universal Board), `AgentBoardFrame`, `CompanionSlide`, and `CoverChatInterface`.
- Clears stored draft on successful send; restores composer text after failed send.

### 2026-06-22 — Thinking Space run trace
- `useAgentDialog` keeps thinking steps after send; maps `actionResults` into trace lines; clears trace on next message only.

### 2026-06-22 — Session resume: board-scoped Dialog + no ghost sessions
- `useAgentDialog` domain/agent/ide bootstrap uses `resumeOrCreateBoardSession` instead of always `createSession`.
- `useSelectionSessionResume` uses `pickBestDialogSessionId` for Dialog nav and `resumeOrCreateBoardSession` for Agent Board fallback.

### 2026-06-19 — Draft point Accept hook
- Added `useDraftPointAccept` — used by `UniversalConversation` and `DraftFocusPresence`; bumps draft nav + presence on accept.

### 2026-05-28 — Domain mode: defer session until domainId resolves
- `useAgentDialog` skips `createSession` in domain mode while `domainId` is null or a shell fallback id — pairs with UniversalBoard syncing id from V0Shell.

### 2026-05-26 — Run-agent payload extraction
- Added `extractRunAgentPayload` — reads `actions` and `session_id` from nested `data.data` envelope returned by `/api/kip/agents`.
- Syncs server-returned `session_id` when the client had no active session (System agents e.g. Cloud).

### 2026-05-26 — Action receipts on Agent Board
- `useAgentDialog` attaches `actionResults` to the last agent message for `agent` and `domain` modes (was IDE-only).

### 2026-05-26 — Agent Board Chronicle-only nav guard
- `useSelectionSessionResume` returns early on Agent Board when keeper/journey/draft is selected without an agent — center Dialog session and messages stay put.

### 2026-05-25 — Experience rename: `ExperienceContext` → `AgentContext`
- `useAgentDialog` exports `AgentContext`; runAgent option `agentContext` replaces `experienceContext`.

### 2026-05-23 — Gate 2: unified designer transport
- Removed `/kip/designer` branch from `useAgentDialog.sendMessage` — all modes use `KipApi.runAgent`.
- Designer sessions resume via `/kip/dialogs/resolve/active` + `KipApi.createSession` with `dialogBoard: "designer"`.
- Removed `clearDesignerDialog`, `setDesignerDialogId`, and `onDesignerDraft` from the hook surface.

### 2026-05-23 — Gate 1: selection drives Dialog session resume
- Added `useSelectionSessionResume.ts` — loads most recent session on Nav selection via existing `/kip/dialogs/:id` and `KipApi.getSessionsByAgentId` routes.
- `UniversalBoardContext.onSessionSelect` now accepts `string | null` to support idle Dialog state when no session exists.

### 2026-05-09 — useAgentDialog designer transport (Gap 3)
- Added `frameKey?: string` and `onDesignerDraft?: (draft, frameKey) => void` to `UseAgentDialogOptions`.
- Added exported `DesignerApiResponse` interface matching POST `/api/domains/:domainId/kip/designer` response shape.
- `sendMessage` now has a dedicated `mode === "designer"` branch that calls `/kip/designer` with `{ message, frameKey, conversationHistory, dialog_id, dialog_board: "designer" }` instead of `KipApi.runAgent`.
- `designerDialogIdRef` tracks the `dialog_id` returned by the first response so subsequent turns resume the same Dialog record.
- `messagesRef` keeps an always-current message snapshot for building conversation history without modifying the `sendMessage` dep array.
- Standard KipApi session creation is now skipped for `mode === "designer"` — the `/kip/designer` route owns its own dialog/session lifecycle.
- `DESIGNER_BOARD_DEF.conversation.kipMode` updated from `"domain"` to `"designer"`. `ConversationPanelDef.kipMode` union extended with `"designer"`.

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

# IDE Board

## 📌 Purpose
The primary collaborative workspace where Kip and the user build Journeys, Paths, Moments, and Drafts together. Three-column layout: left nav, center conversation, right context panel.

## 🧱 Key Files
- `IDEBoard.tsx` — Root board component. Owns all selection state (activeJourneyId, selectedDraftId, selectedMomentId, selectedKeeperId, activeSessionId). Renders the three-column `KeeperBoardPanelGroup`.
- `IDEBoardNav.tsx` — Left panel: Drafts, Journeys, Keepers, Sessions navigation sections.
- `IDEBoardConversation.tsx` — Center panel: Kip chat via `useKipSession`. Renders `DialogueMessageList` and `AgentComposer`. Syncs Kip context (journey/draft/moment) to parent via `onKipContextSync`.
- `IDEBoardContext.tsx` — Right panel: priority display (draft → moment → keeper → journey). Journey view now renders **`KeeperJourneyPanel`** — a living document layout: title, forward, Paths in order, per-Path prelude + Moments beneath each Path, `+ Add Moment` / `+ Add Path` affordances.
- `IDEDraftPanel.tsx` — Right panel draft detail view (reuses Kip draft editing UI).
- `ideBoardTypes.ts` — `IDEBoardKipContext` union type (`{ type: "journey" | "draft" | "moment" | "keeper"; id: string }`).
- `components/KeeperPanel.tsx` — Keeper detail view in right panel.
- `components/ServicesFrame.tsx` — Services overlay (Cloud, Railway, Vercel, GitHub tabs). Shown when `activeService !== null`.
- `components/IntegratedServicesBar.tsx` — Compact services status bar in conversation header.

## 🔄 Data & Behavior
- State ownership: `IDEBoard` owns all selection IDs; passes them down as props.
- Context sync: When Kip creates/references a journey/draft/moment, `IDEBoardConversation` calls `onKipContextSync` → `IDEBoard` updates the appropriate selection ID → `IDEBoardContext` loads and displays the entity in the right panel.
- Journey tabs (`IDEBoardContext`):
  - **Paths**: fetched from `GET /api/paths?journeyId=...`. Cards are inline-editable (name and prelude via `PUT /api/paths/:id`). Status chips rendered per path.
  - **Moments**: fetched from public journey API. Expand/collapse each moment. Chronological (newest first).
  - **Drafts**: fetched from `KipApi.listDrafts(domainId)`. Tapping a draft fires `onDraftSelect` to load it in the right panel. (Domain-scoped; journey-scoped filtering is a future enhancement once `kip_drafts` has a `journey_id` column.)
- Image vision: `AgentComposer` shows a yellow warning banner when image attachments are pending, since Kip does not currently have vision capability wired.
- Journey/Path/Moment action receipts in chat render as rich card components (`JourneyReceiptCard`, `PathReceiptCard`, `MomentReceiptCard`) inside `ActionReceiptCard`. Tapping a Journey card fires `onOpenJourney` → syncs `activeJourneyId` in the right panel.

## ⚠️ Notes & ToDo
- [ ] `DraftsTab` in `IDEBoardContext` shows all domain drafts. Needs journey-scoped filter once `kip_drafts.journey_id` column is added (schema migration required).
- [ ] `onDraftSelect` in `IDEBoardContext` triggers right panel draft view — verify this also updates left nav selection state.
- [ ] Path status chip is static ("Active") — add a `status` field to `Path` model if we want Active/Planned/Reference to be data-driven.
- [ ] Wire vision capability into IDE Board chat context so agent can see attached screenshots (high-value future enhancement).
- [ ] Moment capture frame-first pattern: agent should present the Moment frame card for confirmation without a back-and-forth prompt. Requires KipAgentService change.
- [ ] Known Gaps Path: create a dedicated "Known Gaps & Improvements" Path in the Building Keeper Journey where each gap is a Moment.

## 📆 Update Log
- 2026-05-02 (Sprint Item 4 — Nav CRUD + Journey Scoping Fix): **IDEBoard.tsx** — extended `JourneySummary` type with `keeperId?: string | null` (field already returned by `/api/journeys`). Both `KeeperViewPanel` render paths now filter `journeys` by `selectedKeeperId` (nav click path) or `frameCtx?.selection.activeKeeperId` (frame context path) before passing `activeJourneys`. Selecting "Platform Development Keeper" now shows only that keeper's journeys; selecting any other keeper shows only its journeys; empty keeper shows "No journeys yet". **IDEBoardNav.tsx** — Sessions `SidebarCard` no longer receives a `description` (count removed). Added `onAdd` affordances to Drafts, Journeys, Keepers sections (each logs a placeholder to console). Sessions section has no add action. `allSessionItems` now compares stored session title against known keeper names — if the title matches a keeper name (i.e. was stored as the keeper's name, not a real session title), falls back to `Session · [date]` display format. **SidebarCard.tsx** — `description` prop made optional; paragraph is only rendered when description is non-empty, eliminating phantom empty-line space below headings.
- 2026-05-01 (Sprint Item 3 — Home View State): `IDEBoardContext` — default Journey view replaced with `KeeperJourneyPanel` (living document layout: title → forward → Paths in order → per-Path prelude + Moments beneath). Tabbed Paths/Moments/Drafts view removed. `KeeperJourneyPanel` fetches `GET /api/journeys/:id` (authenticated, with `paths[].Moment` nested). Existing public-API journey fetch retained for first-journey ID fallback when `activeJourneyId` is null.
- 2026-04-27 (Prompt 3): `IDEBoardContext` — Paths fetch now includes `domainId` as a query param (`GET /api/paths?journeyId=...&domainId=...&limit=50`) to satisfy `requireDomainReadCompat` middleware. `domainId` added to the effect dependency array so the fetch re-runs if `domainId` resolves late. Fixes "Couldn't load paths." error state in the Paths tab.
- 2026-04-25: IDEBoardContext major refactor. Journey view now has three tabs: **Paths** (inline-editable cards, status chips, fetched from `/api/paths?journeyId=...`), **Moments** (chronological expand/collapse, unchanged behavior), **Drafts** (domain drafts from KipApi, tappable to open). Added `InlineEditField`, `StatusChip`, `JourneyTabBar`, `PathsTab`, `MomentsTab`, `DraftsTab` sub-components. Added `onDraftSelect` prop to `IDEBoardContextProps`. Wired in `IDEBoard.tsx`.
- 2026-04-25: IDEBoardConversation: `DialogueMessageList` now receives `onOpenJourney` → calls `onKipContextSync({ type: "journey", id })` to auto-load journey in right panel when a Journey receipt card is tapped.

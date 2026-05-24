# Panels — Universal Board

## 📌 Purpose
Shared panel components used by Universal Board. Each panel has a defined treatment character that governs not just what it shows but how it feels. These are not generic UI components — they are surfaces with intent.

## 🧱 Key Files
- `UniversalViewPanel.tsx` — Chronicle: the right panel for all Universal Boards (TreatmentSurface)
- `UniversalSwitcherPanel.tsx` — Left panel for Design Board; two static sections: Frames and Board Definitions; no fetching; zero hardcoded colors
- `UniversalContextPanel.tsx` — legacy right panel (superseded by Chronicle, retained for reference)

## 🔄 Data & Behavior

### UniversalViewPanel (Chronicle)
**Treatment character: presence, intentional interaction, navigable history — a story already in progress.**

Chronicle is the right panel for all Universal Boards. It is built as a TreatmentSurface — a component that reads Treatment JSON at runtime. The first tier is Framer Motion ambient only.

**Three elements:**

| Element | Description |
|---|---|
| **Trail Bar** | Permanent top. History stack (max 3 visible, `···` compresses older). Feed indicator (soft dot + count, 60s polling, tappable → domain feed). Lateral slide 200ms entry / 140ms exit. |
| **Panel Body** | Universal — `KeeperPresence` for every subject type. Opacity dissolve on context shift (200ms entry / 140ms exit). Never empty — domain idle uses KeeperPresence. |
| **Idle State** | `KeeperPresence` objectType=`domain` — ambient feed (recent moments, moving/present journeys). |

**Panel Body:** Universal path — every selection routes to `ChronicleRecordView` → `ChroniclePresenceView` → `KeeperPresence`. No board-specific renderers.

**Views:**

| Trigger | Renderer |
|---|---|
| Any selection (dialog, journey, moment, keeper, draft, agent, service, frame, boardDef) | `KeeperPresence` |
| Nothing selected (domain idle) | `KeeperPresence` objectType=`domain` |

`contextSurface.viewStates` on board defs carries **treatment copy only** — it does not gate routing. All boards declare every subject via `mergeViewStates()`.

Frame and boardDef use `layout="config"`. Step 2 will migrate full DesignBoardFrameDetail capabilities into KeeperPresence internals.

**Gate 3 standard:** Chronicle record views are thin wrappers. They call `ChroniclePresenceView` → `KeeperPresence` with `layout="focus"` and density `standard`. No bespoke field assembly per type. Journey focus uses dedicated KeeperPresence layout (paths with prelude, tappable moments, Set as Active).

**Moment hierarchy — Journey first (via KeeperPresence enrichment):**
Moment breadcrumb shows `Journey title / Path name` above the title. Resolved via secondary journey fetch or v0 moments fallback.

**Edit behavior:**
- Fields editable by default — no view/edit toggle
- Debounced autosave at 1000ms via KeeperPresence PATCH

**Trail history:**
- Maintained in component state, driven by `boardCtx.selection` changes
- New context key → push entry, set `currentIndex` to end, direction `"forward"`
- Clicking trail item → set `currentIndex`, re-dispatch selection action
- `···` button → navigate to item before visible window
- Labels resolved asynchronously via `onLabelResolved` callback

**Feed indicator:**
- Polls `/api/journeys?domainId=:id` every 60 seconds
- Counts journeys with `momentCount > 0` as the feed signal
- Tappable — navigates to domain idle (Recent Moments feed)

**Data:** KeeperPresence fetches and enriches its own data. The panel is self-sufficient. `domainId` is always received as a prop (resolved at board root, never by panels).

**Colors:** All `hsl(var(--theme-*))` — zero hardcoded values.

## ⚠️ Notes & ToDo
- [x] Gate 3 — all record types on KeeperPresence via ChronicleRecordView
- [x] Dialog Chronicle view — wired through KeeperPresence
- [x] Feed indicator tappable
- [ ] Step 2: migrate DesignBoardFrameDetail preview/config/props into KeeperPresence frame type
- [ ] Rendr integration — spatial ratios and density governed by `presenceTreatment` field

## 📆 Update Log

### 2026-05-24 — Universal Chronicle: single KeeperPresence path (Steps 1 + 4)
- Removed `FrameView`, `BoardDefView`, `ServiceView`, and `UniversalViewPanelIdle` from Chronicle router
- Every trail kind routes through `ChroniclePresenceView` → `KeeperPresence`
- Removed per-board `viewStates` routing gates; `mergeViewStates()` gives all boards every subject
- Added `frame`, `boardDef` presence schemas; domain/service idle enrichment in `presenceEnrichment.ts`

### 2026-05-24 — KeeperPresence Phase 1: Journey focus parity
- Chronicle journey view uses `KeeperPresence` focus layout (JourneysFrame parity: header, paths with prelude, tappable moments, Set as Active via UniversalBoardContext)

### 2026-05-23 — Gate 3: Chronicle renders every record with equivalent depth
- Replaced bespoke JourneyView, MomentView, KeeperView, DraftView, AgentView, DialogIdleView with `ChronicleRecordView` → `ChroniclePresenceView` → `KeeperPresence`
- Dialog now renders full presence (title, scope, sessions, updated) — no longer falls back to idle
- Feed indicator is tappable — navigates to domain idle / Recent Moments feed
- ~950 lines of duplicate view logic removed from UniversalViewPanel

### 2026-05-23 — Gate 1: selection drives both panels
- `resolveKindId` includes `dialog` when `selectedDialogId` is set
- Trail Bar navigation re-dispatches board selection actions so history matches context

### 2026-05-09 — Chronicle: domain feed in idle state
- `UniversalViewPanelIdle` — when `domainSlug` is provided, fetches recent kept Moments and renders "Recent Moments" section

### 2026-05-06 — Chronicle: UniversalViewPanel
- Created `UniversalViewPanel.tsx` — Chronicle with Trail Bar, Panel Body mini-router, idle state

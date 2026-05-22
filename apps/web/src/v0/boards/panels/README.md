# Panels — Universal Board

## 📌 Purpose
Shared panel components used by Universal Board. Each panel has a defined treatment character that governs not just what it shows but how it feels. These are not generic UI components — they are surfaces with intent.

## 🧱 Key Files
- `UniversalViewPanel.tsx` — Chronicle: the right panel for all Universal Boards (TreatmentSurface)
- `UniversalSwitcherPanel.tsx` — Left panel for Design Board; two static sections: Frames and Board Definitions; no fetching; zero hardcoded colors
- `UniversalContextPanel.tsx` — legacy right panel (superseded by Chronicle, retained for reference)

## 🔄 Data & Behavior

### UniversalViewPanel (Chronicle)
**Treatment character: presence, intentional interaction, navigable history.**

Chronicle is the right panel for all Universal Boards. It is built as a TreatmentSurface — a component that reads Treatment JSON at runtime. The first tier is Framer Motion ambient only.

**Three elements:**

| Element | Description |
|---|---|
| **Trail Bar** | Permanent top. History stack (max 3 visible, `···` compresses older). Feed indicator (soft dot + count, 60s polling). Lateral slide 200ms entry / 140ms exit. |
| **Panel Body** | Mini-router over `panelHistory[currentIndex]`. Opacity dissolve on context shift (200ms entry / 140ms exit). Never empty — falls back to `UniversalViewPanelIdle`. |
| **Idle State** | `UniversalViewPanelIdle` — domain name + ambient awareness (active journeys). Always present. |

**Views (mini-router targets):**

| View | Triggered by | What comes forward |
|---|---|---|
| `UniversalViewPanelIdle` | domain (nothing selected) | Domain name, moving journeys, present journeys |
| `JourneyView` | `selectedJourneyId` | Title (read-only), editable forward, Paths with moment counts, created date |
| `MomentView` | `selectedMomentId` | Journey → Path breadcrumb, title + full narrative, date |
| `KeeperView` | `selectedKeeperId` | Name + purpose, recent sessions (journeys by keeper) |
| `DraftView` | `selectedDraftId` | Title, truncated summary preview, date |
| `KeeperPresence` (agent only) | `selectedAgentId` | Schema-driven agent surface — unchanged |

**Moment hierarchy — Journey first:**
The Moment view always shows `Journey title / Path name` above the moment title. It resolves the hierarchy via a secondary journey fetch if `journeyId` is present on the moment response.

**Edit behavior:**
- Fields editable by default — no view/edit toggle
- Debounced autosave at 1000ms
- PATCH `/api/moments/:id`, `/api/journeys/:id`, `/api/keepers/:id`

**Motion — Framer Motion only:**
- Trail Bar: lateral slide (`x`) on history change — 200ms entry, 140ms exit
- Panel Body: opacity dissolve on context shift — 200ms entry, 140ms exit
- No CSS transition fallbacks at this tier

**Trail history:**
- Maintained in component state, driven by `boardCtx.selection` changes
- New context key → push entry, set `currentIndex` to end, direction `"forward"`
- Clicking trail item → set `currentIndex`, direction `"back"` or `"forward"`
- `···` button → navigate to item before visible window
- Labels resolved asynchronously by each view via `onLabelResolved` callback

**Feed indicator:**
- Polls `/api/journeys?domainId=:id` every 60 seconds
- Counts journeys with `momentCount > 0` as the feed signal
- Shows soft pulsing dot + count when `feedCount > 0`

**Data:** Each view fetches its own data. The panel is self-sufficient. `domainId` is always received as a prop (resolved at board root, never by panels).

**Colors:** All `hsl(var(--theme-*))` — zero hardcoded values.

**Used by all four Universal Boards:**
- IDE Board — default right panel (via `UniversalBoard` fallback)
- Agent Board — default right panel (via `UniversalBoard` fallback)
- Domain Board — explicit right render prop with local selection state wired in
- Designer Board — default right panel when migrated to `UniversalBoard` shell

---

### UniversalContextPanel (legacy)
**Superseded by Chronicle.** Retained for reference. CSS-driven transitions, no Framer Motion.
Five surfaces: DomainPresence, JourneyPresence, MomentPresence, KeeperPresence, DraftPresence.
No trail history, no feed indicator, no editable fields.

## ⚠️ Notes & ToDo
- [x] Draft presence in Chronicle — DraftView wired via `/api/domains/:domainId/kip/drafts/:id`
- [x] Agent presence — KeeperPresence (unchanged)
- [ ] Service presence — for IDE Board's ServicesFrame integration
- [ ] Rendr integration — spatial ratios and density governed by `presenceTreatment` field
- [x] Designer Board — migrated to UniversalBoard shell (Moment 2.7); Chronicle renders at idle and when Board Definition selected

## 📆 Update Log

### 2026-05-21 — Gate 1: Chronicle renders every record type
- `PanelBody` routes Journey, Moment, Keeper, and Draft to dedicated views instead of `KeeperPresence`
- `JourneyView` — normalizes API path/moment counts, read-only title, editable forward, created date
- `KeeperView` — resolves keeper via list fallback when direct fetch lacks domain context; loads recent sessions from `/api/journeys?keeperId=`
- `DraftView` — fetches via `/api/domains/:domainId/kip/drafts/:id`; truncated summary preview
- `MomentView` — improved hierarchy resolution; v0 moments list fallback when direct fetch fails
- Agent remains on `KeeperPresence` — unchanged

### 2026-05-06 — Moment 2.7: UniversalSwitcherPanel (Design Board left panel)
- Created `UniversalSwitcherPanel.tsx` — left panel for Design Board
  - Two static sections: **Frames** (from `BOARD_FRAMES[activeBoardId]` with live/draft dots) and **Board Definitions** (all four board defs from `UniversalBoardDefinition.ts`)
  - Selecting a Frame → `onSelectFrame(key)` → sets `activeFrameKey` in parent
  - Selecting a Board Definition → `onSelectBoard(id)` → sets `activeBoardId` + `selectedBoardDefId` in parent
  - No fetching — all data flows in as props
  - All colors `hsl(var(--theme-*))` — zero hardcoded values

### 2026-05-09 — Chronicle: domain feed in idle state
- `UniversalViewPanel` now accepts optional `domainSlug` prop.
- `UniversalViewPanelIdle` — when `domainSlug` is provided, fetches recent kept Moments (`/api/v0/moments?status=kept&limit=12`) and renders a "Recent Moments" section above the Journeys sections.
- `PanelBodyProps` updated to thread `domainSlug` to all idle fallback render paths.
- Domain Board passes `domainSlug` so Chronicle is never blank — domain feed is its ambient idle state.

### 2026-05-06 — Chronicle: UniversalViewPanel
- Created `UniversalViewPanel.tsx` — Chronicle, the right panel for all Universal Boards
  - Trail Bar: history stack (max 3 visible), `···` compressor, feed indicator (60s polling)
  - Panel Body: mini-router with `AnimatePresence` opacity dissolve (200ms/140ms)
  - `UniversalViewPanelIdle` (named export) — domain name + ambient awareness, never empty
  - `JourneyView` — editable title + forward, Paths with moment counts
  - `MomentView` — Journey → Path breadcrumb hierarchy, editable title + narrative
  - `KeeperView` — editable name + purpose, recent sessions
  - Framer Motion lateral slide on Trail Bar history change (200ms/140ms)
  - Framer Motion opacity dissolve on Panel Body context shift (200ms/140ms)
  - All colors `hsl(var(--theme-*))` — zero hardcoded values
  - Debounced autosave (1000ms) on all editable fields
- Updated `UniversalBoard.tsx` — imports `UniversalViewPanel` instead of `UniversalContextPanel`
- Updated `DomainBoard.tsx` — right render prop now uses Chronicle with local selection state
- Updated `AgentBoard.tsx` — stale comment updated to reference Chronicle

### 2026-05-04 — Universal Board: Full Definition with Treatment
- Created `panels/` directory under `v0/boards/`
- Created `UniversalContextPanel.tsx` — right panel Living Multi-Context Surface
  - Five presence surfaces: Domain, Journey, Moment, Keeper, Draft
  - `PresenceTransition` component — CSS-driven context shift animation
  - Self-sufficient data fetching per surface
  - Reads from `UniversalBoardContext` via `useUniversalBoardOptional()`
  - All colors via `hsl(var(--theme-*))` only

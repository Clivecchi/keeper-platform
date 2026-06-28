# Domain Board

## 📌 Purpose
The public-facing domain overview board. Persisted Kip conversation in the center (sessions created and resumable). Domain feed (recent Moments + active Journeys) lives in Chronicle (right panel) as its ambient idle state. Three-column layout: left board/frame nav, center dialog shell, right Chronicle.

## 🧱 Key Files
- `DomainBoard.tsx` — Root board component. Owns switcher open state and live domain list fetch for `DomainSwitcher`. Delegates three-column layout to `UniversalBoard`.
- `domainSwitcherData.ts` — Fetches `GET /api/domains/my`; `createDomain` → `POST /api/domains`.
- `DomainAddPanel.tsx` — Create-domain form opened from switcher “Add a domain”.
- `domainSwitcherTheme.ts` — Fixed light-on-dark ink tokens for picker readability.

## 🔄 Data & Behavior
- **Left panel**: Collapsible board switcher (Domain / Design / Agent) and frame list.
- **Center panel**: `DomainBanner` at top, then `DomainBoardConversation` — persisted Kip sessions routed through `KipApi.runAgent`. Sessions are created on mount, resumable.
- **Right panel**: Chronicle (`UniversalViewPanel`). When `domainSlug` is provided (as it is for Domain Board), the idle state shows domain feed content: recent kept Moments + active/present Journeys. Never blank.
- No feed/dialog toggle — the center is always a dialog. The feed lives in Chronicle.

## ⚠️ Notes & ToDo
- [ ] Default lead agent + keeper seed on domain create (Chronicle — remainder of Step 1.2).
- [ ] Set `primaryDomainId` when user's first personal domain is created.
- [ ] Domain Board session resumption — allow users to return to a prior Domain session via Chronicle trail.

## 📆 Update Log

### 2026-06-27 — Step 1.2 (partial): Add domain from switcher
- `DomainAddPanel` + `POST /api/domains`; navigates to new slug on success.
- Picker ink: fixed light-on-dark tokens in `domainSwitcherTheme.ts`.

### 2026-06-27 — Switcher: user domains + readable text
- Fetch switched from `GET /api/domains` (all domains) to `GET /api/domains/my` (owned + permitted only).
- Client filters inactive / soft-deleted rows.
- `DomainSwitcher` ink/border tokens fixed for dark board theme (`--theme-ink-*-color`, `hsl(var(--theme-border-soft))`).

### 2026-06-27 — Domain switcher overlay + stale cache fix
- Switcher/status panels render via `createPortal(document.body)` with `position: fixed` so the dropdown is not clipped by board layout.
- API `getUserDomains` heals stale Redis lists when owned domains are missing from cache (repair-script path).

### 2026-06-27 — Step 1.1: Real domains in DomainSwitcher
- Removed `MOCK_DOMAINS` from `DomainBoard.tsx`.
- Added `domainSwitcherData.ts` — live fetch from `GET /api/domains` (`domains` array from paginated response). Uses same-origin fetch on localhost so Vite `/api` proxy is used during local dev.
- Loading, empty, and error states render in `DomainBoard` before `DomainSwitcher` opens (switcher UI unchanged).
- Domain selection navigates to `/d/:slug/board?board=domain` so Chronicle reloads via `DomainFocusPresence`.

### 2026-05-09 — Domain Board center correction + useAgentDialog
- Removed `centerMode` state, `FeedFrame`, Feed/Dialog toggle, and `/api/domains/:id/kip/designer` route from Domain Board.
- Created `DomainBoardConversation.tsx` — wires `useAgentDialog({ mode: "domain", agentSlug: "kip" })` for persisted sessions.
- Center is now a standard dialog panel; sessions created and resumable like IDE/Agent boards.
- Chronicle (`UniversalViewPanel`) now receives `domainSlug` prop enabling domain feed (recent Moments + active Journeys) at idle state — never blank.
- 2026-04-28 (Prompt 5): Added `activeJourneyId` state. When "Journeys" frame is selected in the left nav, the board fetches `/api/public/:domainSlug/journeys`, picks the first Journey, and renders `KeeperJourneyPanel` in the right panel (full-panel, no outer header). `handleMomentSelectFromJourney` fetches the moment by ID when a Moment row is tapped in `KeeperJourneyPanel`, then switches the right panel to `MomentDetailPanel`. Existing Feed `onMomentSelect` and `MomentDetailPanel` behavior unchanged.
- 2026-04-27 (Prompt 4): Added `centerMode: 'feed' | 'dialog'` state (default: `'feed'`). Domain Board now launches in Feed Mode (The Commons — FeedFrame in Zone 2, no Banner). Sending a message triggers a transition to Dialog Mode (The Workshop — DialogueMessageList in Zone 2, Banner with ← Commons affordance). `onReturnToFeed` prop on `KeeperDialogFrame` wires the back button to return to Feed Mode. Trigger B (Keeper selection) is pending — no `activeKeeper` state exists in DomainBoard yet.
- 2026-04-27 (Prompt 3): `DomainBoard` restructured. Removed separate `FeedFrame` block and fixed-height (300px) `KeeperDialogFrame`. Now uses a single `KeeperDialogFrame` with `dialogContent={<FeedFrame .../>}` filling the full remaining height below `DomainBanner`. Removed `background: "#fefdfb"` from center panel so Board atmosphere is visible. Feed scrolls inside `.dialog-message-surface` with 85% gradient dissolve.

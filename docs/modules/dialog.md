# Dialog Components

## 📌 Purpose
Shared conversation shell used across IDE Board, Agent Board, and Domain Board. Implements the four-zone atmospheric layout: Banner → Chat Zone → Thinking Space → Composer Zone.

## 🧱 Key Files
- `KeeperDialogFrame.tsx` — Main shell component. Assembles four sibling flex zones: Banner (Zone 1), Chat Zone (Zone 2), Thinking Space (new), and Composer Zone (Zone 3).

## 🔄 Data & Behavior

### Named Surfaces — Opacity Hierarchy (most opaque → most transparent)
| Surface | CSS class | Opacity | Purpose |
|---|---|---|---|
| **Banner** | `.dialog-header-banner` | 0.88 | Orientation — readable, grounded |
| **Composer** | `.dialog-bottom-zone` | 0.92 | Where the user speaks — intentional |
| **Chat Zone** | `.dialog-message-surface` | 0.52 | Atmosphere breathes through |
| **Thinking Space** | `.dialog-think-space` | 0.16 | Nearly atmosphere — the breath between |

### Zone Behaviour
- **Zone 1 (Banner)**: Frosted breadcrumb — `keeperName`, `journeyName`, `pathName`, `pathPrelude`. Hidden in `mode === 'feed'`.
- **Zone 2 (Chat Zone)**: Scrollable message surface. Renders `DialogueMessageList` by default, or `dialogContent` override. Mask dissolves oldest messages at the top into the atmosphere. Message depth cascade applied via `nth-last-child` CSS selectors — no JavaScript.
- **Thinking Space**: Fixed-height (52px) sibling zone between chat and composer. Shows `· · ·` idle placeholder; breathes/pulses when `isSending`. Never resizes. Only rendered in dialog mode.
- **Zone 3 (Composer Zone)**: Contains `AgentComposer` (input field + toolbar) then `IntegratedServicesBar` below it (barely-there service status). Service bar at floor, input field as center of gravity.

### Message Depth Cascade
CSS `nth-last-child` selectors in `index.css` fade and scale messages by age:
- Most recent pair: opacity 1, scale 1
- One exchange back: opacity 0.68, scale 0.97
- Two exchanges back: opacity 0.35, scale 0.94
- Everything older: opacity 0.12, scale 0.92

All transitions use `0.4s ease`. No JavaScript required.

### Sibling Structure Invariant
All four zones are direct flex children of `.keeper-dialog-frame`. The thinking space is **not** nested inside the composer — each surface's transparency is absolute against the atmosphere, not stacked.

- Auto-scroll to bottom fires on message changes; disabled in feed mode or when `dialogContent` is in use.
- CSS classes live in `apps/web/src/index.css` under the `KeeperDialogFrame` section.

## ⚠️ Notes & ToDo
- [ ] `dialogContent` replaces the full Zone 2 content — if messages from a dialogContent-mode board need to display, a separate overlay or slot mechanism would be needed.
- [ ] TODO: Verify that `pathPrelude` truncation in `.dialog-prelude` (ellipsis) works correctly at all breakpoints.
- [ ] When `isSending` is true, `DialogueMessageList` may render its own thinking indicator inside Zone 2. This coexists with the thinking space pulse — both are intentional at this stage.

## 📆 Update Log
- 2026-04-30 (Dialog Frame Surface Design): Overhauled surface system. Four named surfaces with explicit opacity hierarchy. Added `.dialog-think-space` as a flex sibling between Zone 2 and Zone 3 — fixed 52px height, opacity 0.16, never resizes. Chat zone opacity reduced 0.85→0.52 with top-dissolve mask. Composer zone (`dialog-bottom-zone`) switched to `--theme-surface-paper` token at 0.92. Message depth cascade added via `nth-last-child` CSS selectors (three depth levels: 0.68/0.97, 0.35/0.94, 0.12/0.92). `IntegratedServicesBar` moved below `AgentComposer` within Zone 3 (service bar now at floor). Inner message container bottom padding reduced `pb-32→pb-4`. All values use theme tokens — no hardcoded hex.
- 2026-04-27 (Prompt 4): Added `mode?: 'feed' | 'dialog'`, `feedContent?: React.ReactNode`, and `onReturnToFeed?: () => void` props. Zone 1 (Banner) now hidden when `mode === 'feed'`; Zone 2 renders `feedContent` in feed mode and `DialogueMessageList` (or `dialogContent`) in dialog mode. Auto-scroll suppressed in feed mode. Back affordance (← Commons button, `.dialog-back-to-feed`) renders in Banner when `onReturnToFeed` is provided and mode is dialog. Default remains `'dialog'` — IDE Board and Agent Board unaffected.
- 2026-04-27 (Prompt 3): `KeeperDialogFrame` — Added `dialogContent?: React.ReactNode` prop. When provided, Zone 2 renders `dialogContent` instead of `DialogueMessageList`. Auto-scroll skipped when `dialogContent` is active. Used by Domain Board to host `FeedFrame` inside the dialog shell.

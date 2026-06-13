# Dialog Components

## 📌 Purpose
Shared conversation shell used across IDE Board, Agent Board, and Domain Board. Implements the four-zone atmospheric layout: Banner → Chat Zone → Thinking Space → Composer Zone.

## 🧱 Key Files
- `KeeperDialogFrame.tsx` — Main shell component. Assembles four sibling flex zones: Banner (Zone 1), Chat Zone (Zone 2), Thinking Space (new), and Composer Zone (Zone 3).
- `DialogDiagStream.tsx` — Diag thinking stream: captures console output, board-definition snapshot, copy.
- `DialogScrollRail.tsx` — Overlay scroll thumb for Zone 2.

## 🔄 Data & Behavior

### Named Surfaces — Opacity Hierarchy (most opaque → most transparent)
| Surface | CSS class | Opacity | Blur | Purpose |
|---|---|---|---|---|
| **Banner** | `.dialog-header-banner` | 0.55 | 16px | Orientation — frosted strip, warm secondary text |
| **Composer** | `.dialog-bottom-zone` | 0.82 | 20px | Where the user speaks — input field lighter still |
| **Thinking Space** | `.dialog-think-space` | transparent | — | Warm muted italic placeholder; no panel bg |
| **Chat Zone** | `.dialog-message-surface` | transparent | — | Open atmosphere; top + bottom mask dissolve |

Zone 2 is wrapped in `.dialog-message-zone` (`flex:1, min-height:0, position:relative, overflow:hidden`) so an absolute-positioned gradient dissolve div can overlay the bottom 80px of the scroll area without scrolling with the content.

### Zone Behaviour
- **Zone 1 (Banner)**: Frosted breadcrumb — `keeperName`, `journeyName`, `pathName`, `pathPrelude`. Hidden in `mode === 'feed'`.
- **Zone 2 (Chat Zone)**: Scrollable message surface. Renders `DialogueMessageList` by default, or `dialogContent` override. Mask dissolves oldest messages at the top into the atmosphere. Message depth cascade applied via `nth-last-child` CSS selectors — no JavaScript.
- **Thinking Space**: Fixed-height sibling zone between chat and composer. When Kip is thinking, the **Diag** stream can open from the Horizon — scrolls captured `console.log` output with Copy and Board Definition sync hints. Agent thinking status renders on the **Horizon** (top of the fade gradient), not in the stream label row.
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
- [ ] When `isSending` is true, thinking status renders on the Horizon (`.dialog-horizon-status`) inside Zone 2; `DialogueMessageList` suppresses its in-list indicator via `horizonThinking`.

## 📆 Update Log
- 2026-06-12: Thinking Space **Diag** stream — Horizon toggle while `isSending`; `DialogDiagStream` shows captured console output with Copy; board-definition snapshot from `[UniversalNavPanel]` logs; capture via `lib/consoleDiagCapture.ts`.
- 2026-06-10: Moved agent thinking indicator onto the Horizon gradient band (`.dialog-horizon-band`), inset inside the fade — not above it. Message landing line stays at the top edge of the band; Thinking Space cleared below.
- 2026-05-30: Rendr treatment correction — opacity table updated; chat zone open atmosphere; composer 0.82 / banner 0.55; bottom scroll mask 70%→transparent; gradient dissolve overlay softened.
- 2026-05-26 — UI polish: frosted glass Dialog shell (warm semi-transparent surfaces, stronger backdrop blur); gradient dissolve softened; message list background transparent.
- 2026-05-01 (Sprint Item 1 — Dialog Frame Surface Design): Refined opacity hierarchy to spec. Banner: 0.88→0.85, blur 16px→12px (md), token corrected to `--theme-surface-paper`. Chat zone: 0.52→0.12, blur 10px→2px. Thinking space: 0.16→0.30. Composer: 0.92→0.60, blur 20px→8px. Added gradient dissolve at bottom of Zone 2 (80px, `transparent → --theme-surface-paper/0.60`). Zone 2 now wrapped in `.dialog-message-zone` (relative/flex:1/overflow:hidden) so the dissolve overlays the visible scroll area without scrolling with content. IDEBoard and DomainBoard center panels confirmed transparent — no changes required.
- 2026-04-30 (Dialog Frame Surface Design): Overhauled surface system. Four named surfaces with explicit opacity hierarchy. Added `.dialog-think-space` as a flex sibling between Zone 2 and Zone 3 — fixed 52px height, opacity 0.16, never resizes. Chat zone opacity reduced 0.85→0.52 with top-dissolve mask. Composer zone (`dialog-bottom-zone`) switched to `--theme-surface-paper` token at 0.92. Message depth cascade added via `nth-last-child` CSS selectors (three depth levels: 0.68/0.97, 0.35/0.94, 0.12/0.92). `IntegratedServicesBar` moved below `AgentComposer` within Zone 3 (service bar now at floor). Inner message container bottom padding reduced `pb-32→pb-4`. All values use theme tokens — no hardcoded hex.
- 2026-04-27 (Prompt 4): Added `mode?: 'feed' | 'dialog'`, `feedContent?: React.ReactNode`, and `onReturnToFeed?: () => void` props. Zone 1 (Banner) now hidden when `mode === 'feed'`; Zone 2 renders `feedContent` in feed mode and `DialogueMessageList` (or `dialogContent`) in dialog mode. Auto-scroll suppressed in feed mode. Back affordance (← Commons button, `.dialog-back-to-feed`) renders in Banner when `onReturnToFeed` is provided and mode is dialog. Default remains `'dialog'` — IDE Board and Agent Board unaffected.
- 2026-04-27 (Prompt 3): `KeeperDialogFrame` — Added `dialogContent?: React.ReactNode` prop. When provided, Zone 2 renders `dialogContent` instead of `DialogueMessageList`. Auto-scroll skipped when `dialogContent` is active. Used by Domain Board to host `FeedFrame` inside the dialog shell.

# Dialog Components

## 📌 Purpose
Shared conversation shell used across IDE Board, Agent Board, and Domain Board. Implements the four-zone atmospheric layout: Banner → Chat Zone → Thinking Space → Composer Zone.

## 🧱 Key Files
- `KeeperDialogFrame.tsx` — Main shell component. Assembles four sibling flex zones: Banner (Zone 1), Chat Zone (Zone 2), Thinking Space (new), and Composer Zone (Zone 3).

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
- 2026-05-30: Rendr treatment correction — opacity table updated; chat zone open atmosphere; composer 0.82 / banner 0.55; bottom scroll mask 70%→transparent; gradient dissolve overlay softened.
- 2026-05-26 — UI polish: frosted glass Dialog shell (warm semi-transparent surfaces, stronger backdrop blur); gradient dissolve softened; message list background transparent.

# Dialog Components

## 📌 Purpose
Shared conversation shell used across IDE Board, Agent Board, and Domain Board. Product surfaces: **Header Bar** → **Dialog Space** → **Composer** (with **Horizon** + **Thinking Space** when working).

## 🧱 Key Files
- `KeeperDialogFrame.tsx` — Main shell. Assembles Header Bar, Dialog Space, Thinking Space, and Composer input floor.
- `DialogScrollHint.tsx` — “Latest” pill above the Horizon when the user scrolls up.
- `DialogUploadStream.tsx` — Pending uploads in Thinking Space (Library item created at clip; sent with next message).
- `DialogDiagStream.tsx` — Diag thinking stream: captures console output, board-definition snapshot, copy.
- `DialogScrollRail.tsx` — Overlay scroll thumb for Dialog Space.

## 🔄 Data & Behavior

### Canonical vocabulary (product ↔ code)

| Product name | Role | CSS / attribute |
|---|---|---|
| **Header Bar** | Expandable breadcrumb + session meta | `.dialog-header-banner` |
| **Dialog Space** | Messages and responses scroll here, **above** the Horizon | `.dialog-message-zone` / `.dialog-message-surface` |
| **Horizon** | Gradient band at the bottom of Dialog Space; when working, shows agent status + stream toolbar (Diag) | `.dialog-horizon-band`, `.dialog-horizon-status` |
| **Thinking Space** | Scrollable detail below Horizon — agent steps, Diag log, future upload previews | `.dialog-think-space` |
| **Composer** | User input floor; two states on `.keeper-dialog-frame` | `data-composer-state="composing"` \| `"working"` |
| **Composing** | Input + toolbar only; Thinking Space idle | default state |
| **Working** | Horizon active + Thinking Space streams + input (disabled while sending) | `isSending === true` |

Horizon is positioned at the bottom of Dialog Space (for scroll math). Thinking Space and the input field sit below as siblings — grouped **logically** as Composer when working.

### Named Surfaces — Opacity Hierarchy (most opaque → most transparent)
| Surface | CSS class | Opacity | Blur | Purpose |
|---|---|---|---|---|
| **Header Bar** | `.dialog-header-banner` | 0.55 | 16px | Orientation — frosted strip, warm secondary text |
| **Composer** | `.dialog-bottom-zone` | 0.82 | 20px | Where the user speaks — input field lighter still |
| **Thinking Space** | `.dialog-think-space` | transparent | — | Agent steps, Diag stream, future upload previews |
| **Dialog Space** | `.dialog-message-surface` | transparent | — | Open atmosphere; top + bottom mask dissolve |

Zone 2 is wrapped in `.dialog-message-zone` (`flex:1, min-height:0, position:relative, overflow:hidden`) so an absolute-positioned gradient dissolve div can overlay the bottom 80px of the scroll area without scrolling with the content.

### Surface behaviour
- **Header Bar**: Frosted breadcrumb — `keeperName`, `journeyName`, `pathName`, `pathPrelude`. Hidden in `mode === 'feed'`. Chevron expands session meta.
- **Dialog Space**: Scrollable messages **above** the Horizon. Renders `DialogueMessageList` by default. Long responses fill the space between Header Bar and Horizon, then scroll. `DialogScrollHint` offers “Latest” when scrolled up.
- **Horizon**: Gradient dissolve at the Composer edge. When working (`isSending`), shows `{agentName} is thinking…` and stream toggles (Diag). Summarizes what Thinking Space streams in detail.
- **Thinking Space**: Between Dialog Space and input. **Uploads** appear here after clip (Library item created immediately; removed on send). Diag stream when working. Expands with uploads (`--uploads`).
- **Composer**: `AgentComposer` input + toolbar; `IntegratedServicesBar` below on IDE Board.

### Readability
Board scope (`.keeper-board-scope`) bumps message body to 17px and composer input to match. Global `data-density` on `<html>` (`compact` | `default` | `comfortable`) exists for Design Board; a user-facing **Readable** setting for all boards is TODO.

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
- [x] Upload flow: files in Thinking Space; Library item at pick; attach on send.
- [ ] User-facing **Readable** density toggle on boards (wire `keeper-density` beyond Design Board).
- [ ] Additional Horizon streams beyond Diag (agent chain-of-thought summaries).
- [ ] `dialogContent` replaces the full Dialog Space content — separate slot if messages needed alongside.
- [ ] TODO: Verify that `pathPrelude` truncation in `.dialog-prelude` (ellipsis) works correctly at all breakpoints.
- [ ] When `isSending` is true, thinking status renders on the Horizon inside Dialog Space; `DialogueMessageList` suppresses its in-list indicator via `horizonThinking`.

## 📆 Update Log
- 2026-06-17: Dialog column full frame width; thinking/composer/services share `.dialog-column` edges. Upload tiles (88px previews), progress strip, idle attach hint removed. Tools bar uses `dialog-column`.
- 2026-06-17: Upload → Thinking Space (`DialogUploadStream`); clip adds Library item + stages file until send; composer input grows when uploads present.
- 2026-06-17: Canonical vocabulary (Header Bar, Dialog Space, Composer states, Horizon, Thinking Space). `DialogScrollHint` “Latest” pill above Horizon. Board-scope readability: 17px composer input, larger Horizon status. `data-composer-state` on shell.
- 2026-06-12: Thinking Space **Diag** stream — Horizon toggle while `isSending`; `DialogDiagStream` shows captured console output with Copy; board-definition snapshot from `[UniversalNavPanel]` logs; capture via `lib/consoleDiagCapture.ts`.
- 2026-06-10: Moved agent thinking indicator onto the Horizon gradient band (`.dialog-horizon-band`), inset inside the fade — not above it. Message landing line stays at the top edge of the band; Thinking Space cleared below.
- 2026-05-30: Rendr treatment correction — opacity table updated; chat zone open atmosphere; composer 0.82 / banner 0.55; bottom scroll mask 70%→transparent; gradient dissolve overlay softened.
- 2026-05-26 — UI polish: frosted glass Dialog shell (warm semi-transparent surfaces, stronger backdrop blur); gradient dissolve softened; message list background transparent.
- 2026-05-01 (Sprint Item 1 — Dialog Frame Surface Design): Refined opacity hierarchy to spec. Banner: 0.88→0.85, blur 16px→12px (md), token corrected to `--theme-surface-paper`. Chat zone: 0.52→0.12, blur 10px→2px. Thinking space: 0.16→0.30. Composer: 0.92→0.60, blur 20px→8px. Added gradient dissolve at bottom of Zone 2 (80px, `transparent → --theme-surface-paper/0.60`). Zone 2 now wrapped in `.dialog-message-zone` (relative/flex:1/overflow:hidden) so the dissolve overlays the visible scroll area without scrolling with content. IDEBoard and DomainBoard center panels confirmed transparent — no changes required.
- 2026-04-30 (Dialog Frame Surface Design): Overhauled surface system. Four named surfaces with explicit opacity hierarchy. Added `.dialog-think-space` as a flex sibling between Zone 2 and Zone 3 — fixed 52px height, opacity 0.16, never resizes. Chat zone opacity reduced 0.85→0.52 with top-dissolve mask. Composer zone (`dialog-bottom-zone`) switched to `--theme-surface-paper` token at 0.92. Message depth cascade added via `nth-last-child` CSS selectors (three depth levels: 0.68/0.97, 0.35/0.94, 0.12/0.92). `IntegratedServicesBar` moved below `AgentComposer` within Zone 3 (service bar now at floor). Inner message container bottom padding reduced `pb-32→pb-4`. All values use theme tokens — no hardcoded hex.
- 2026-04-27 (Prompt 4): Added `mode?: 'feed' | 'dialog'`, `feedContent?: React.ReactNode`, and `onReturnToFeed?: () => void` props. Zone 1 (Banner) now hidden when `mode === 'feed'`; Zone 2 renders `feedContent` in feed mode and `DialogueMessageList` (or `dialogContent`) in dialog mode. Auto-scroll suppressed in feed mode. Back affordance (← Commons button, `.dialog-back-to-feed`) renders in Banner when `onReturnToFeed` is provided and mode is dialog. Default remains `'dialog'` — IDE Board and Agent Board unaffected.
- 2026-04-27 (Prompt 3): `KeeperDialogFrame` — Added `dialogContent?: React.ReactNode` prop. When provided, Zone 2 renders `dialogContent` instead of `DialogueMessageList`. Auto-scroll skipped when `dialogContent` is active. Used by Domain Board to host `FeedFrame` inside the dialog shell.

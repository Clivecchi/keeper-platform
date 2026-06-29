# Dialog Components

## 📌 Purpose
Shared conversation shell used across IDE Board, Agent Board, and Domain Board. Product surfaces: **Header Bar** → **Dialog Space** → **Broadcast Strip** (when working) → **Composer**.

## 🧱 Key Files
- `KeeperDialogFrame.tsx` — Main shell. Assembles Header Bar, Dialog Space, Broadcast Strip, and Composer input floor.
- `DialogBroadcastStrip.tsx` — Unified working surface: live beat + prior-beat ticker (CRT lower third).
- `DialogScrollHint.tsx` — “Latest” pill above the Broadcast Strip when the user scrolls up.
- `DialogUploadStream.tsx` — Pending uploads in Broadcast Strip (Library item created at clip; sent with next message).
- `DialogDebugOverlay.tsx` — Client console log panel (overlay over Broadcast Strip + Composer). Copy + close.
- `DialogDiagStream.tsx` — Legacy inline diag stream (superseded by overlay).
- `ComposerDebugToolbar.tsx` — Right-aligned composer footer debug icon; toggles client console log panel on demand.
- `DialogThinkStream.tsx` — Deprecated re-export of `DialogBroadcastStrip`.
- `DialogScrollRail.tsx` — Overlay scroll thumb for Dialog Space.

## 🔄 Data & Behavior

### Canonical vocabulary (product ↔ code)

| Product name | Role | CSS / attribute |
|---|---|---|
| **Header Bar** | Expandable breadcrumb + session meta | `.dialog-header-banner` |
| **Dialog Space** | Messages scroll here, above the dissolve | `.dialog-message-zone` / `.dialog-message-surface` |
| **Horizon dissolve** | Gradient fade at Dialog Space floor (no live text) | `.dialog-horizon-band`, `.dialog-fade-overlay` |
| **Broadcast Strip** | Unified working surface — live beat + ticker; upload previews when staging | `.dialog-broadcast-strip` |
| **Composer** | User input floor; two states on `.keeper-dialog-frame` | `data-composer-state="composing"` \| `"working"` |
| **Composing** | Input + optional post-run summary; Broadcast Strip collapsed | default state |
| **Working** | Broadcast Strip expanded + input (disabled while sending) | `isSending === true` |

While sending: one Broadcast Strip carries the live beat and prior story beats. After the reply, the strip collapses and a dialogic one-liner (`.dialog-composer-horizon`) sits directly above the input.

### Named Surfaces — Opacity Hierarchy (most opaque → most transparent)
| Surface | CSS class | Opacity | Blur | Purpose |
|---|---|---|---|---|
| **Header Bar** | `.dialog-header-banner` | 0.55 | 16px | Orientation — frosted strip, warm secondary text |
| **Composer** | `.dialog-bottom-zone` | 0.82 | 20px | Where the user speaks — input field lighter still |
| **Broadcast Strip** | `.dialog-broadcast-strip` | 0.58→0.72 gradient | scanlines | Live beat + ticker while working; uploads when staging |
| **Dialog Space** | `.dialog-message-surface` | transparent | — | Open atmosphere; top + bottom mask dissolve |

Zone 2 is wrapped in `.dialog-message-zone` (`flex:1, min-height:0, position:relative, overflow:hidden`) so an absolute-positioned gradient dissolve div can overlay the bottom 80px of the scroll area without scrolling with the content.

### Surface behaviour
- **Header Bar**: Frosted breadcrumb — `keeperName`, `journeyName`, `pathName`, `pathPrelude`. Hidden in `mode === 'feed'`. Chevron expands session meta.
- **Dialog Space**: Scrollable messages above the dissolve. Top + bottom **mask fade** softens edges. Messages dim slightly while working. `DialogScrollHint` offers “Latest” when scrolled up.
- **Broadcast Strip (working)**: CRT lower third — phosphor live line (`▶` marker + cursor) + prior beats as ellipsis ticker. Collapses after reply.
- **Broadcast Strip (uploads)**: Staged attachment tiles while composing.
- **Post-run summary**: One-line dialogic bridge (`.dialog-composer-horizon`) atop Composer — ends with `…` via `dialogicRunSummary()`.
- **Composer**: `AgentComposer` input + toolbar; ephemeral **Pasted** supporting-document tiles above the input; footer row with Tools/Services (left, IDE Board) and **Debug** icon (right, always visible in dialog mode).

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
All zones are direct flex children of `.keeper-dialog-frame`. The Broadcast Strip sits between Dialog Space and Composer — not nested inside either.

- Auto-scroll to bottom fires on message changes; disabled in feed mode or when `dialogContent` is in use.
- CSS classes live in `apps/web/src/index.css` under the `KeeperDialogFrame` section.

## ⚠️ Notes & ToDo
- [x] Upload flow: files in Broadcast Strip; Library item at pick; attach on send.
- [ ] User-facing **Readable** density toggle on boards (wire `keeper-density` beyond Design Board).
- [ ] Additional Broadcast Strip streams beyond Debug (live server-side phase events).
- [ ] `dialogContent` replaces the full Dialog Space content — separate slot if messages needed alongside.
- [ ] TODO: Verify that `pathPrelude` truncation in `.dialog-prelude` (ellipsis) works correctly at all breakpoints.
- [x] When `isSending` is true, working status renders in Broadcast Strip; `DialogueMessageList` suppresses its in-list indicator via `horizonThinking`.

## 📆 Update Log
- 2026-06-28: **Broadcast Strip** — merged Horizon live status + Thinking Space into `.dialog-broadcast-strip` (phosphor live line, ticker, CRT scanlines). Horizon band is dissolve-only; post-run summary unchanged on composer.
- 2026-06-27: **Debug overlay** — bug icon opens `DialogDebugOverlay` over Horizon/Thinking/Composer (Copy + X). Logs no longer cleared on send; capture re-wraps console after HMR and includes window errors.
- 2026-06-27: **Supporting documents** — large paste no longer fills the input or Thinking Space; `AgentComposer` shows Pasted tiles in composer; Library commit skips paste items.
- 2026-06-27: **Debug always on** — `ComposerDebugToolbar` visible whenever dialog mode is active (not gated on `isSending`). Diag panel opens on demand; logs accumulate client-side until a new agent send clears the buffer. Panel stays open after the reply.
- 2026-06-27: **Debug toolbar** — Diag toggle moved from Horizon to right-aligned `ComposerDebugToolbar` in `.dialog-composer-footer` (below composer). Toggles `DialogDiagStream` + Copy in Thinking Space. Footer shows on IDE Board (Tools/Services) and on all dialog boards (debug-only row when no service bar).
- 2026-06-26: **Diag button fix** — console capture installs on frame mount; Diag toggle always visible while `isSending` (not gated on horizon summary text); CSS removes parent `pointer-events: none` block on horizon streams so the button is clickable; Diag panel expands in Thinking Space on toggle.
- 2026-06-26: Working story composition — run trace labels become narrative sentences (`stepLabelToStorySentence`, `composeHorizonBeat`, `composeThinkingStoryBody`). Horizon carries the live beat; Thinking Space shows `{agent} is working` + prior beats as prose (no Run Trace header or numbered steps). Post-run summary ends with `…`. In-list “is thinking…” suppressed when `horizonThinking` is set.
- 2026-06-22: Thinking Space **Run trace** — renamed from "Chain of thought"; keeps steps after send; maps `actionResults` into trace lines via `dialogThinking.ts`.
- 2026-06-17: Composer clip stages blob only; Library commit on send. Horizon shows "Uploading…". Taller input; composer + Tools share one `.dialog-bottom-stack` column.
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

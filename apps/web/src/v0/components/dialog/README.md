# Dialog Components

## 📌 Purpose
Shared conversation shell used across IDE Board, Agent Board, and Domain Board. Implements the three-zone layout from `Keeper_DialogFrame_Spec_v1.md` Path 8.

## 🧱 Key Files
- `KeeperDialogFrame.tsx` — Main shell component. Assembles Zone 1 (frosted header banner), Zone 2 (scrollable message surface with gradient dissolve), and Zone 3 (frosted bottom zone: optional service bar + composer).

## 🔄 Data & Behavior
- **Zone 1**: Frosted breadcrumb banner — shows `keeperName`, `journeyName`, `pathName`, and `pathPrelude`. Only renders when at least one field is provided.
- **Zone 2**: Scrollable message surface. By default renders `DialogueMessageList`. When `dialogContent` prop is provided, renders that instead (used by Domain Board to show the Feed inside the dialog shell).
- **Zone 3**: Frosted bottom zone. Renders optional `IntegratedServicesBar` (IDE Board only) and `AgentComposer`.
- Auto-scroll to bottom fires on message changes, disabled when `dialogContent` is in use.
- CSS classes (`keeper-dialog-frame`, `dialog-message-surface`, etc.) live in `apps/web/src/index.css`.

## ⚠️ Notes & ToDo
- [ ] `dialogContent` replaces the full Zone 2 content — if messages from a dialogContent-mode board need to display, a separate overlay or slot mechanism would be needed.
- [ ] TODO: Verify that `pathPrelude` truncation in `.dialog-prelude` (ellipsis) works correctly at all breakpoints.

## 📆 Update Log
- 2026-04-27 (Prompt 4): Added `mode?: 'feed' | 'dialog'`, `feedContent?: React.ReactNode`, and `onReturnToFeed?: () => void` props. Zone 1 (Banner) now hidden when `mode === 'feed'`; Zone 2 renders `feedContent` in feed mode and `DialogueMessageList` (or `dialogContent`) in dialog mode. Auto-scroll suppressed in feed mode. Back affordance (← Commons button, `.dialog-back-to-feed`) renders in Banner when `onReturnToFeed` is provided and mode is dialog. Default remains `'dialog'` — IDE Board and Agent Board unaffected.
- 2026-04-27 (Prompt 3): `KeeperDialogFrame` — Added `dialogContent?: React.ReactNode` prop. When provided, Zone 2 renders `dialogContent` instead of `DialogueMessageList`. Auto-scroll skipped when `dialogContent` is active. Used by Domain Board to host `FeedFrame` inside the dialog shell.

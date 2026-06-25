# Universal Mobile

## 📌 Purpose
**Universal Mobile** is the narrow-viewport shell for the **Domain Universal Board** — same backend and engagement pipeline as desktop, different layout patterns (tabs instead of Nav · Dialog · Chronicle).

This is not a separate app, not legacy frame routing, and not a parallel API surface.

## 🧱 Key Files
- `UniversalMobileShell.tsx` — tab shell + moment overlay + PWA prompt
- `hooks/useUniversalMobile.ts` — composes `UniversalBoardContext` + `UniversalMobileUIContext` + `V0Shell`
- `context/UniversalMobileUIContext.tsx` — mobile-only UI: tabs, Kip focus chip, World refresh, PWA
- `screens/WorldScreen.tsx` — kept moments stream with pull-to-refresh
- `screens/KeepScreen.tsx` — `moment.create` via `useBoardEngagement` + `ChronicleActPresence`
- `screens/JourneysScreen.tsx` — journey list (Nav parity)
- `screens/KipScreen.tsx` — Dialog parity: `useAgentDialog` + `KeeperDialogFrame`
- `screens/MomentDetailScreen.tsx` — moment presence: read, `moment.update`, emotifs, Ask Kip
- `hooks/useMobileSurface.ts` — routes to Universal Mobile when auth + narrow viewport
- `mobile-shell.css` — full-height layout; Kip composer pinned above tab bar
- `pwa/` — installability

## 🔄 Data & Behavior

### State ownership
| State | Owner |
|---|---|
| Active journey, moment selection | `UniversalBoardContext` + `FrameContext` |
| Domain slug/id/name, frame JSON | `V0Shell` |
| Tab, Kip focus chip, World refresh key, PWA prompt | `UniversalMobileUIContext` |
| Screens | `useUniversalMobile()` hook |

### Same as Universal Board (desktop)
- Workspace: `?board=domain` (auto on mobile)
- Keep / edit: `useBoardEngagement` → `/api/engagement/execute` + `ChronicleActPresence`
- Kip: `useAgentDialog` + `KeeperDialogFrame`
- Moment open/close: `onMomentSelect` / `onMomentClear`
- Active journey: `onSetActiveJourney` (persisted in `FrameContext`)

### Not used
- Legacy standalone frames (`?frame=*`)
- `MobileKeeperContext` (removed — was duplicating board state)
- Duplicate mobile-only active-journey localStorage (uses `FrameContext` keys)

## ⚠️ Notes & ToDo
- [ ] Phase 3: offline draft queue, push notifications, app store wrappers

## 📆 Update Log

### 2026-06-22 — Keeper turtle app icon
- Canonical source: `public/icons/keeper-app-icon.png` (cosmic turtle mark).
- Generated `favicon.ico`, PWA 192/512, maskable 512, and `apple-touch-icon` via `pnpm --filter keeper-web run generate:pwa-icons`.

### 2026-06-22 — Mobile Kip staged dialog (composing · thinking · response)
- Kip tab uses `dialogLayout="mobile-staged"`: full-screen composing, thinking reassurance, response with compact composer.
- Response toggle: **Text** (latest exchange) and **Chronicle** (action receipts via `MobileKipChronicleView`).

### 2026-06-22 — UniversalMobileShell + board context refactor
- Renamed `MobileKeeperShell` → `UniversalMobileShell`.
- Removed `MobileKeeperContext`; board state via `UniversalBoardContext`, UI via `UniversalMobileUIContext`.
- Added `useUniversalMobile()` compositor hook and `onMomentClear` on board actions.

### 2026-06-22 — Universal Mobile alignment
- Documented as Domain Board shell; mobile route strips legacy `?frame=`; `UniversalBoardProvider` wraps shell.

### 2026-06-22 — Phase 0–2
- PWA scaffold, tabs, Kip, edit, emotifs, pull-to-refresh.

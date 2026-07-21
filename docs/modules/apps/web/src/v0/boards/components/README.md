# Board Components

## 📌 Purpose
Shared UI pieces for Universal Board orchestration — composer instrument bars and related controls.

## 🧱 Key Files
- `BoardInstrumentsBar.tsx` — Shared director-mode Agents roster + invocation for Realm, Domain, Designer, and IDE (IDE wraps it inside `IntegratedServicesBar` with Services after).
- `BoardMobilePanelBar.tsx` — Bottom bar switching Nav · Dialog · Chronicle on narrow Realm Home (`/home`).

## 🔄 Data & Behavior
- Rendered in `KeeperDialogFrame` composer footer when `boardInstruments` is set (all director boards).
- `isDirector` chips always render distinctly (lead); other chips pin/unpin via `activeBoardInstrument`.
- Optional `trailing` (Realm access actions) and `after` (IDE Services) — presentation slots, not separate invocation UIs.
- Pinning sets `activeBoardInstrument` in `UniversalBoardContext` for director delegation; Chronicle stays on current focus.
- `BoardMobilePanelBar` is used by `UniversalBoard` when member board + viewport ≤767px — same three panels as desktop, one visible at a time.

## 📆 Update Log

### 2026-07-20 — Director-mode unification
- `BoardInstrumentsBar` wins as the single agent-invocation presentation for every `dialogOrchestration: "director"` board.
- Added `trailing` / `after` slots; stronger director chip border; Realm + IDE consume this bar (IDE via `IntegratedServicesBar` composition).

### 2026-07-12 — Phase 1b: all member boards
- `BoardMobilePanelBar` used for Domain + Realm at ≤767px (not only `/home`).

### 2026-07-03 — Domain director agent surfacing
- Domain board: domain lead agent chip on composer toolbar (× returns to Agents bar); Kip on footer as always-invoked director collaborator.
- Lead agent pinned for delegation by default on Domain board load.
- `isDirector` chips always show invoked styling for the director (Kip).

### 2026-06-28 — Composer instrument pin does not open Chronicle
- Domain + IDE director mode: pinning an agent in composer only sets `activeBoardInstrument` — no Chronicle navigation.
- [x] Merged IDE agent chips into this bar (2026-07-20) — Services remain IDE-only `after` content.

## 📆 Update Log

### 2026-06-28 — BoardInstrumentsBar
- Added for Domain board director mode — domain lead agent chips (Ceox, etc.) beside composer debug control.

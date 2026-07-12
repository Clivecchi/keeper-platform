# Board Components

## 📌 Purpose
Shared UI pieces for Universal Board orchestration — composer instrument bars and related controls.

## 🧱 Key Files
- `BoardInstrumentsBar.tsx` — Pin/unpin agent chips for director-mode boards (Domain lead agents; IDE uses `IntegratedServicesBar` for Tools + Services).
- `BoardMobilePanelBar.tsx` — Bottom bar switching Nav · Dialog · Chronicle on narrow Realm Home (`/home`).

## 🔄 Data & Behavior
- Rendered in `KeeperDialogFrame` composer footer when `boardInstruments` is set (Domain board).
- Pinning sets `activeBoardInstrument` in `UniversalBoardContext` for director delegation; Chronicle stays on current focus (configure agents via Agent board Nav only).
- `BoardMobilePanelBar` is used by `UniversalBoard` when member board + viewport ≤767px — same three panels as desktop, one visible at a time.

## 📆 Update Log

### 2026-07-12 — Phase 1b: all member boards
- `BoardMobilePanelBar` used for Domain + Realm at ≤767px (not only `/home`).

### 2026-07-03 — Domain director agent surfacing
- Domain board: domain lead agent chip on composer toolbar (× returns to Agents bar); Kip on footer as always-invoked director collaborator.
- Lead agent pinned for delegation by default on Domain board load.
- `isDirector` chips always show invoked styling for the director (Kip).

### 2026-06-28 — Composer instrument pin does not open Chronicle
- Domain + IDE director mode: pinning an agent in composer only sets `activeBoardInstrument` — no Chronicle navigation.
- [ ] Consider merging Tool chips from `IntegratedServicesBar` into this bar for a single instrument primitive.

## 📆 Update Log

### 2026-06-28 — BoardInstrumentsBar
- Added for Domain board director mode — domain lead agent chips (Ceox, etc.) beside composer debug control.

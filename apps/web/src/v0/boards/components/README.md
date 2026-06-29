# Board Components

## 📌 Purpose
Shared UI pieces for Universal Board orchestration — composer instrument bars and related controls.

## 🧱 Key Files
- `BoardInstrumentsBar.tsx` — Pin/unpin agent chips for director-mode boards (Domain lead agents; IDE uses `IntegratedServicesBar` for Tools + Services).

## 🔄 Data & Behavior
- Rendered in `KeeperDialogFrame` composer footer when `boardInstruments` is set (Domain board).
- Pinning sets `activeBoardInstrument` in `UniversalBoardContext` for director delegation; Chronicle stays on current focus (configure agents via Agent board Nav only).

## 📆 Update Log

### 2026-06-28 — Composer instrument pin does not open Chronicle
- Domain + IDE director mode: pinning an agent in composer only sets `activeBoardInstrument` — no Chronicle navigation.
- [ ] Consider merging Tool chips from `IntegratedServicesBar` into this bar for a single instrument primitive.

## 📆 Update Log

### 2026-06-28 — BoardInstrumentsBar
- Added for Domain board director mode — domain lead agent chips (Ceox, etc.) beside composer debug control.

# Board Components

## 📌 Purpose
Shared UI pieces for Universal Board orchestration — composer instrument bars and related controls.

## 🧱 Key Files
- `DirectorCastHeader.tsx` — Header cast identity (Lead + available instruments); not click-to-invoke.
- `BoardInstrumentsBar.tsx` — Composer invoke bar: lead locked-on; instruments single-swap (IDE/Designer) or multi-select (Domain/Realm).
- `BoardMobilePanelBar.tsx` — Bottom bar switching Nav · Dialog · Chronicle on narrow Realm Home (`/home`).

## 🔄 Data & Behavior
- **Header** (`DirectorCastHeader`): who is Lead / available — manage chrome (Invite / Get key / Manage) may trail here.
- **Composer** (`BoardInstrumentsBar`): invoke/select only. Lead always engaged (`leadLocked`). Domain/Realm use `selectionMode: "multi"` + `activeBoardInstruments`; IDE/Designer keep single `activeBoardInstrument` swap.
- IDE wraps the composer bar inside `IntegratedServicesBar` with Services after.
- `BoardMobilePanelBar` is used by `UniversalBoard` when member board + viewport ≤767px — same three panels as desktop, one visible at a time.

## 📆 Update Log

### 2026-07-22 — Header cast + Domain/Realm multi-select
- Split: cast identity in header, invoke at composer (Chuck's wording).
- `instrumentMultiSelect` on Domain/Realm board defs; `activeBoardInstruments` set in context; IDE/Designer unchanged single-swap.
- Dialog stream stamps engaged collaborators (`With Cloud · Rendr`) on the lead reply — not fake sub-turns.

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

# Board Components

## 📌 Purpose
Shared UI pieces for Universal Board orchestration — composer instrument bars and related controls.

## 🧱 Key Files
- `DirectorCastHeader.tsx` — Header cast identity (Lead + available Cast); not click-to-invoke. Optional `cueingLabel` shows the Dialog cueing mode next to the eyebrow (e.g. "Cueing: Directed").
- `CastCueBar.tsx` — Composer invoke bar: lead locked-on; Cast members single-swap (IDE/Designer) or multi-select (Domain/Realm). `BoardInstrumentsBar.tsx` is now a deprecated thin re-export shim for untouched call sites.
- `BoardMobileChronicleOverlay.tsx` — Full Chronicle as overlay (replaces Chronicle tab).
- `BoardMobileNavDrawer.tsx` — Nav as left drawer (replaces Nav tab); account footer via `BoardMobileNavAccount`.
- `BoardMobileNavAccount.tsx` — Avatar / profile / sign-out at bottom of Nav drawer (relocated from Top Bar).
- `BoardMobilePanelBar.tsx` — **Deprecated for adaptive Domain/Realm** — three-tab bar retained in repo but no longer mounted by `UniversalBoard`.

## 🔄 Data & Behavior
- **Header** (`DirectorCastHeader`): who is Lead / available — manage chrome (Invite / Get key / Manage) may trail here; optional `cueingLabel` shows Dialog cueing mode. **Add** opens candidates from domains the user administers (`CastCandidate`); enable POSTs `homeDomainId` only — server resolves lead + Admin.
- **Composer** (`CastCueBar`): invoke/select only. Lead always engaged (`leadLocked`). Domain/Realm use `selectionMode: "multi"` + cued Cast slugs; IDE/Designer keep single active-Cast-member swap. Enabled cast members merge into the same chip list.
- IDE wraps the composer bar inside `IntegratedServicesBar` with Services after.
- **Adaptive mobile (≤767px Domain/Realm):** Dialog always primary; Nav = hamburger → drawer (account at bottom); Chronicle = Top Bar right icon → overlay. No bottom tab bar; Composer strip removed.

## 📆 Update Log

### 2026-08-09 — Chronicle full-screen takeover
- `BoardMobileChronicleOverlay` is edge-to-edge (no sheet inset / top radius / peeking Top Bar).
- Single **X** dismisses; TrailBar hidden inside overlay body so Chronicle isn’t double-chromed.
- Nested `.keeper-chronicle-panel` card chrome neutralized in `board-mobile.css`.

### 2026-08-04 — Top Bar Chronicle icon (retire Composer strip)
- Removed `BoardMobileChronicleStrip` and `aboveComposer` wiring.
- Chronicle opens from Top Bar right slot (`KeeperTopBar` → `onOpenChronicle` → overlay).
- Avatar / profile menu relocated to Nav drawer footer (`BoardMobileNavAccount`).

### 2026-08-03 — dialogCueing rename (Pass 1)
- `BoardInstrumentsBar.tsx` renamed to `CastCueBar.tsx`: `BoardInstrumentChip`→`CastMemberChip`, `InstrumentSelectionMode`→`CastCueSelectionMode`. Old path kept as a deprecated thin re-export shim (`export { CastCueBar as BoardInstrumentsBar, ... }`) so `UniversalConversation.tsx` keeps compiling until its own migration pass.
- `DirectorCastHeader.tsx`: imports `CastMemberChip` from `CastCueBar`; added optional `cueingLabel?: string` prop rendered next to the eyebrow.

### 2026-07-28 — Chronicle strip + Nav drawer (retire bottom tabs)
- Added `BoardMobileChronicleStrip`, `BoardMobileChronicleOverlay`, `BoardMobileNavDrawer`.
- `UniversalBoard` adaptive layout no longer mounts `BoardMobilePanelBar`.

### 2026-07-22 — Cross-domain cast Add
- `DirectorCastHeader`: **Add** + candidate picker; `onEnableCandidate(homeDomainId)`.
- Wired from `UniversalConversation` when `castBar` / `instrumentMultiSelect` + domain director mode; members/candidates from kip-dialogs cast APIs.

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

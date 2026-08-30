# Reach + Stage

## 📌 Purpose
Reach and Stage sit above Boards without becoming a fourth column. **Composer** is `AgentComposer` (the Turn instrument). On Stage, Composer is elevated above the table. **Reach** is a Composer tool that Chronicle renders.

## 🧱 Key Files
- `useKeeperStage.ts` — domain Stage load/save + Cast fetch (provider, no JSX)
- `ReachPalette.tsx` — Here / Cast / Recent / search
- `ReachChroniclePresence.tsx` (in `presence/`) — Chronicle surface for Reach
- `KeeperStageCanvas.tsx` — Stage table (presences only)
- `ComposerStageAgency.tsx` — compact Role / Direction inside elevated Composer
- `StageAgencyStrip.tsx` — Agency fields (`layout="composer"` | `"stage"`)
- `useBindStageDialog.ts` — auto-bind Talking in when a Dialog is already on Stage

## 🔄 Data & Behavior
- Composition persists on `Domain.settings.keeperStage` via `GET/PATCH /api/domains/:domainId/keeper-stage`.
- Stage references `agent | dialog | draft | journey | keeper | moment | library` by id. Selecting a presence sets Working on and keeps Talking in (Dialog select is the exception — it *is* the conversation).
- If a Dialog is already on Stage, Talking in binds to it. No card click required to speak.
- Contextual Agency is Stage-owned and edited in Composer. Base Agency stays on `kip_agents`.
- Reach opens from Composer (and the top-bar shortcut) and renders in Chronicle. Composer does not live in Chronicle.

## ⚠️ Notes & ToDo
- [ ] Theatre.js Stage project for choreography — after this proof
- [ ] Persistent Keeper Cast migration off boardCast defaults
- [ ] Confirm Finding the Plot is the first object Chuck wants seeded vs brought by hand
- [ ] Mobile drag/group/connector semantics — deliberately not built

## 📆 Update Log

### 2026-08-30 — Composer above Stage
- Composer is elevated above the Stage table. Agency moved into Composer. Reach moved into Chronicle. Overlay sheet removed.

### 2026-08-30 — Reach is not Composer
- Sheet, Stage empty state, and top-bar control are labeled **Reach**. Composer is `AgentComposer`; Reach opens from Composer and as a shortcut.

### 2026-08-30 — Stage room launch (Slice 1)
- Realm Nav now enters Stage. The canvas and reach sheet stay as stand-ins; the room change is the 15 / 70 / 15 curtains.

### 2026-08-22 — First vertical slice
- Added Composer reach sheet + Keeper Stage workspace over existing Universal Board.
- Persist composition; inject Stage into agent turns; preserve Talking in / Working on.

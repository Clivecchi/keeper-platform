# Reach + Stage

## 📌 Purpose
Reach and Stage sit above Boards without becoming a fourth column. **Composer** is `AgentComposer` (the Turn instrument). **Reach** (`KeeperComposerSheet`) is a Composer feature that finds and brings real Keeper objects onto Stage. Stage holds presence, not copies.

## 🧱 Key Files
- `useKeeperStage.ts` — domain Stage load/save + Cast fetch (provider, no JSX)
- `KeeperComposerSheet.tsx` — mobile-first reach palette (Here / Cast / Recent / search)
- `KeeperStageCanvas.tsx` — first Stage (`Keeper`) as workspace surface
- `StageAgencyStrip.tsx` — Base Agency + On this Stage role/direction

## 🔄 Data & Behavior
- Composition persists on `Domain.settings.keeperStage` via `GET/PATCH /api/domains/:domainId/keeper-stage`.
- Stage references `agent | dialog | draft | journey | keeper | moment | library` by id. Selecting a presence sets Working on and keeps Talking in (Dialog select is the exception — it *is* the conversation).
- Contextual Agency is Stage-owned. Base Agency stays on `kip_agents`.
- Dialog input floor is Composer (`AgentComposer`). This sheet is Reach, not Composer.
- Theatre.js Present sheets stay Chronicle motion. Stage positions live in Keeper JSON.

## ⚠️ Notes & ToDo
- [ ] Theatre.js Stage project for choreography — after this proof
- [ ] Persistent Keeper Cast migration off boardCast defaults
- [ ] Confirm Finding the Plot is the first object Chuck wants seeded vs brought by hand
- [ ] Mobile drag/group/connector semantics — deliberately not built

## 📆 Update Log

### 2026-08-30 — Reach is not Composer
- Sheet, Stage empty state, and top-bar control are labeled **Reach**. Composer is `AgentComposer`; Reach opens from Composer and as a shortcut.

### 2026-08-30 — Stage room launch (Slice 1)
- Realm Nav now enters Stage. The canvas and reach sheet stay as stand-ins; the room change is the 15 / 70 / 15 curtains.

### 2026-08-22 — First vertical slice
- Added Composer reach sheet + Keeper Stage workspace over existing Universal Board.
- Persist composition; inject Stage into agent turns; preserve Talking in / Working on.

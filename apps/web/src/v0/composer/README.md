# Keeper Composer + Stage

## 📌 Purpose
Reach (Composer) and spatial composition (Stage) that sit above Boards without becoming a fourth column. Composer finds and brings real Keeper objects. Stage holds presence, not copies.

## 🧱 Key Files
- `useKeeperStage.ts` — domain Stage load/save + Cast fetch (provider, no JSX)
- `KeeperComposerSheet.tsx` — mobile-first reach palette (Here / Cast / Recent / search)
- `KeeperStageCanvas.tsx` — first Stage (`Keeper`) as workspace surface
- `StageAgencyStrip.tsx` — Base Agency + On this Stage role/direction

## 🔄 Data & Behavior
- Composition persists on `Domain.settings.keeperStage` via `GET/PATCH /api/domains/:domainId/keeper-stage`.
- Stage references `agent | dialog | draft | journey | keeper | moment | library` by id. Selecting a presence sets Working on and keeps Talking in (Dialog select is the exception — it *is* the conversation).
- Contextual Agency is Stage-owned. Base Agency stays on `kip_agents`.
- Dialog input floor remains `AgentComposer`. This Composer is reach, not chat.
- Theatre.js Present sheets stay Chronicle motion. Stage positions live in Keeper JSON.

## ⚠️ Notes & ToDo
- [ ] Theatre.js Stage project for choreography — after this proof
- [ ] Persistent Keeper Cast migration off boardCast defaults
- [ ] Confirm Finding the Plot is the first object Chuck wants seeded vs brought by hand
- [ ] Mobile drag/group/connector semantics — deliberately not built

## 📆 Update Log

### 2026-08-22 — First vertical slice
- Added Composer reach sheet + Keeper Stage workspace over existing Universal Board.
- Persist composition; inject Stage into agent turns; preserve Talking in / Working on.

# Reach + Stage

## 📌 Purpose
Reach and Stage sit above Boards without becoming a fourth column. **Composer** is `AgentComposer` (the Turn instrument) at the bottom. On Stage it is a lectern over the table — same place, more function (Agency, Reach in Chronicle). Placed objects are **assets**. The Stage workspace is a **Frame-driven story** (presentation), not a second Document of Points.

## 🧱 Key Files
- `useKeeperStage.ts` — domain Stage load/save + Cast fetch (provider, no JSX)
- `ReachPalette.tsx` — Here / Cast / Recent / search
- `ReachChroniclePresence.tsx` (in `presence/`) — Chronicle surface for Reach
- `KeeperStageCanvas.tsx` — Stage table: **Now** beat (last Turn + reply) plus object cards
- `StageNowBeat.tsx` / `stageNowBeat.ts` — current story beat; not a Dialog transcript
- `ComposerStageAgency.tsx` — compact Role / Direction inside elevated Composer
- `StageAgencyStrip.tsx` — Agency fields (`layout="composer"` | `"stage"`)
- `useBindStageDialog.ts` — auto-bind Talking in when a Dialog is already on Stage

## 🔄 Data & Behavior
- Composition persists on `Domain.settings.keeperStage` via `GET/PATCH /api/domains/:domainId/keeper-stage`.
- Stage references `agent | dialog | draft | journey | keeper | moment | library` by id. Selecting a presence sets Working on and keeps Talking in (Dialog select is the exception — it *is* the conversation).
- If a Dialog is already on Stage, Talking in binds to it. No card click required to speak.
- **Now** is the first glimpse of that story: last human Turn and the Director reply after it. Composer Turns still write the Dialog thread. Stage does not replay the transcript.
- Objects on Stage are assets (wide context = everything placed; narrow = selected + what was just said). Documents, Drafts, attachments, Journeys, Moments, Library, Cast — whatever is placed is fair game.
- The emerging Stage story is **Frames for presentation**. Chronicle Points stay **discussion**. Config (same Chronicle Config family) is how this Stage tells — not built yet.
- Contextual Agency is Stage-owned and edited in Composer. Base Agency stays on `kip_agents`.
- Reach opens from Composer (and the top-bar shortcut) and renders in Chronicle. Composer does not live in Chronicle.
- Agent turns already receive the Stage roster via `buildKeeperStagePrompt`. They are asked where the story is going. There is no Stage-story Apply action yet.

## ⚠️ Notes & ToDo
- [ ] Rendr: Stage workspace as Frame story wrapped in Config (treatment before Theatre / SlideTypes)
- [ ] Stage Config in Chronicle (how this Stage tells) — `ChronicleConfigShell`, no fourth panel
- [ ] Agent story-arrange propose + human Apply (analog of Review & Reorganize; do not invent until Rendr shapes it)
- [ ] Theatre.js choreography — after the Frame story is real
- [ ] Persistent Keeper Cast migration off boardCast defaults
- [ ] Confirm Finding the Plot is the first object Chuck wants seeded vs brought by hand
- [ ] Mobile drag/group/connector semantics — deliberately not built

## 📆 Update Log

### 2026-08-30 — Stage story is Frames, not Points
- Chuck locked the destination: Workspace-on-Stage is a Frame-driven story wrapped in Config. Objects are assets. Agents pull the story together the way they Review & Reorganize a Document. Points stay Chronicle discussion. Now remains the first beat until that workshop is designed.
- Agent Stage prompt now names assets, wide/narrow context, and Frames vs Points. No new action.

### 2026-08-30 — Now beat on Stage
- Stage is not Dialog (no chat bubbles) and not objects only. Center card **Now** shows the last Turn and the room’s reply. Objects stay around it. Empty: “The story is not on yet. Speak from the lectern.” Waiting: “The room is answering…”
- First named Stage displays as **Keeper Stage**. Header Bar: Stage · Talking in · Working on.

### 2026-08-30 — Composer lectern on Stage
- Composer stays at the bottom and stands over the Stage (orchestra pit). Agency is in Composer. Reach is in Chronicle. Elevation is function, not a move to the top.

### 2026-08-30 — Reach is not Composer
- Sheet, Stage empty state, and top-bar control are labeled **Reach**. Composer is `AgentComposer`; Reach opens from Composer and as a shortcut.

### 2026-08-30 — Stage room launch (Slice 1)
- Realm Nav now enters Stage. The canvas and reach sheet stay as stand-ins; the room change is the 15 / 70 / 15 curtains.

### 2026-08-22 — First vertical slice
- Added Composer reach sheet + Keeper Stage workspace over existing Universal Board.
- Persist composition; inject Stage into agent turns; preserve Talking in / Working on.

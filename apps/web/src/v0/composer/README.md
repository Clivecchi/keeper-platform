# Reach + Stage

## 📌 Purpose
Reach and Stage sit above Boards without becoming a fourth column. **Composer** is `AgentComposer` (the Turn instrument) at the bottom. On Stage it is a lectern over the table — same place, more function (Agency, Reach in Chronicle). Placed objects are **assets**. The Stage workspace is a **Frame-driven story** (presentation), not a second Document of Points.

## 🧱 Key Files
- `useKeeperStage.ts` — domain Stage load/save + Cast fetch (provider, no JSX)
- `ReachPalette.tsx` — Here / Cast / Recent / search
- `ReachChroniclePresence.tsx` (in `presence/`) — Chronicle surface for Reach
- `KeeperStageCanvas.tsx` — Stage table: **Now** beat (last Turn + reply) plus object cards
- `StageNowBeat.tsx` / `stageNowBeat.ts` — last Turn + reply (feeds a text_slide, not a special surface)
- `StageFilmstrip.tsx` / `stageFilmstrip.ts` — story filmstrip; first Slide is the existing title
- `ComposerStageAgency.tsx` — compact Role / Direction inside elevated Composer
- `StageAgencyStrip.tsx` — Agency fields (`layout="composer"` | `"stage"`)
- `useBindStageDialog.ts` — auto-bind Talking in when a Dialog is already on Stage

## 🔄 Data & Behavior
- Composition persists on `Domain.settings.keeperStage` via `GET/PATCH /api/domains/:domainId/keeper-stage`.
- Stage references `agent | dialog | draft | journey | keeper | moment | library` by id. Selecting a presence sets Working on and keeps Talking in (Dialog select is the exception — it *is* the conversation).
- If a Dialog is already on Stage, Talking in binds to it. No card click required to speak.
- **Filmstrip:** Stage is a **Frame** (the room). The story is a strip of **Slides**. First Slide is the title that already exists (Talking in, else Keeper Stage). Current beat is a later `text_slide` — already named in the jsonframe spec. Now is not a special card type.
- Objects on Stage are assets (wide context = everything placed; narrow = selected + what was just said). Documents, Drafts, attachments, Journeys, Moments, Library, Cast — whatever is placed is fair game.
- The emerging Stage story is **Frames for presentation**. Chronicle Points stay **discussion**. Config (same Chronicle Config family) is how this Stage tells — not built yet.
- Contextual Agency is Stage-owned and edited in Composer. Base Agency stays on `kip_agents`.
- Reach opens from Composer (and the top-bar shortcut) and renders in Chronicle. Composer does not live in Chronicle.
- Agent turns already receive the Stage roster via `buildKeeperStagePrompt`. They are asked where the story is going. There is no Stage-story Apply action yet.

## ⚠️ Notes & ToDo
- [ ] Persist filmstrip cells (still Slides, still `text_slide` until a new layout is real)
- [ ] Rendr: more SlideTypes on Stage (`moment_card`) after the title + beat strip is felt
- [ ] Stage Config in Chronicle (how this Stage tells) — `ChronicleConfigShell`, no fourth panel
- [ ] Agent story-arrange propose + human Apply (analog of Review & Reorganize; do not invent until Rendr shapes it)
- [ ] Theatre.js choreography — after the Frame story is real
- [ ] Persistent Keeper Cast migration off boardCast defaults
- [ ] Confirm Finding the Plot is the first object Chuck wants seeded vs brought by hand
- [ ] Mobile drag/group/connector semantics — deliberately not built

## 📆 Update Log

### 2026-08-30 — Default Stage belongs to the domain
- `displayStageTitle` / `displayKeeperStageTitle` take an optional domain label. Empty or `Keeper` becomes `{domain} Stage`.

### 2026-08-30 — First Slide is the existing title
- Locked: Frame = the room (Stage / Present). Slide = one cell of the filmstrip. SlideType `text_slide` already exists for story beats. Do not invent Now as a type.
- First Slide uses Talking in (Finding the Plot, …) or the Stage name. The current beat is Slide 2 when you have spoken.

### 2026-08-30 — Select an object to discuss
- Now no longer covers the table (clicks were hitting the beat card). Selecting a presence sets Working on and Chronicle shows that object. On Realm, Stage no longer forces the Dialog Document over Moment or Library.
- Now is a scene caption, not a toolbox card. Objects say “Discussing in Chronicle” when selected.

### 2026-08-30 — Stage story is Frames, not Points
- Chuck locked the destination: Workspace-on-Stage is a Frame-driven story wrapped in Config. Objects are assets. Agents pull the story together the way they Review & Reorganize a Document. Points stay Chronicle discussion. Now remains the first beat until that workshop is designed.
- Agent Stage prompt now names assets, wide/narrow context, and Frames vs Points. No new action.

### 2026-08-30 — Now beat on Stage
- Stage is not Dialog (no chat bubbles) and not objects only. Center card **Now** shows the last Turn and the room’s reply. Objects stay around it. Empty: “The story is not on yet. Speak from the lectern.” Waiting: “The room is answering…”
- Default Stage displays as **{domain} Stage** when the stored title is still the platform default. Header Bar: Stage · Talking in · Working on.

### 2026-08-30 — Composer lectern on Stage
- Composer stays at the bottom and stands over the Stage (orchestra pit). Agency is in Composer. Reach is in Chronicle. Elevation is function, not a move to the top.

### 2026-08-30 — Reach is not Composer
- Sheet, Stage empty state, and top-bar control are labeled **Reach**. Composer is `AgentComposer`; Reach opens from Composer and as a shortcut.

### 2026-08-30 — Stage room launch (Slice 1)
- Realm Nav now enters Stage. The canvas and reach sheet stay as stand-ins; the room change is the 15 / 70 / 15 curtains.

### 2026-08-22 — First vertical slice
- Added Composer reach sheet + Keeper Stage workspace over existing Universal Board.
- Persist composition; inject Stage into agent turns; preserve Talking in / Working on.

# Reach + Stage

## 📌 Purpose
Reach and Stage sit above Boards without becoming a fourth column. **Composer** is `AgentComposer` (the Turn instrument) at the bottom. On Stage it is a lectern over the table — same place, more function (Agency, Reach in Chronicle). Placed objects are **assets**. The Stage workspace is a **Frame-driven story** (presentation), not a second Document of Points.

## 🧱 Key Files
- `useKeeperStage.ts` — domain Stage load/save + Cast fetch (provider, no JSX)
- `ReachPalette.tsx` — Here / Cast / Recent / search
- `ReachChroniclePresence.tsx` (in `presence/`) — Chronicle surface for Reach
- `KeeperStageCanvas.tsx` — Stage **screen** (current Slide only)
- `StageFilmstrip.tsx` / `stagePresentation.tsx` — big screen + strip above Composer
- `OnStageObjectList.tsx` — active objects in Reach, Chronicle, and Composer
- `stageNowBeat.ts` / `stageFilmstrip.ts` — domain Root (`domain_cover`) + story beats after Forward
- `ComposerStageAgency.tsx` — compact Role / Direction inside elevated Composer
- `StageAgencyStrip.tsx` — Agency fields (`layout="composer"` | `"stage"`)
- `useBindStageDialog.ts` — auto-bind Talking in when a Dialog is already on Stage

## 🔄 Data & Behavior
- Composition persists on `Domain.settings.keeperStage` via `GET/PATCH /api/domains/:domainId/keeper-stage`.
- Stage references `agent | dialog | draft | journey | keeper | moment | library` by id. Selecting a presence sets Working on and keeps Talking in (Dialog select is the exception — it *is* the conversation).
- If a Dialog is already on Stage, Talking in binds to it. No card click required to speak.
- **Screen / strip / Reach:** Stage is the big presentation screen. Filmstrip cells sit just above Composer. Objects are not on the screen — they are **On Stage** in Reach (list over Chronicle) and as chips in Composer. Selection happens there.
- Objects on Stage are assets (wide context = everything placed; narrow = selected + what was just said). Documents, Drafts, attachments, Journeys, Moments, Library, Cast — whatever is placed is fair game.
- The emerging Stage story is **Frames for presentation**. Chronicle Points stay **discussion**. Config (same Chronicle Config family) is how this Stage tells — not built yet.
- Contextual Agency is Stage-owned and edited in Composer. Base Agency stays on `kip_agents`.
- Reach opens from Composer (and the top-bar shortcut) and renders in Chronicle. Composer does not live in Chronicle.
- Agent turns receive the Stage roster and the current filmstrip via `buildKeeperStagePrompt`. On Stage they emit `stage.story.layout` — that writes the strip. Reload after the turn.

## ⚠️ Notes & ToDo
- [x] Persist filmstrip cells on `Domain.settings.keeperStage.story` (`stage.story.layout`)
- [ ] Present plays the Stage story (not only the first public journey)
- [ ] Rendr: more SlideTypes on Stage (`moment_card`) after Root + beats are felt
- [ ] Stage Config in Chronicle (how this Stage tells) — `ChronicleConfigShell`, no fourth panel
- [x] Agent layout writes the strip (`stage.story.layout`). No Apply — agents lay it out.
- [x] Play filmstrip cells on the existing Theatre `slide` Present (not a new Stage project)
- [ ] Persistent Keeper Cast migration off boardCast defaults
- [ ] Confirm Finding the Plot is the first object Chuck wants seeded vs brought by hand
- [ ] Mobile drag/group/connector semantics — deliberately not built

## 📆 Update Log

### 2026-08-30 — Root is the domain Cover
- First cell is `domain_cover` (wordmark, tagline, Forward) — the frame that loads with the domain. Not a `text_slide` title. Forward opens the selected story (beats after Root). Agents do not author the Root.

### 2026-08-30 — Agents lay out the Stage story
- Filmstrip persists on the named Stage (`keeperStage.story`). Lead `stage.story.layout` writes the sequence. Derived title + beat remains only until the first layout. Presence PATCH does not wipe the story.

### 2026-08-30 — Stage is the screen
- Objects leave the canvas. On Stage list lives at the top of Reach and Chronicle; Composer shows active chips. Filmstrip sits just above Composer. The 70% is the current Slide only.

### 2026-08-30 — Theatre plays Stage Slides
- Current filmstrip cell uses `PresentMotionProvider` `present="slide"` — the same sequence Chronicle already plays. Title arrives, then body. Switching cells replays. Theatre is not a new Stage project and not the source of the title.

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

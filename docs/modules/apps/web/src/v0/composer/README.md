# Reach + Stage

## 📌 Purpose
Reach and Stage sit above Boards without becoming a fourth column. **Composer** is `AgentComposer` (the Turn instrument) at the bottom. On Stage it is a lectern over the table — same place, more function (Agency, Reach in Chronicle). Placed objects are **assets**. The Stage workspace is a **Frame-driven story** (presentation), not a second Document of Points.

## 🧱 Key Files
- `useKeeperStage.ts` — domain Stage load/save + Cast fetch (provider, no JSX)
- `ReachPalette.tsx` — Here / Cast / Recent / search
- `ReachChroniclePresence.tsx` (in `presence/`) — Chronicle surface for Reach
- `KeeperStageCanvas.tsx` — Stage **screen** (current Slide only)
- `StageFilmstrip.tsx` / `stagePresentation.tsx` — big screen + strip above Composer
- `stageMomentSource.ts` — render-time resolve of `source.kind === 'moment'` to the live Moment row
- `OnStageObjectList.tsx` — On Stage list in Reach and Chronicle (not Composer)
- `StageEngagementSurface.tsx` — Slide as media field + paper card (public Cover dress; `.theme-reading-plane`)
- `ThemeChroniclePresence.tsx` (in `presence/`) — Composer Theme tool: Domain look editor + ask the lead; Stage inherit when on Stage
- `stageNowBeat.ts` / `stageFilmstrip.ts` — domain Root (`domain_cover`) + story beats after Forward
- `ComposerStageAgency.tsx` — compact Role / Direction inside elevated Composer
- `StageAgencyStrip.tsx` — Agency fields (`layout="composer"` | `"stage"`)
- `useBindStageDialog.ts` — auto-bind Talking in when a Dialog is already on Stage
- `stageAttention.ts` — Stage attention grammar: Present → Engage → Yield → Perform → Resolve → Return. Dialog is the first occupant. Not a Scene model.

## 🔄 Data & Behavior
- Composition persists on `Domain.settings.keeperStage` via `GET/PATCH /api/domains/:domainId/keeper-stage`.
- Filmstrip slides may carry `source: { kind: 'moment', id }`. Stage **stores** copied title/body plus that pointer; **render** loads `GET /api/moments/:id` and presents the Moment’s current title/narrative. Missing/unresolvable Moments show “Moment unavailable” — they do not fall back to the stored copy. Stage JSON is not rewritten.
- Stage references `agent | dialog | draft | journey | keeper | moment | library` by id. Selecting a presence sets Working on and keeps Talking in (Dialog select is the exception — it *is* the conversation).
- If a Dialog is already on Stage, Talking in binds to it. No card click required to speak.
- **Screen / strip / Reach:** Stage is the presentation screen. Each Slide is a standalone engagement — its own media field and paper card (Root uses the public Cover image). Filmstrip cells sit just above Composer. Objects are **On Stage** in Reach and Chronicle only — not in Composer.
- Objects on Stage are assets (wide context = everything placed; narrow = selected + what was just said). Documents, Drafts, attachments, Journeys, Moments, Library, Cast — whatever is placed is fair game.
- The emerging Stage story is **Frames for presentation**. Chronicle Points stay **discussion**. Config (same Chronicle Config family) is how this Stage tells — not built yet.
- Contextual Agency is Stage-owned and edited in Composer. Base Agency stays on `kip_agents`.
- Reach opens from Composer (and the top-bar shortcut) and renders in Chronicle. Composer does not live in Chronicle.
- Agent turns receive the Stage roster and the current filmstrip via `buildKeeperStagePrompt`. `stage.story.layout` is available to Lead when composing the filmstrip — Stage presence does not require a mutation. Reload after a layout write.
- **Stage attention:** Present → Engage → Yield → Perform → Resolve → Return. Composer focus or a working Turn leaves Present. Theatre writes `STAGE_YIELD_MOTION` onto the current Frame. Dialog occupies the yielded work surface first — not a second conversation system. Blur does not Return. Click the receded Frame or a filmstrip cell after Resolve. Scene stays experiential.

## ⚠️ Notes & ToDo
- [x] Persist filmstrip cells on `Domain.settings.keeperStage.story` (`stage.story.layout`)
- [ ] Present plays the Stage story (not only the first public journey)
- [ ] Rendr: more SlideTypes on Stage (`moment_card`) after Root + beats are felt
- [ ] Stage Config in Chronicle (how this Stage tells) — `ChronicleConfigShell`, no fourth panel
- [x] Agent layout writes the strip (`stage.story.layout`). No Apply — agents lay it out.
- [x] Play filmstrip cells on the existing Theatre `slide` Present (not a new Stage project)
- [x] Stage attention grammar — Dialog is the first occupant; Theatre recedes the current Frame
- [ ] Persistent Keeper Cast migration off boardCast defaults
- [ ] Confirm Finding the Plot is the first object Chuck wants seeded vs brought by hand
- [ ] Mobile drag/group/connector semantics — deliberately not built

## 📆 Update Log

### 2026-09-20 — Stage attention grammar
- Named states: Present → Engage → Yield → Perform → Resolve → Return. Dialog is the first occupant of the yielded work surface. Theatre writes `STAGE_YIELD_MOTION` on the current `slide` Presence instance for every state except Present. Return is intentional after Resolve and restores the held Frame. No Scene table. No second Dialog.

### 2026-09-15 — Live Moment source on the filmstrip
- A beat with `source.kind === 'moment'` and a valid `source.id` resolves the canonical Moment at render. Copied slide strings are not treated as current. Unresolvable references fail honestly and keep the source pointer.

### 2026-09-13 — Theme button is the Domain look
- Composer Theme opens a Chronicle editor for paper, accent, and cover. Members can change the look or ask the lead. Stage imagery remains a Stage-only section.

### 2026-09-01 — Stage layout is available, not obligated
- Stage prompt no longer commands `Emit stage.story.layout this turn`. Conversation / advice / no action is a valid successful turn.

### 2026-08-31 — Stage theme inherits the domain; Composer Look group
- Stage look persists on `keeperStage.theme`. Null / inherit uses the domain Treatment. Imagery grows a Stage look via the same palette extraction as a domain cover. Not a Prisma Theme table.
- Composer toolbar groups Look (Theme) · Reach · Capture · Send. Theme opens Chronicle, same as Reach. Paper cards use the atmosphere reading plane so type is no longer hidden on dark covers.

### 2026-08-30 — Slides are engagements; objects leave Composer
- Root (and beats) fill the Stage screen as the public Cover does: cover image + paper card. Objects stay in Reach / Chronicle. Composer is the lectern only.

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

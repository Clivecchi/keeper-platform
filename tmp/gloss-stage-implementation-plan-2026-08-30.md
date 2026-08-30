Cursor · Stage implementation plan — Realm launch, new room, new Composer (2026-08-30)

Gloss-only. Not a build lock. Chuck asked for an effective plan: current Stage/Composer UI is not the destination; Realm Board can launch Stage; a Nav item for Stages should open the universal Stage instead of a board; that is where the new Composer begins to replace the current one.

Keeper Principle held: Stage is a Workspace state, not Board 2.0. Realm is the front door. Nav launches the room. Composer is the instrument above Stage.

Why the current UI is the wrong destination
The shipped vertical slice proved persistence and Turn injection: Domain.settings.keeperStage, bring by kind+objectId, contextual role/direction, prompt text. It did not prove the experience. Stage today only swaps the Dialog center. Panel ratios stay Dialog’s 15/50/35. Composer is a mobile-first bottom sheet. That is why it still feels like the Universal Board.

Keep the capability. Replace the room.

Launch grammar
Realm is already the default member front door (`?board=realm`, `/home`). Do not add Stage to the Boards list — that would make it look like another board.

Add a Realm Nav item — Stage (or Stages) — on the Universal pane, beside Library. Library is the existing pattern for “this Nav item opens a surface, not an object.” Clicking Stage enters the Stage room on the same Realm Board: workspaceSurface = stage, curtains 15/70/15, Composer available above Stage. It does not change `?board=`.

One click enters the universal Stage (first composition: Keeper). A list of many Stages can come later. Do not wire RealmNavStage (drafts / kept / presented) — that is a different “stage” word.

Do not start this Nav item on Domain / Build / Agent / Designer. Realm is the launch. Other boards can keep a quiet Stage toggle later or lose it.

Implementation sequence

Slice 1 — Enter the room from Realm
Realm Nav: Stage item. Click opens Stage on Realm, not a board switch.
Apply locked curtains: 15 / 70 / 15. Dialog mode keeps today’s split.
Leave the old canvas/sheet in place only as a stand-in so the room change is visible. Do not polish them.

Slice 2 — Chronicle curtain as cue cards
At rest, Chronicle is a tight cue-card reading that can live in 15%.
Click a card: that pane widens while working the card, then returns to 15%.
Nav stays 15% unless Chuck later asks it to widen the same way.

Slice 3 — Elevate Composer above Stage (Chuck locked, 2026-08-30)
Composer is the Turn box: “Share your thoughts…”, attach, send, Agents. When Chuck says Composer, he means that.

Elevate Composer above the Stage so it can hold Agency, Stage context, and tools. Composer does not live in Chronicle.

Composer works with Chronicle: Chronicle renders Composer tools such as Reach.

Stage Chat (whole table) and object focus (one presence → Chronicle) still belong in this slice. Auto-bind the Dialog already on Stage so speaking does not require a card click.

Slice 4 — Presence that belongs in the room
Replace KeeperStageCanvas look so presence is the screenplay, not a picker.
Agency (Role / Direction) leaves the Stage floor; it belongs in Composer/Chronicle.
Keep references, not clones. Selected ≠ silently retargeting Stage Chat.
First proof: enter Stage with Finding the Plot already on it → speak immediately → Chronicle still shows the story.

Slice 5 — Later, not now
Domain Stage as a public/member Domain experience.
Invitation + permanent inviting-Domain.
Cloud review of Agent governance before Stage/Cast contract primitives.
Rendr / Theatre.js as full Stage presentation.

Cast Management (Chuck, 2026-08-30 — parked here, specified in `docs/dialog-cueing-plan.md`)
Style and Cueing can fight (Vibe auto-cued Cast while Cueing said Directed). Build Cast Management and the config around it: roster, Style/Cueing contract, and unique voice style per agent. Not the next Stage slice.

What we will not do
Do not create a Stage board or `?board=stage`.
Do not add a fourth panel.
Do not rebuild Stage as a Domain Board mirror.
Do not replace AgentComposer on Dialog in Slice 1–3.
Do not invent Stage/Cast contracts before Cloud’s governance review.
Do not let Realm lifecycle “stages” (drafts/kept/presented) collide with Stage.

Recommended first build
Slice 1 only: Realm Nav → Stage, curtains 15/70/15, old canvas as temporary occupant. That is the smallest change that makes Stage a different room. Composer and cue cards follow immediately after the room is real.

Cursor recommendation: lock this sequence. Build Slice 1 next when Chuck says go.

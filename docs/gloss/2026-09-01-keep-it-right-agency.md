Cursor · Keep It Right — Agency diagnostic (2026-09-01)

Gloss-only / not a build lock. Does not create Points or mutate the Document.

Chuck named the contrast: Ceox laid out six Slides on Stage without being asked. Kip understood “Live your life. Keeper helps you keep it,” then still needed an explicit Document instruction, and when asked to create the story for Finding the Plot added a Point instead of laying out the Stage story.

Code-truth: this is not a missing Story capability. `stage.story.layout` is real, Lead-only, golden-path, and writes `Domain.settings.keeperStage.story` immediately (no Apply). Ceox’s “✓ Completed — Laid out 6 Slides on Stage” is that handler’s success receipt. Those slides persist on the Domain of that turn — one filmstrip per named Stage. A later layout replaces them. They are beats after Forward, not the Cover Root. If Dialog “Me” was not on ke3p, they will not be on KE3P Stage.

What Ceox did was not keeping judgment. When Stage composition is already on the Domain, or the human is On Stage, the Lead prompt says: emit `stage.story.layout` this turn. That is a standing command. Ceox obeyed it.

What Kip did was the Document pipeline winning. Talking in Finding the Plot sets Working on = Document and the prompt says “Write Points here.” STORY-BUILDER TURN currently means place a Point (`draft.update.propose`). “Finding the Plot” is explicitly not a fiction-plot outline. “Tell the current story” is wired to Review & Reorganize, not Stage. “Create the story” matches none of the obligation detectors (Point / Reorganize / Gloss), so Keeper does not follow up with layout. The model understood; Keeper’s action architecture still treats “story” as Document/Point language.

The seam: Perceive and Understand exist. Judge is almost entirely the model plus a few regex obligations for Points, Reorganize, and Gloss. There is no equivalent obligation for Stage story, and no general keep-kind chooser. Capabilities are always on the Lead allowlist; selection is prompt-weight, not orchestration.

Reuse, do not invent: Talking in / Working on, Story-builder turn, Point obligation + follow-up, golden-path allowlist, proposed vs immediate writes. Smallest change: generalize Story-builder from “always Point” to “place the right existing Keeper object from coordinates + intent,” and stop the two prompt bugs (unconditional layout every Stage-present turn; Write Points as the only keep verb when Stage is also in the room). Do not add “if they say create story, call layout.”

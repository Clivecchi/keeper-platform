Cursor · Stage vs what already exists (2026-08-19)

Gloss-only / not a build lock. Chuck asked for a code-backed read of the Stage working understanding before Rendr and Chronicle weigh in. No code changed.

## Verdict

Sections 1 and 2 of Chuck’s note are solid as intent and as Theatre.js mechanics. The right durability model is Dialog-backed, parallel to Document. The risky move is treating a Theatre Sheet as the identity of a Stage, or sharing Present’s current Sheets as if they were already a rehearsal canvas.

Stage as a product object does not exist yet. What exists under the same word is a homonym.

## What the code actually has

Theatre.js (`@theatre/core` 0.7.2, Studio in dev only) drives Present *motion*, not a Stage. One project: `Keeper Presents · tuned`. Five sibling Sheets: `cover`, `slide`, `media`, `journey`, `moment`. Each Sheet has one object, `Presence`, whose props are opacity / scale / Y-offset. Instance id is `{objectType}:{objectId}` so two Chronicle selections do not collide. Project state lives in code (`buildPresentProjectState.ts`), not per-Dialog in the database. No Three.js. No drag-and-drop Stage. Sheets do not nest — that part of Chuck’s note is factually correct.

“Stage” in the repo today means other things:
- Realm Nav buckets: Drafts → Kept → Presented (`RealmNavStage`)
- Mobile composer phases: composing / thinking / response
- Not a product surface

Document is already a role a Dialog plays (`title_source: user_set`, `document_status`, `forward_*`, `step_*`, `document_paths`). Session is a bounded thread on that Dialog. That lock shipped today. Ingestion (“writing from outside Keeper”) already exists as a Chronicle Act into a Dialog Document — never Library. Composer is the Dialog input floor. Cast acts through Dialog cueing, not on spatial props.

Present is also overloaded: public story frame (`PresentFrame` / SlideTypes), Theatre motion catalog, and Nav lifecycle status `presented`. The 2026-07-17 Document decision already said Present is a separate rendering system, not a Document status. Chuck’s new question (rehearsal vs performance, maybe one Sheet) is a different question and is still open.

## On the two open framings

Stage = one Theatre Sheet as *identity* — weak. Theatre currently stores animation templates, not artifacts. Artifacts are Dialog / Draft / Point in Prisma. Promotion out of a Sheet would mean inventing persistence Theatre does not have.

Stage = a Dialog role — strong. Same pattern as Document. A Stage would persist across Sessions because Dialog already does. Wording note: Document does not “have” a Dialog; it *is* Dialog state. “A Stage has its own Dialog” should be “Stage is a role a Dialog plays,” or the Document analogy is already broken.

Both together is coherent if the split is kept honest: Dialog holds identity and accumulation; a Sheet is the live scene for motion/layout. That combination is not built. Do not collapse them into one object.

## On Stage vs Present

Product intent (rehearsal feeding performance) matches Capture → Shape → Keep → Show. Sharing Present’s current Sheets would be a category error — those Sheets are named *forms* (how Cover arrives), not a workspace of props. A future Present might *play* a Stage’s scene. It should not *be* the Stage.

## Recommendation (for Rendr / Chronicle, not a lock)

1. Keep Stage off Theatre-as-database. Dialog-backed first.
2. Rename or qualify Realm Nav “stages” before the word Stage becomes a product object, or Nav and the new surface will talk past each other.
3. Place Stage in the existing three-panel board before inventing a fourth. Composer-above-Stage most naturally means Chronicle (or the board floor under Composer) becomes the sovereign surface — not a new Board.
4. Do not start Theatre Studio / drag-and-drop until that placement and the Dialog-role question are decided. Becoming (selected object actually opens) was the prerequisite; that lock is in. This is the next conversation, not the next build.

Queued from this morning still holds in spirit: Composer / Stage / Cast is the right brief. The Sheet mapping is the part that should stay contested.

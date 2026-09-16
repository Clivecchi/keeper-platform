Cursor · Moment + Evolution code truth (2026-09-15)

Gloss-only. Not a build lock. Forensic inspection of what the codebase already has for Moment, “Moment Evolutions,” Stage composition, and provenance. No models added. No promotion implemented in this pass.

What exists (disagreement, not reconciliation)

There is no MomentEvolution table, type, or UI. Evolution is a keep-path flag: a later accepted journey_spec Point with evolvesMomentId overwrites one existing Moment row (title, narrative, keptAt, source pointers). The Prisma field evolvedFromMomentId exists and is never written. Prior Moment content is not kept as an ordered series.

Point and Moment are not the same object. A Point lives in kip_drafts.spec_json. A Moment is a Prisma row. First journey_spec keep can make Moment.id = Point.id; the Point stays on the manuscript. Docs that say “what renders as the Point is the Moment’s current state” are not what the code does — accepted Points stay frozen; evolution updates the Moment from a new Point.

Three keep paths already exist and they do not share lineage:
1. Capture / receipt → POST /api/v0/moments/drafts then /keep (keptAt). No sourcePointId.
2. Kip moment.create — creates already-kept. No Point lineage.
3. draft.point.promote — journey_spec only. Writes sourceDraftId + sourcePointId. document_manuscript is rejected.

Stage already has pointer types (presence.kind moment; slide.source.kind moment). Filmstrip render drops source and shows copied title/body. Reach/nav-index does not list Moments. Compose-the-object is typed; copy-the-object is what performs.

Smallest next move (not implemented): resolve source.kind === 'moment' against the live Moment row at filmstrip render. Prove Stage can perform the real object before adding Evolutions, Composer, or Document-Point promotion.

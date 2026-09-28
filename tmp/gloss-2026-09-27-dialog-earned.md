Cursor · What a Dialog has already earned (2026-09-27)

Gloss-only. Not a build lock. A reading of current machinery.

Jev does not inspect a Dialog. During a Turn, System One sees the current human sentence, the Dialog title, a boolean that a Document is in context, and a point count — and only when reorganize language is present. After the Lead reply, preserve-discovery@1 sees that same human sentence and the Lead reply, capped, plus the Orientation text. It does not see prior Turns, Points, or the transcript. jev.probe sees only the evidence the calling agent puts in the payload.

preserve-discovery returns one Choice, then Keeper writes one proposed Point. The schema of draft.update.propose is one content string; a Turn may emit several such actions. Human acceptance is Point.status moving from proposed to accepted, via the Chronicle Accept control, which is draft.point.accept. Chronicle History records that accept. The Document body is the manuscript Points Chronicle already renders.

Once any manuscript Point or other durable draft exists, the preserve gate shuts before Jev runs. The state fields that would say “an existing item already represents this” are present and hardcoded false. What the Dialog has earned is already the manuscript Points, their accepted status, Chronicle History, Orientation, Forward, and Step. No second ledger is required to ask that question.

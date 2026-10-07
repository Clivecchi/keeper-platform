Cursor · Loading the Domain is not awareness (2026-10-06)

Gloss-only. Not a build lock. Does not create a Point. The Agency core stays on the table. Prompts were not changed.

Loading the active Domain is not the same as knowing it.

What a turn is given, every time, for one Domain: up to 20 Keepers, 20 Journeys, 20 Library items, 30 newest Dialog titles, 25 of this person's Drafts, up to 40 people notes, the Stage refs, and the active Document (its Points, capped at 80 in the prompt). That pile is the map. It is also the preload. The human's Nav index is a separate, slightly larger list (50 Dialogs, 40 Drafts, 40 Keepers, 40 Library). The agent does not receive that index.

What an agent can pull on purpose, on a later turn, if it emits the action:

- `dialog.read` lists more recent Dialogs or searches title, Forward title, and Step title. It does not search Point bodies. `{ id }` returns that Document.
- `library.read` can search by meaning and then fetch one item's text.
- `draft.read` fetches one Draft by id or kind+key, only this person's. There is no Draft search. `draft.list` returns another 25, with no query.
- `keeper.read`, `journey.read`, and `moment.read` fetch by id. There is no search. If it was not in the 20, the agent has no way to find the id.
- A follow-up turn receives the read. That is the only secondary context.

Jev does not select that context. `jev.probe` and `typesafe.evaluate` judge evidence the agent already holds. They do not look up the Domain.

A cheap Cast offer has none of this. An engaged Cast member uses the same turn as Lead, so the same truncated map and the same reads. The two Dialogs today never used the reads.

The five layers, against this:

1. Agency core — still on the table. Not built.
2. Domain map — a recent slice, stuffed in, smaller than Nav, silent about what it omitted.
3. Primary context — the active Dialog and its Document. This part exists.
4. Secondary context — a few reads, uneven, and only if the model chooses them. No weighting.
5. Capabilities — a flat allowlist of action names. The registry does not drive the turn.

The desk, if it becomes anything, is a map the agent can trust plus the reads it already has. Not a larger preload. Jev can later rank candidates from that map. It should not replace the reads, and the map's bodies should stay out of the prompt.

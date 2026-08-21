Cursor · Point writes: Keeper owns the target id (2026-08-21)

Gloss-only / not a build lock.

The live miss on Finding the plot was not “Points don’t exist” and not “the model forgot to propose.” `draft.update.propose` ran. Prisma rejected the id:

`Error creating UUID … found 'n' at 2`

That character is either `none` (n-o-n) or the manuscript `key` (`manuscript-…`, m-a-n). `kip_drafts.id` is a UUID. The model copied a placeholder or the human-readable key. Keeper treated any non-empty string as a real draft id, sent it to `findFirst({ where: { id } })`, and the Document stayed empty.

Why this looked like “it used to work”: Documents that already had a manuscript UUID in the prompt (Becoming Together) could succeed when the model omitted id or copied the UUID. New named Dialogs plus a `manuscript-…` key made the same code path explode.

The Agency correction: on an explicit Point turn, Keeper forces the Dialog manuscript UUID. Invalid ids never hit the UUID column. A `manuscript-…` key can still resolve as a fallback. The model supplies Point wording. It does not choose the write target.

Retry: Finding the plot → “Give me some points.” Chronicle should receive accepted Points on that Dialog’s manuscript, not a Prisma receipt.

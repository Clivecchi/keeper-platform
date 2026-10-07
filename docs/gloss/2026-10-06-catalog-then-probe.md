Cursor · Catalog, then probe (2026-10-06)

Gloss-only. Not a build lock. Does not create a Point. Nothing was built.

Chuck’s split holds. A structural catalog of what exists is a different job from judging what matters. Jev should not keep the catalog.

What already exists is two capped title lists for one Domain: the agent’s domain index (20 Keepers, 20 Journeys, 20 Library items, 30 Dialogs, 25 Drafts) and Nav’s larger index, which the agent never sees. Both are queries over real rows. Neither is a catalog you can trust, because both are silent about what they cut off. Library search is a third thing: embeddings over Library text, not a map of the Domain.

A deterministic catalog is realistic for columns that already exist: id, kind, title, status, updated time, and parent ids (Domain, Keeper, Dialog, Draft, Journey). No model is required to say that a row exists. Judgment is required for relevance, and for anything we have not stored as a relationship. “Cloud owns this work” is not a reliable column. The human owns the Draft. agent_id is optional.

One Dewey tree would be wrong. Keeper → Journey → Path → Moment is a hierarchy. Dialogs, Documents, Drafts, and Library sit beside it, linked by ids, not under it. The honest catalog is typed shelves, not one outline.

Trace can hang off the Dialog it already names: who, what, when, message id. The label on a Trace event often carries the words. Leave the label out or the catalog eats the body. A Domain-wide trace dump gets large. A count and a last event on the Dialog node does not.

Do not persist a new map table until a query is not enough. The existing indexes are that query, truncated. A stored catalog that can go stale is the subsystem.

Jev fits as an optional ranker of a shelf the code already filtered. Today a probe only judges evidence it is handed. It does not see the database. Hand it titles and ids, ask which ids matter, and let the agent decide. Skip it when the Dialog already names the work. Do not hand it rows the person cannot read. Library embeddings stay the search inside Library text. Jev should not redo that.

Authority is the user’s Domain permission, applied before any probe. Agents do not have a clearance above the person. A foreign Domain is omitted today. It is not listed as “something exists.” A Lead relaying a conclusion without the source is a new rule. It is not a property of the catalog.

Stage Composer arranges a Reading. It does not assemble working context. The turn builder does, by concatenation. That builder is what would carry a shelf, the primary Document, and a read. Do not give the job to Rendr.

This simplifies if it stays a query plus the reads we have. It becomes another subsystem if we add a stored map, a new tree, or a probe on every turn.

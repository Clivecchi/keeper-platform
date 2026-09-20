Cursor · Mounted GET /api/journeys list is now scoped (2026-09-20)

Gloss-only. Implementation landed. Not a rewrite of the Journey API.

Jev found the platform-wide list. Investigation chose Option B, narrow: a Journey list must be scoped, and a supplied Domain must be authorized.

Now:
- `GET /api/journeys` with neither `domainId` nor `keeperId` is 400.
- A supplied `domainId` requires Domain read (same membership/owner/keeper-in-domain path as other param-scoped routes).
- Keeper-only listing remains, but if the Keeper has a `domainId`, that Domain is authorized too — so a foreign keeperId is not a bypass.
- Chronicle `enrichKeeper` now sends `domainId` + `keeperId`.

Not changed: GET-by-id, POST, PATCH, DELETE on the same router. Those still lack Domain authorization. Follow-up, not this loop.

Remaining ambiguity: a Keeper with null `domainId` can still be listed by keeperId. Journey.domainId may still disagree with its Keeper. We did not migrate data.

This closes the exact unscoped listing seam Jev identified.

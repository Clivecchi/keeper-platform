Cursor · GET /api/journeys list scope (2026-09-20)

Gloss-only. Not a build lock. No code change.

Investigated the mounted list after Jev flagged optional `domainId`.

Why it is optional: leftover JourneyBoard “get all journeys” contract, plus Prisma `Journey.domainId` is itself optional. The unmounted twin (`domain-integrated-routes.ts`) is the intended upgrade: omit `domainId` → restrict to the user’s member domains, not the whole platform. That twin is not mounted.

Who calls the mounted list:
- Domain-scoped (pass `domainId`): Nav cache, JourneysFrame, Commons, Agent board, UniversalContextPanel, useAgentDialog, KipAgentBoardPage, mobile.
- Keeper-scoped only: Chronicle `enrichKeeper` — has `domainId` in hand and does not send it; filters by `keeperId`.
- No production UI calls the list with neither filter.

Cross-Domain listing of every Journey is not a current product contract. Public list is a different route and is slug-scoped. Agent environment already queries Prisma by `domainId`.

If `domainId` became mandatory: Nav/frames/mobile would keep working. `enrichKeeper` must add the query param it already has. Journeys with null `domainId` already vanish from Domain-scoped callers; they would also vanish from HTTP list unless a keeper-only filter remains.

Do not lock a fix yet. The decision is which list contract we want:
A) one Domain only
B) Domain or Keeper, never unscoped
C) all domains the user can access (unmounted twin — no current UI)

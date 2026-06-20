# Journeys Frame

The Journeys Frame renders a Keeper's journey list and detail view.
It reads labels and messaging from the domain JSON (`domainFrame.journeys`)
and is registered in V0Shell under the frame key `"journeys"`.

Migrated to JSON UI Frame standard: March 2026.

## Update Log

- **2026-06-19** — Reverted standalone-frame engagement wiring; member Act layer lives on Universal Board only (see `boards/engagement/`).

### 2026-03-27 — Guests load lists/details via `GET /api/public/:domainSlug/journeys*`. `?journey=<id>` deep-links into detail. Authenticated path unchanged.
- **2026-04-26** — Wired `Path.prelude` through to the detail panel. `JourneyDetail.paths` type updated to include `prelude: string`. Both the authenticated and unauthenticated path mappings now preserve `prelude` (with `?? ''` fallback). A Paths section now renders in the Journey detail panel; each Path card shows `name` and, if present, `prelude` below it in secondary ink color.


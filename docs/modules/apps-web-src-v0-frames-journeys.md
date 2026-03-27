# Journeys Frame

The Journeys Frame renders a Keeper's journey list and detail view.
It reads labels and messaging from the domain JSON (`domainFrame.journeys`)
and is registered in V0Shell under the frame key `"journeys"`.

Migrated to JSON UI Frame standard: March 2026.

## Update Log

- **2026-03-27** — Guests load lists/details via `GET /api/public/:domainSlug/journeys*`. `?journey=<id>` deep-links into detail. Authenticated path unchanged.

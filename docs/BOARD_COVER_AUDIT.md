# Board Cover Audit (MVP)

## Summary
The repo currently has two competing sources for a “cover image”:
- `domain.theme.coverImage` (domain theme JSON; used by the Domain Design Board template).
- `board.config.coverId` (board config JSON; set via BoardsService).

No v0 UI frame renders a cover image directly today, so the cover image remains a data contract issue rather than a surfaced UI decision.

## Code Paths Found

### Domain Theme Cover Image (domain theme JSON)
- `packages/database/prisma/scripts/set-domain-cover-image.ts`  
  Updates `domain.theme.coverImage` for a domain.
- `apps/api/src/api/domains/board-data.ts`  
  Hydrates `dataSource === "domain.theme.coverImage"` by returning `domain.theme?.coverImage`.
- `packages/database/prisma/seeds/design-boards.seed.ts`  
  Domain Design Board template “Board Cover” frame uses `dataSource: "domain.theme.coverImage"` for an image prop.
- `apps/api/test-domain-board-data.md`  
  Documents `domain.theme.coverImage` in the board-data contract.

### Board Config Cover ID (board config JSON)
- `apps/api/src/services/boards/BoardsService.ts`  
  `setCover()` writes `coverId` to `Board.config`.
- `apps/api/src/services/boards/README.md`  
  Documents `Board.config.coverId` as the “board cover image”.
- `apps/api/src/routes/boards.ts`  
  “Set board cover image” route exists (placeholder flow).

### Schema Context
- `packages/database/prisma/schema.prisma`  
  `Board.config` is a JSON field (no dedicated cover column).  
  There is no explicit `coverImage` field on `Board` or `Domain`.

## Duplicates & Conflicts
- **Domain template cover** points to `domain.theme.coverImage`.
- **Board config cover** points to `Board.config.coverId`.

These are not aligned and currently represent two competing sources of truth.

## Canonical Recommendation (MVP)
**Choose `Board.config.coverId` as the canonical Board Cover source of truth.**

Rationale:
- The cover is a **Board** concern (Domain Home Board is a board).
- `BoardsService.setCover()` already writes to `Board.config.coverId`.
- Board-scoped admin should mutate board config, not domain theme.

## Suggested Consolidation Plan (no uploads yet)
1) **Canonical data field**: `Board.config.coverId`
2) **API ownership**: `BoardsService.setCover()` (and a dedicated board config endpoint)
3) **Template dataSource**: update Domain Design Board template to read from board config instead of `domain.theme.coverImage`.
4) **UI**: Board cover rendering should read from `Board.config.coverId` (resolve to media when pipeline exists).

## Non-Goals (per current request)
- No cover upload pipeline changes.
- No new cover rendering UI added yet.

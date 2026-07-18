# Build Handoff — dialog-delete-ui

**Goal:** Wire a real delete control for Dialog sessions into the UI, calling the already-shipped `DELETE /api/domains/:domainId/kip/dialogs/:dialogId` route.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-16T00:00:00Z by cloud

## Done when

- A user can delete a Dialog from somewhere reachable in Nav where Dialogs are listed — not buried only in a config panel, since the whole point is fast manual cleanup of the current 40-plus-item clutter
- Delete requires an explicit confirm step before the request fires — this is a hard delete (`prisma.dialog.delete`), not archive, and cannot be undone
- On success (204), the deleted Dialog disappears from Nav immediately without a full page reload
- On 404 (already deleted / not owned) and 500, the user sees a real error state, not a silent failure or a stuck spinner
- The control reuses whatever destructive-action pattern already exists elsewhere in the app (e.g. Draft delete) rather than inventing new styling — structure and behavior only, treatment supplies the look
- No changes to the DELETE route itself or its ownership rules (admin or owning keeper via `available_to`) — backend is done, this handoff is frontend-only
- `pnpm run quick:web` passes

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `apps/web/src/v0/boards/boardNavDataCache.ts`, `apps/web/src/v0/realm/`, `apps/web/src/v0/boards/UniversalConversation.tsx`, `apps/web/src/lib/kipDialogSession.ts`

**Do not touch:** `apps/api/src/api/domains/kip-dialogs.ts`

## Pattern

Existing single-dialog PATCH calls already exist in `chroniclePatch.ts` and `KeeperPresence.tsx` — same URL shape, DELETE instead of PATCH. The Dialog list itself is fetched in `boardNavDataCache.ts` (`GET /kip/dialogs`). If a Draft-delete confirm-and-remove UI pattern already exists (the `kip-drafts.ts` DELETE route is real and older than this one), mirror that interaction pattern for consistency rather than inventing a new one.

## Rendr treatment

N/A — reuse the existing destructive-action visual pattern already in the app. Do not invent new colors, icons, or copy style for this control.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.
- Confirm-before-delete is not optional — this is irreversible.

## Context

Follow-up to `document-point-moment-reconciliation` (archived) — that handoff shipped the DELETE route but no UI called it.

Confirmed by Cloud: the DELETE route is real and already live (`apps/api/src/api/domains/kip-dialogs.ts:365`), verified working, ownership-checked, returns 204/404/401/500. Nothing backend needs to change. This exists purely because Chuck wants to manually clean up the current Dialog list and has no way to trigger the delete he already has on the backend.

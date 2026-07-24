# Build Handoff — stop-orphan-echo-sessions (shipped)

**Goal:** Stop the "Kip echo" mechanism in `UniversalConversation.tsx` from creating a new, dialog-less `kip_session` every time it fails to find an exact-name match. Archive the existing orphaned sessions this has already created.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-23T00:00:00Z by cloud
**Status:** shipped 2026-07-23

## Root cause (confirmed in implementation)

`KipApi.createSession` expects `dialogBoard` / `dialogFrame` / `dialogScope`. The echo effect passed `board` / `frame`, which the client silently dropped — so `dialogLink` never formed, `dialog_id` stayed null, and `resolveActiveDialogSessions` could never find the row on the next effect run → unbounded orphans.

## What shipped

- Echo effect is resume-only (no create on effect)
- First real echo ensures a session via `resumeOrCreateBoardSession` (correct keys)
- `kip_sessions.is_archived` + migration `20260723200000_kip_sessions_is_archived`
- `apps/api/src/scripts/archive-orphan-echo-sessions.ts` (dry-run default; `--execute` after migrate)

## Verification

**Commands:** `pnpm -F keeper-api run type-check` (pass). `pnpm run quick:web` has pre-existing tsc debt unrelated to this change.
**DB:** run migrate, then `npx tsx src/scripts/archive-orphan-echo-sessions.ts` then `--execute` from `apps/api`.
**Browser:** `/d/ke3p?board=domain` — confirm orphan count does not rise on normal use.

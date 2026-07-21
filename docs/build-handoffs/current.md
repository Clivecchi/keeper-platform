# Build Handoff — ke3p-becoming-together-consolidation

**Goal:** Create a real "Becoming Together" Dialog on ke3p as the one active dialog, archive the domain's other 16 real dialogs, and convert its 78 dialog-less drafts into real LibraryItem records tagged Archive — so Realm's actual data matches the reference Document's premise, not just its rendering.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-20T00:00:00Z by cloud

---

## Why this handoff exists

`realm-becoming-together-parity` shipped and its fixes are real — Chronicle scoping, Path grouping, cast bar placement all verified in code. But Chuck's actual complaint after seeing it deployed was direct: *"I still have forty two thousand drafts and zero dialogs."* Checked against a real, read-only production query, not assumed: **ke3p has 17 real Dialog rows, all auto-titled by board and date, and none of them is named Becoming Together.** 86 total drafts exist; only 8 carry a `dialog_id`. The other **78 are orphaned** — that's the real source of the Unassigned pile in Nav.

Every previous fix was correct rendering machinery for data that never matched the end state. This handoff creates the actual data.

## Done when

- A real `Dialog` row is created on ke3p titled **"Becoming Together"** — fields follow existing `Dialog` conventions (`title`, `domain_id`, `available_to`, `context`, `document_status` defaulting to `drafts`); document the `user_id` choice (null for domain-scoped/cast-shared vs. Chuck's own id) since existing real dialogs use both patterns inconsistently
- `LibraryItem` gains a real category mechanism — e.g. `category: String[] @default([])` — since none exists today (confirmed: only `source_type: upload|url|github|gdrive` exists, no tag/category field at all). Migration only, no other shape changes
- `LibraryItemSourceType` gains an honest value for drafts converted this way — the existing enum has nothing for "originated from an internal Draft"; do not mislabel these as upload/url/github/gdrive
- A dedicated, **manually-invoked** migration script (not auto-run on deploy, not run as part of committing this handoff) that, for each of ke3p's 78 `kip_drafts` rows with `dialog_id IS NULL`: creates one new `LibraryItem` with `source_ref = keeper://draft/{draftId}` (the existing pointer convention already documented in `AGENTS.md`), `display_label` = the draft's title, `description` = the draft's summary, `category` including `"archive"`, and the new `source_type` value — then sets that same draft's own `status` to `'archived'`
- The same script archives ke3p's other 16 real Dialog rows (`is_archived = true` — not deleted, reversible) and sets `status = 'archived'` on the 8 drafts still attached to those dialogs, for the same reason
- The script **defaults to dry-run**: prints exact counts and a sample of before/after mappings without writing anything; the real write only happens behind an explicit `--execute` flag
- **Nothing is permanently deleted anywhere in this handoff** — archive/convert only, everything reversible
- Confirm (don't assume) existing filtering already produces a clean result once this data is in place: `kip-dialogs.ts`'s list route already excludes `is_archived` dialogs by default, and `KipApi.listDrafts` already excludes `status: ['promoted','archived']` drafts. No new frontend filtering code should be needed — if verification shows otherwise, report back rather than add speculative logic
- `pnpm run quick:api` passes for every touched file
- **Dry-run output is reviewed and shared back before the real `--execute` run happens against production** — this is a hard gate, not a formality

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md
- @docs/library-shared-context-roadmap.md

## Scope

**Touch:** `packages/database/prisma/schema.prisma` (LibraryItem category field + new source_type enum value), a new migration script (e.g. `apps/api/src/scripts/consolidate-ke3p-dialogs.ts`, matching the existing precedent of `diagnose-default-domain.ts` / `repair-domain-frame.ts`), the generated Prisma migration.

**Do not touch:** any domain other than ke3p — this is scoped to one domain's data, not platform-wide; any Dialog/draft row beyond archiving or status-updating — no deletions anywhere; Nav/`RealmStagedNav`/`useRealmNavGrowth` frontend filtering — the existing filters are already documented as sufficient, don't add redundant logic without first confirming it's actually needed; the already-shipped `realm-becoming-together-parity` UI work.

## Pattern

`AGENTS.md`'s Library section already documents the exact pointer convention this handoff uses: *"Pointers (`keeper://draft/{id}`, `keeper://sole/{id}`, `doc://{path}` in `source_ref`) surface other stores read-only."* This isn't a new pattern — it's the first real use of an already-documented one. `KipApi.listDrafts`'s existing `excludeStatus: ['promoted','archived']` and `kip-dialogs.ts`'s existing `is_archived` filter are why no new frontend code should be needed — confirm this holds before writing anything new.

## Rendr treatment

N/A — this is a data migration, not a UI change.

## Verification

**Commands:** `pnpm run quick:api`
**Browser:** `/d/ke3p?board=realm` — only after the real `--execute` run, not before.

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- **Nothing gets permanently deleted.** Archive and convert only.
- **The real `--execute` run against production is a separate, deliberate step from committing this code.** Ship the script with dry-run as the default; do not invoke `--execute` unattended.
- Scoped to ke3p only — do not generalize to a platform-wide migration in this handoff.

## Context

Two decisions confirmed directly with Chuck before scoping this:

1. Create a **new** Dialog rather than rename an existing one, and **archive** (not delete) the other 16.
2. The 78 orphaned drafts convert into real `LibraryItem` rows tagged Archive, not just a status flag on the drafts alone — Chuck's own framing was *"Archive them where Archive is a Library category... Archive them type in the Library Archive,"* which requires the real schema addition above since `LibraryItem` has no category field today.

This is production data. The dry-run-before-execute gate is not decorative.

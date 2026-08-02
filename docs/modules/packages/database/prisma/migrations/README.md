# Prisma Migrations

## 📌 Purpose
Database schema migrations applied by Prisma for the Keeper platform.

## 🧱 Key Files
- `migration.sql`
- `migration_lock.toml`

## 🔄 Data & Behavior
Each timestamped folder contains SQL migrations that align the database with `schema.prisma`.

## ⚠️ Notes & ToDo
- [ ] Confirm production migrations are applied during deploy

## 📆 Update Log

### 2026-08-02 — Restore Dialog.document_paths
- Added `20260803010000_restore_dialog_document_paths`: renames drifted `document_sections` back to canonical `document_paths` (or adds the column if missing). Fixes production Dialog list/resolve/createSession 500s after an orphaned rename migration left the DB out of sync with Prisma.

### 2026-07-20 — LibraryItem category + draft source_type
- Added `20260720120000_library_item_category_draft_source`: `LibraryItem.category String[]` and enum value `LibraryItemSourceType.draft` for connective-index pointers from internal drafts (ke3p Becoming Together consolidation).

### 2026-01-14 - Add Moment keptAt column
- Added migration to create `Moment.keptAt` for draft keep tracking.
### 2026-01-14 - Add anonymous moment claim fields
- Added nullable `ownerId` plus claim token fields for anonymous moment capture.
### 2026-01-14 - Drop Moment path/journey unique constraints
- Removed uniqueness constraints on `Moment.pathId` and `Moment.journeyId` to allow many-to-one relations.

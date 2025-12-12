For full schema cross-reference, see [MODEL_REFERENCE.md](./MODEL_REFERENCE.md)

# Prisma Schema & Migrations

## 📌 Purpose
Tracks Prisma schema and SQL migrations for the Keeper Platform database.

## 🧱 Key Files
- `schema.prisma`
- `migrations/`

## 🔄 Data & Behavior
- Schema is source of truth; migrations applied with `prisma migrate deploy` in production.
- Client is regenerated on install via workspace scripts.

## 🗺️ Board / Frame / Prop Map
- **Board model:** `Board` – owns `id`, `slug`, `keeperId`, optional `domainId`/`boardType`, plus JSON columns for `theme`, `behavior`, `data`, `config`, `access`, and has a `frames` relation.
- **Frame model:** `FrameInstance` – references `boardId` + `configId`, tracks layout (`pattern`, `frameType`, `layoutKind`, `layoutData`), entity scope (`entityType`, `entityId`), `visibility`, and timestamps.
- **Prop storage:** `FrameInstance.props` (`Json` column) – holds the prop array/object for each frame, including `type` strings and per-prop config/value payloads.
- **Frames on boards:** `Board.frames` is the Prisma relation; each `FrameInstance` row has `boardId` FK to attach it to its parent board.
- **Props on frames:** Props live inside each `FrameInstance.props` JSON blob; renderers deserialize this list to route by `prop.type` (e.g., `heading`, `text`, `linked_card`).

## ⚠️ Notes & ToDo
- [ ] Backfill scripts for future destructive changes
- [ ] Add lint to ensure `IF NOT EXISTS` on additive DDL

## 📆 Update Log
- 2025-12-11: Added topic, summary, tags, and keeper/journey linkage placeholders to `kip_sessions` plus migration `20251211_kip_session_topics`.
- 2025-12-09: Documented canonical Board/Frame/Prop map and introduced the `linked_card` prop type + Kip Agent context frames in system board seeds.
- 2025-09-17: Added soft-delete column `deletedAt` to `Domain`. Migration `20250915_add_deletedAt_to_Domain` uses `IF NOT EXISTS` for idempotency.
- 2025-09-21: Added `BoardAlias` and `RequestLog` models. Migration `20250921_board_alias_request_log` creates tables and indices with IF NOT EXISTS.


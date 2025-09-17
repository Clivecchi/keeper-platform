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

## ⚠️ Notes & ToDo
- [ ] Backfill scripts for future destructive changes
- [ ] Add lint to ensure `IF NOT EXISTS` on additive DDL

## 📆 Update Log
- 2025-09-17: Added soft-delete column `deletedAt` to `Domain`. Migration `20250915_add_deletedAt_to_Domain` uses `IF NOT EXISTS` for idempotency.
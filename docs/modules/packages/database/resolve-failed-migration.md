# Resolve Failed Migration - Railway Database

## Problem (P3009 / deploy crash loop)

Prisma reports failed migrations in `_prisma_migrations` (`finished_at IS NULL`). New deploys will not apply until those rows are cleared.

Your logs also showed:

- **P1001** — transient “Can't reach database” on `switchyard.proxy.rlwy.net` *after* `wait-for-database` already connected
- **P3011** — old startup tried `prisma migrate resolve --rolled-back 20260215_sole_memory_links` after the row was already deleted

## Automatic (current Railway start)

`railway.json` start command:

1. `wait-for-database.js` — retry connect
2. `resolve-failed-migration.js` — **delete all unfinished** migration rows (`finished_at IS NULL`)
3. `migrate:deploy:railway` → `migrate-deploy-with-retry.js` — `prisma migrate deploy` with retries for P1001
4. seed → start API

Redeploy after this lands. No manual SQL required in the common case.

## Manual options (if needed)

**Clear all unfinished rows:**
```bash
DATABASE_URL="postgresql://..." node packages/database/scripts/resolve-failed-migration.js
```

**Clear one name:**
```bash
DATABASE_URL="postgresql://..." node packages/database/scripts/resolve-failed-migration.js 20260215_sole_memory_links
```

**SQL (TCP proxy / public URL):**
```sql
DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL;
```

## Notes

- Clearing unfinished rows does **not** invent applied history. If schema is already current, `migrate deploy` reports “No pending migrations.”
- If a migration was *partially* applied and re-run fails with “already exists,” fix that migration SQL to be idempotent (or mark applied with `prisma migrate resolve --applied <name>` after verifying schema).

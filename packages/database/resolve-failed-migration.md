# Resolve Failed Migration - Railway Database

## Problem (P3009)
Prisma reports: "migrate found failed migrations in the target database, new migrations will not be applied."

## Solution for `20260215_sole_memory_links`

### Automatic (No manual steps)

The Railway build uses `migrate:deploy:railway`, which runs `prisma migrate resolve --rolled-back` before `migrate deploy`. **Just push and redeploy** — the failed migration will be cleared and the idempotent migration will run successfully.

### Manual options (if needed)

**Prisma resolve** (requires DATABASE_URL):
```bash
DATABASE_URL="postgresql://..." pnpm db:migrate:resolve -- --rolled-back "20260215_sole_memory_links"
```

**Node script** (deletes failed record via Prisma):
```bash
DATABASE_URL="postgresql://..." node packages/database/scripts/resolve-failed-migration.js 20260215_sole_memory_links
```

**External SQL client**: Connect to Railway PostgreSQL via TCP Proxy (DATABASE_PUBLIC_URL) using pgAdmin, DBeaver, or `psql`, then run:
```sql
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260215_sole_memory_links';
```

## Legacy: `20250110_add_board_domain_fkey`

```sql
DELETE FROM "_prisma_migrations" 
WHERE migration_name IN ('20250110_add_board_domain_fkey', '20250110_add_board_domain_fkey_fixed');
```


# Postgres connection pooling (Railway + Prisma)

## Why this exists

Railway Postgres has a low `max_connections` budget. Each `PrismaClient` opens its **own** pool. One human user can still exhaust the database when:

- the API created dozens of `new PrismaClient()` instances (fixed — use the shared singleton)
- local `pnpm -F keeper-api run dev` and production both point at the same Railway DB
- a deploy runs `prisma migrate deploy` while the live API still holds every slot

Symptom: `FATAL: sorry, too many clients already` during pre-deploy / migrate.

## Architecture

| Variable | Used by | Points at |
|---|---|---|
| `DATABASE_URL` | API runtime (`PrismaClient`) | **PgBouncer** pooled URL on Railway |
| `DIRECT_URL` | `prisma migrate`, seed, studio | **Direct** Postgres URL (never the pooler) |
| `PRISMA_CONNECTION_LIMIT` | App pool size (default `5`) | Appended to `DATABASE_URL` as `connection_limit` |

Schema (`prisma/schema.prisma`):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Railway setup (do this once)

1. Open the **Postgres** service → **Database → Config → Connection Pooling** → **Add PgBouncer**.
2. Copy the **pooled** connection URL Railway exposes for PgBouncer.
3. On the **API** service variables:
   - `DATABASE_URL` = pooled PgBouncer URL  
     (optional: ensure host/port is the pooler; our client also sets `pgbouncer=true` when detected)
   - `DIRECT_URL` = the original **direct** Postgres URL (non-pooled)
   - `PRISMA_CONNECTION_LIMIT=5` (optional; default is 5)
4. Redeploy the API.

Until PgBouncer is added, you can omit `DIRECT_URL` — deploy scripts derive it from `DATABASE_URL`. Setting both explicitly is still recommended once PgBouncer is on.

If a Railway **Pre-Deploy Command** runs `pnpm … prisma migrate deploy`, that path now goes through the same wrapper (the `@keeper/database` `prisma` script). Prefer `pnpm --filter @keeper/database run migrate:deploy`.

## Local development

In `.env`:

```env
DATABASE_URL="postgresql://…@localhost:5432/keeper_platform"
DIRECT_URL="postgresql://…@localhost:5432/keeper_platform"
PRISMA_CONNECTION_LIMIT="5"
```

If you point local API at Railway Postgres, you share the production connection budget — stop local API before deploys if migrate fails with “too many clients.”

## Code rules

- Import `import { prisma } from '@keeper/database'` — never `new PrismaClient()` in `apps/api`.
- Migrate/seed scripts go through `node scripts/run-with-direct-url.js …` so `DIRECT_URL` is always set in-process.

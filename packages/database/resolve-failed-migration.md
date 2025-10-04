# Resolve Failed Migration - Railway Database

## Problem
Migration `20250110_add_board_domain_fkey` failed because of type mismatch:
- Board.domainId was TEXT
- Domain.id is UUID
- Cannot create FK constraint between different types

## Solution

### Option 1: Via Railway CLI (Recommended)

```bash
# Connect to Railway PostgreSQL
railway run psql $DATABASE_URL

# Mark the failed migration as resolved
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20250110_add_board_domain_fkey';

# Exit
\q
```

### Option 2: Via Railway Dashboard

1. Go to Railway Dashboard → Your Project → Database
2. Open "Query" tab
3. Run this SQL:

```sql
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20250110_add_board_domain_fkey';
```

4. Deploy again - the new fixed migration will run

### Option 3: Prisma Resolve Command (if available locally)

```bash
cd packages/database
npx prisma migrate resolve --rolled-back 20250110_add_board_domain_fkey
```

## What the New Migration Does

The new migration (`20250110_add_board_domain_fkey_fixed`):

1. Drops the constraint if it exists (cleanup)
2. Converts Board.domainId from TEXT to UUID
3. Sets invalid domainIds to NULL
4. Adds the FK constraint properly

## After Resolution

1. Commit and push the changes
2. Railway will deploy
3. The new migration will run successfully
4. Board.domainId will be UUID type with FK constraint


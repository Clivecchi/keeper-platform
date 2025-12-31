# Design Board Template System Migration Guide

## Overview

This migration adds the Design Board template system to the Keeper platform, enabling reusable board templates for different Keeper Types.

## Schema Changes

### 1. Board Model
- Added `isTemplate` field (Boolean, default: false)
- Added relation to KeeperType as default template
- Added relation to KeeperRecord as custom board

### 2. KeeperType Model
- Added `defaultBoardTemplateId` field (optional UUID)
- Added `defaultBoardTemplate` relation to Board

### 3. KeeperRecord Model (NEW)
- New generic record model for future extensibility
- Fields: id, typeId, customBoardId, data (JSON), timestamps
- Relations to KeeperType and Board

## Migration Steps

### 1. Generate Migration

```bash
cd packages/database
npx prisma migrate dev --name design-board-template-system
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your development database
- Regenerate the Prisma Client

### 2. Review Migration File

Check the generated SQL migration in `prisma/migrations/[timestamp]_design-board-template-system/migration.sql`:

- Verify that `isTemplate` column is added to `Board` table with default `false`
- Verify that `defaultBoardTemplateId` column is added to `KeeperType` table
- Verify that `KeeperRecord` table is created with proper foreign keys
- Verify indexes are created for performance

### 3. Run Seeds

After migration, run the seed script to create Design Board templates:

```bash
npx prisma db seed
```

This will create 6 template boards:
- Domain Management
- Agent Cockpit
- Journey Progress
- Quote
- Story
- Inventory

### 4. Verify Migration

Check that the migration was successful:

```bash
# Check database structure
npx prisma studio

# Or query directly
psql $DATABASE_URL -c "SELECT id, name, isTemplate FROM \"Board\" WHERE isTemplate = true;"
```

## Production Deployment

### 1. Deploy Schema Changes

```bash
# In production environment
cd packages/database
npx prisma migrate deploy
```

### 2. Run Seeds (if needed)

```bash
npx prisma db seed
```

## Rollback (if needed)

If you need to rollback the migration:

```bash
# This will rollback the last migration
npx prisma migrate resolve --rolled-back [migration-name]

# Then manually revert the schema.prisma changes
git checkout HEAD~1 packages/database/prisma/schema.prisma

# Generate a new migration
npx prisma migrate dev --name rollback-design-boards
```

## Files Changed

### Schema
- `packages/database/prisma/schema.prisma`

### Services
- `apps/api/src/services/boards/boardResolver.ts` (NEW)

### Types
- `apps/api/src/types/design-boards.ts` (NEW)
- `apps/web/src/features/board-studio/v0/types.ts`

### Seeds
- `packages/database/prisma/seeds/design-boards.seed.ts` (NEW)
- `packages/database/prisma/seed.ts` (updated)

### UI
- `apps/web/src/features/board-studio/v0/BoardStudio.tsx` (updated)

## Usage Examples

### Resolve Board for a Record

```typescript
import { resolveBoardForRecord } from '@/services/boards/boardResolver';

const result = await resolveBoardForRecord(prisma, recordId);
console.log(`Using board: ${result.board.name} (source: ${result.source})`);
```

### Get All Templates

```typescript
import { getAllBoardTemplates } from '@/services/boards/boardResolver';

const templates = await getAllBoardTemplates(prisma);
```

### Fork Template for Custom Board

```typescript
import { forkTemplateForRecord } from '@/services/boards/boardResolver';

const customBoard = await forkTemplateForRecord(
  prisma,
  recordId,
  templateBoardId,
  keeperId
);
```

## Testing

1. Create a test KeeperRecord
2. Verify it resolves to the correct default template
3. Fork a template to create a custom board
4. Verify the custom board takes precedence

## Notes

- Existing boards are NOT affected (isTemplate defaults to false)
- First-class entities (Keeper, Journey, Domain) can still have their own board resolution logic
- The KeeperRecord model is designed for future extensibility
- Templates are scoped by KeeperType for consistency


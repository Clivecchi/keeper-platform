# Database Seed Files

This directory contains SQL seed files for initializing the Keeper Platform database with essential data.

## Available Seeds

### ai-keeper-sole.sql
Seeds the first full KeeperType implementation for AI memory:
- **KeeperType**: `ai-keeper-sole` with SOLE memory pattern
- **Engagement Templates**: 5 system templates for SOLE memory interface
  - `reflection_journal` - Reflection Journal (memory)
  - `memorycard_generator` - MemoryCard Generator (memory)
  - `voice_panel` - Voice Panel (identity)
  - `echo_writer` - Echo Writer (memory)
  - `identity_logbook` - Identity Logbook (timeline)

### Other Seeds
- `kip-agents.sql` - KIP agents with model integration
- `kip-sessions.sql` - KIP session data
- `lead-agents.sql` - Lead agent configurations
- `coordinator-agent.sql` - Coordinator agent setup

## Running Seeds

### Option 1: Using psql (Recommended)
```bash
# Connect to your database and run the seed file
psql $DATABASE_URL -f packages/database/prisma/seeds/ai-keeper-sole.sql
```

### Option 2: Using Prisma after migration
```bash
# First, create and apply the migration for schema changes
pnpm db:migrate

# Then run the seed file manually
psql $DATABASE_URL -f packages/database/prisma/seeds/ai-keeper-sole.sql
```

### Option 3: Copy and paste SQL
Copy the SQL content from the seed file and execute it directly in your database client.

## Schema Updates Required

The ai-keeper-sole seed requires the following schema updates:

1. **KeeperType model**: Added `memoryPattern`, `system`, and `createdAt` fields
2. **engagement_templates model**: Added `system` field

These changes are already applied to the schema.prisma file and will be included in the next migration.

## Verification

After running the seed, verify the data was inserted correctly:

```sql
-- Check KeeperType
SELECT * FROM "KeeperType" WHERE id = 'ai-keeper-sole';

-- Check engagement templates
SELECT * FROM engagement_templates WHERE system = true;
```

## Next Steps

Once seeded, the platform will have:
- ✅ AI SOLE Keeper as the canonical KeeperType
- ✅ SOLE MemoryPattern supported in schema
- ✅ Engagement Templates seeded, protected, and queryable
- ✅ Foundation for Reflections UI and Kip assistant behavior development 
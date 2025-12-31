# Board Management Migration

## Overview

This migration adds board management fields to support the Domain Board Management system.

## Changes

### Board Model

Added three new fields:
- `config Json @default("{}")` - Flexible JSON field for board configuration (nav items, cover references, etc.)
- `viewerMode String? @default("public")` - Controls viewer access (public/member/editor)
- `isPublic Boolean @default(false)` - Whether the board is publicly visible

## How to Run

```bash
cd packages/database
npx prisma migrate dev --name add_board_management_fields
npx prisma generate
```

## After Migration

Run the seeds to create the engagement templates:

```bash
npx prisma db seed
```

This will create 6 new Domain Board Management templates:
1. domain.board.setViewerMode
2. domain.board.addFrame
3. domain.board.updateFrame
4. domain.board.setCover
5. domain.board.upsertPathwayNav
6. domain.board.publish

## Verification

Check that templates exist:

```sql
SELECT slug, label FROM engagement_templates 
WHERE slug LIKE 'domain.board.%';
```

Check that they're linked to Domain KeeperType:

```sql
SELECT kt.name, et.slug 
FROM keeper_type_engagement_templates ktet
JOIN engagement_templates et ON et.id = ktet.engagement_template_id
JOIN "KeeperType" kt ON kt.id = ktet.keeper_type_id
WHERE et.slug LIKE 'domain.board.%';
```

## Rollback

If needed, you can rollback this migration:

```bash
npx prisma migrate resolve --rolled-back add_board_management_fields
```

Then manually remove the templates if already seeded.


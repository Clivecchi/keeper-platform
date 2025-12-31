# Domain Board Management - Quick Start Guide

## 🚀 Setup (5 minutes)

### 1. Run Database Migration

```bash
cd packages/database
npx prisma migrate dev --name add_board_management_fields
npx prisma generate
```

### 2. Seed Templates

```bash
npx prisma db seed
```

Expected output:
```
🎯 Seeding Domain Board Management Templates...
  ✅ Created template: Set Board Viewer Mode
     - Added 4 fields
     - Linked to Domain KeeperType
  ✅ Created template: Add Board Frame
     - Added 7 fields
     - Linked to Domain KeeperType
  ...
```

### 3. Verify in Database

```sql
-- Check templates exist
SELECT slug, label FROM engagement_templates 
WHERE slug LIKE 'domain.board.%';

-- Should return 6 rows:
-- domain.board.setViewerMode
-- domain.board.addFrame
-- domain.board.updateFrame
-- domain.board.setCover
-- domain.board.upsertPathwayNav
-- domain.board.publish
```

## 🧪 Testing (10 minutes)

### Option A: Using Test Script (Recommended)

**PowerShell (Windows):**
```powershell
$env:AUTH_TOKEN="your-auth-token-here"
$env:TEST_BOARD_ID="board-uuid-here"
.\scripts\test-board-management.ps1 -Token $env:AUTH_TOKEN -BoardId $env:TEST_BOARD_ID
```

**Bash (Linux/Mac):**
```bash
export AUTH_TOKEN="your-auth-token-here"
export TEST_BOARD_ID="board-uuid-here"
./scripts/test-board-management.sh
```

### Option B: Manual cURL Testing

**Get a test board ID:**
```bash
# Option 1: Query database
psql $DATABASE_URL -c "SELECT id FROM \"Board\" WHERE \"domainId\" IS NOT NULL LIMIT 1;"

# Option 2: Create a test board via API (if implemented)
```

**Get auth token:**
```bash
# Login via your auth endpoint and extract token
# Example:
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token'
```

**Test endpoints:**

```bash
# Set these variables
TOKEN="your-token-here"
BOARD_ID="board-uuid-here"
API_URL="http://localhost:4000"

# Test 1: Set viewer mode (dry-run)
curl -X PATCH "$API_URL/api/boards/$BOARD_ID/viewer-mode" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mode":"public","dryRun":true}' | jq

# Test 2: Add frame (dry-run)
curl -X POST "$API_URL/api/boards/$BOARD_ID/frames" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"pattern":"dialogic","name":"Test Frame","dryRun":true}' | jq

# Test 3: Upsert navigation (dry-run)
curl -X PUT "$API_URL/api/boards/$BOARD_ID/nav" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"items":[{"label":"Home","href":"/"}],"dryRun":true}' | jq

# Test 4: Publish (dry-run)
curl -X PATCH "$API_URL/api/boards/$BOARD_ID/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"isPublic":true,"dryRun":true}' | jq
```

Expected responses:
```json
{
  "ok": true,
  "dryRun": true,
  "diff": {
    "boardId": "...",
    "message": "Would update viewer mode"
  }
}
```

## ✅ Acceptance Checklist

- [ ] Migration adds `config`, `viewerMode`, `isPublic` to Board model
- [ ] Seed creates 6 engagement templates
- [ ] Templates visible in Admin UI (if accessible)
- [ ] Templates linked to Domain KeeperType
- [ ] All endpoints return proper dry-run responses
- [ ] Authentication is enforced (401 without token)
- [ ] Permission checking works (403 for unauthorized domains)
- [ ] Idempotency works (same requestId returns cached result)
- [ ] Audit logs appear in console/database

## 🐛 Troubleshooting

### Seeds fail with "template already exists"
**Solution:** This is normal! Seeds are idempotent. It means templates were already created.

### "Authentication required" error
**Solution:** Ensure you're passing a valid Bearer token in the Authorization header.

### "ACCESS_DENIED" error
**Solution:** Your user doesn't have permission for that domain. Check `DomainPermission` table:
```sql
SELECT * FROM "DomainPermission" WHERE "userId" = 'your-user-id';
```

### "BOARD_NOT_FOUND" error
**Solution:** The board UUID doesn't exist. Query the database:
```sql
SELECT id, name, "domainId" FROM "Board" WHERE "domainId" IS NOT NULL;
```

### Idempotency not working
**Solution:** Check that `idempotencyMiddleware()` is in the middleware stack for the route. Look for the `cached: true` flag in responses.

## 📋 Common Operations

### Create a test board manually
```sql
INSERT INTO "Board" (
  id, "keeperId", name, slug, "domainId", config, "viewerMode", "isPublic"
) VALUES (
  gen_random_uuid(),
  'keeper-id-here',
  'Test Board',
  'test-board',
  'domain-id-here',
  '{}',
  'public',
  false
);
```

### Grant domain permission to user
```sql
INSERT INTO "DomainPermission" (
  id, "domainId", "userId", role, "grantedBy", "grantedAt"
) VALUES (
  gen_random_uuid(),
  'domain-id-here',
  'user-id-here',
  'admin',
  'user-id-here',
  NOW()
);
```

### Check audit logs
```sql
SELECT * FROM "DomainAudit" 
WHERE action LIKE 'domain.board.%' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

## 🎯 What to Test

### Minimum (5 min)
1. ✅ Run seeds successfully
2. ✅ One dry-run endpoint works
3. ✅ One actual operation works
4. ✅ Audit log appears

### Full Suite (15 min)
1. ✅ All 6 endpoints dry-run successfully
2. ✅ Set viewer mode (actual)
3. ✅ Add frame (actual)
4. ✅ Update frame (actual)
5. ✅ Set cover (actual)
6. ✅ Upsert nav (actual)
7. ✅ Publish board (actual)
8. ✅ Verify idempotency with same requestId
9. ✅ Verify 409 conflict with different input
10. ✅ Check all audit logs

## 📚 Next Steps

After successful testing:

1. **Integration**: Link templates to Agent SDK/UI
2. **Documentation**: Add to agent developer docs
3. **Monitoring**: Set up alerts for audit log patterns
4. **Enhancement**: Consider Redis for idempotency cache
5. **Media**: Integrate real media upload service

## 🔗 Related Docs

- [Full Implementation Guide](./DOMAIN_BOARD_MANAGEMENT_IMPLEMENTATION.md)
- [API Routes README](./apps/api/src/routes/README.md)
- [Boards Service README](./apps/api/src/services/boards/README.md)

---

**Status:** ✅ Ready for Testing  
**Last Updated:** 2025-11-09


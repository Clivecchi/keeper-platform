# Fix Domain Ownership & Edit Permissions

## 🔍 The Problem

You're listed as **Admin** in the Domain Members UI, but the console shows `role: "visitor"`. This means:

1. Either the `DomainPermission` record isn't in the database
2. Or the Domain Owner is someone else
3. Or there's a mismatch in the user/domain IDs

## 📊 Two Permission Systems

### System 1: Domain Owner (`Domain.ownerId`)
- **Single owner** per domain
- Set in the `domains` table
- Primary control

### System 2: Domain Members (`DomainPermission` table)  
- **Multiple members** with roles
- For collaboration
- Roles: admin, user, viewer

## 🔧 Fix Options

### Option 1: Make Yourself the Domain Owner (Recommended)

Run this SQL in your database:

```sql
-- First, find your user ID
SELECT id, email FROM users WHERE email = 'clivecchi@gmail.com';
-- Copy the ID (it will be a UUID like '123e4567-e89b-12d3-a456-426614174000')

-- Second, update the domain owner
UPDATE "Domain" 
SET "ownerId" = 'YOUR_USER_ID_HERE'
WHERE slug = 'default';

-- Verify it worked
SELECT d.name, d.slug, u.email as owner_email
FROM "Domain" d
LEFT JOIN users u ON d."ownerId" = u.id
WHERE d.slug = 'default';
```

### Option 2: Fix the DomainPermission Record

If you want to stay as a member (not owner):

```sql
-- Find your user ID and domain ID
SELECT u.id as user_id, d.id as domain_id
FROM users u, "Domain" d
WHERE u.email = 'clivecchi@gmail.com'
  AND d.slug = 'default';

-- Check if permission exists
SELECT * FROM "DomainPermission"
WHERE "userId" = 'YOUR_USER_ID'
  AND "domainId" = 'YOUR_DOMAIN_ID';

-- If it doesn't exist, create it:
INSERT INTO "DomainPermission" (
  id,
  "domainId",
  "userId",
  role,
  permissions,
  "grantedBy",
  "grantedAt"
)
VALUES (
  gen_random_uuid(),
  'YOUR_DOMAIN_ID',
  'YOUR_USER_ID',
  'admin',
  ARRAY['read', 'write', 'admin'],
  'YOUR_USER_ID',  -- Self-granted
  NOW()
);

-- If it exists but wrong role, update it:
UPDATE "DomainPermission"
SET role = 'admin',
    permissions = ARRAY['read', 'write', 'admin']
WHERE "userId" = 'YOUR_USER_ID'
  AND "domainId" = 'YOUR_DOMAIN_ID';
```

### Option 3: Update the Permission Logic

Alternatively, I can update the code to treat `Domain.ownerId` === current user as having admin rights automatically.

```typescript
// In board-data.ts, change this:
if (userId) {
  const perm = await permissionService.checkPermission({
    userId,
    domainId,
    permission: 'read'
  });
  
  if (perm.hasPermission) {
    userPermissions.canEdit = perm.permission === 'admin' || perm.permission === 'write';
    userPermissions.role = perm.permission || 'visitor';
  }
}

// To this:
if (userId) {
  // Check if user is domain owner
  const isOwner = domain.ownerId === userId;
  
  if (isOwner) {
    userPermissions.canEdit = true;
    userPermissions.role = 'owner';
  } else {
    // Check DomainPermission table
    const perm = await permissionService.checkPermission({
      userId,
      domainId,
      permission: 'read'
    });
    
    if (perm.hasPermission) {
      userPermissions.canEdit = perm.permission === 'admin' || perm.permission === 'write';
      userPermissions.role = perm.permission || 'visitor';
    }
  }
}
```

## 🎯 Recommended Solution

**Option 1 + Code Fix** - Make yourself the owner AND update the code to check `Domain.ownerId` first.

This way:
- ✅ You get immediate edit access
- ✅ The system properly recognizes domain owners
- ✅ Future domains will work correctly

## 🔍 Diagnostic Query

I've created `check-permissions.sql` - run it to see your current permissions state.

```bash
# Connect to your database
psql $DATABASE_URL -f check-permissions.sql
```

This will show you:
1. Your user ID
2. The domain ID
3. Who the current owner is
4. What DomainPermission records exist

## ⚠️ Important Notes

1. **The UI shows you as Admin** - This is in the DomainPermission table
2. **The API returns role: "visitor"** - This means it's not finding that record
3. **There's likely a data inconsistency** - The UI and API are seeing different data

Let me know which option you want to pursue, or send me the results of the diagnostic query!


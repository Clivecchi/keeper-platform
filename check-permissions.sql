-- Check Domain Ownership and Permissions
-- Run this in your database to see what's wrong

-- 1. Find your user ID
SELECT id, email, name 
FROM users 
WHERE email = 'clivecchi@gmail.com';

-- 2. Find the "default" domain
SELECT id, name, slug, "ownerId" 
FROM "Domain" 
WHERE slug = 'default';

-- 3. Check if you're the owner
SELECT 
  d.name as domain_name,
  d.slug,
  d."ownerId" as domain_owner_id,
  u.email as owner_email,
  (SELECT email FROM users WHERE id = 'YOUR_USER_ID_HERE') as your_email,
  CASE 
    WHEN d."ownerId" = 'YOUR_USER_ID_HERE' THEN 'YES - YOU ARE OWNER'
    ELSE 'NO - NOT OWNER'
  END as are_you_owner
FROM "Domain" d
LEFT JOIN users u ON d."ownerId" = u.id
WHERE d.slug = 'default';

-- 4. Check DomainPermission table
SELECT 
  dp."domainId",
  dp."userId",
  dp.role,
  dp.permissions,
  u.email as user_email,
  d.name as domain_name
FROM "DomainPermission" dp
LEFT JOIN users u ON dp."userId" = u.id
LEFT JOIN "Domain" d ON dp."domainId" = d.id
WHERE u.email = 'clivecchi@gmail.com'
  AND d.slug = 'default';

-- 5. List ALL permissions for the default domain
SELECT 
  dp.role,
  dp.permissions,
  u.email as user_email,
  u.name as user_name
FROM "DomainPermission" dp
LEFT JOIN users u ON dp."userId" = u.id
LEFT JOIN "Domain" d ON dp."domainId" = d.id
WHERE d.slug = 'default'
ORDER BY dp.role;


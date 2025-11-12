-- Check all domains and their custom domains
SELECT 
  name,
  slug,
  "customDomain",
  "customDomainVerified",
  "ownerId",
  (SELECT email FROM users WHERE id = "Domain"."ownerId") as owner_email,
  "createdAt",
  "isActive"
FROM "Domain"
ORDER BY "createdAt" ASC;

-- Check which domain you own
SELECT 
  d.name,
  d.slug,
  d."customDomain",
  CASE 
    WHEN d."ownerId" = (SELECT id FROM users WHERE email = 'clivecchi@gmail.com') 
    THEN '✅ YOU OWN THIS'
    ELSE '❌ Someone else owns this'
  END as ownership
FROM "Domain" d
ORDER BY d."createdAt";

-- Check for custom domain conflicts
SELECT 
  "customDomain",
  COUNT(*) as domain_count,
  string_agg(name || ' (' || slug || ')', ', ') as domains_using_it
FROM "Domain"
WHERE "customDomain" IS NOT NULL
GROUP BY "customDomain"
HAVING COUNT(*) > 1;


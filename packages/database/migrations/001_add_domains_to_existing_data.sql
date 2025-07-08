-- Migration: Add Domains to Existing Data
-- This script migrates existing Keeper platform data to the new domain-based architecture
-- Run this migration after deploying the new domain schema

-- ===================================================================
-- STEP 1: Create default domains for existing users
-- ===================================================================

-- Create a default domain for each existing user who doesn't have one
INSERT INTO "Domain" (
    id,
    name,
    slug,
    "slugHistory",
    description,
    "isPublic",
    "allowRequests",
    categories,
    "customDomain",
    "customDomainVerified",
    "verificationToken",
    "verificationMethod",
    "verifiedAt",
    status,
    "suspendedAt",
    "suspendedBy",
    "suspensionReason",
    features,
    limits,
    subscription,
    "ownerId",
    "isActive",
    "createdAt",
    "updatedAt",
    theme,
    settings
)
SELECT 
    gen_random_uuid() as id,
    CASE 
        WHEN u.name IS NOT NULL AND u.name != '' THEN u.name || '''s Keeper'
        WHEN u.email IS NOT NULL THEN split_part(u.email, '@', 1) || '''s Keeper'
        ELSE 'My Keeper'
    END as name,
    CASE 
        WHEN u.name IS NOT NULL AND u.name != '' THEN 
            lower(regexp_replace(u.name, '[^a-zA-Z0-9]', '-', 'g'))
        WHEN u.email IS NOT NULL THEN 
            lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
        ELSE 'user-' || substring(u.id::text, 1, 8)
    END as slug,
    ARRAY[]::text[] as "slugHistory",
    'Auto-generated domain for existing user' as description,
    false as "isPublic",
    false as "allowRequests",
    ARRAY['personal']::text[] as categories,
    null as "customDomain",
    false as "customDomainVerified",
    null as "verificationToken",
    null as "verificationMethod",
    null as "verifiedAt",
    'active' as status,
    null as "suspendedAt",
    null as "suspendedBy",
    null as "suspensionReason",
    jsonb_build_object(
        'kip_enabled', true,
        'custom_themes', false,
        'analytics_enabled', true,
        'api_access_enabled', true,
        'collaboration_enabled', false
    ) as features,
    jsonb_build_object(
        'max_keepers', 50,
        'max_journeys', 100,
        'max_moments', 1000,
        'max_users', 10,
        'storage_limit_mb', 1000
    ) as limits,
    'free' as subscription,
    u.id as "ownerId",
    true as "isActive",
    COALESCE(u."createdAt", now()) as "createdAt",
    now() as "updatedAt",
    jsonb_build_object() as theme,
    jsonb_build_object(
        'migration_source', 'existing_user',
        'migration_date', now()
    ) as settings
FROM users u
WHERE u.id NOT IN (
    SELECT DISTINCT "ownerId" FROM "Domain" WHERE "ownerId" IS NOT NULL
)
AND u.id IS NOT NULL;

-- ===================================================================
-- STEP 2: Handle slug conflicts
-- ===================================================================

-- Create a function to resolve slug conflicts
CREATE OR REPLACE FUNCTION resolve_slug_conflicts()
RETURNS void AS $$
DECLARE
    conflict_record RECORD;
    new_slug TEXT;
    counter INTEGER;
BEGIN
    -- Find domains with duplicate slugs
    FOR conflict_record IN
        SELECT slug, array_agg(id) as domain_ids
        FROM "Domain"
        GROUP BY slug
        HAVING count(*) > 1
    LOOP
        -- Keep the first domain with the original slug
        -- Add suffixes to the others
        counter := 1;
        
        FOR i IN 2..array_length(conflict_record.domain_ids, 1) LOOP
            new_slug := conflict_record.slug || '-' || counter;
            
            -- Make sure the new slug doesn't conflict either
            WHILE EXISTS (SELECT 1 FROM "Domain" WHERE slug = new_slug) LOOP
                counter := counter + 1;
                new_slug := conflict_record.slug || '-' || counter;
            END LOOP;
            
            -- Update the domain with the new slug
            UPDATE "Domain" 
            SET slug = new_slug,
                "slugHistory" = "slugHistory" || ARRAY[conflict_record.slug]
            WHERE id = conflict_record.domain_ids[i];
            
            counter := counter + 1;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the conflict resolution
SELECT resolve_slug_conflicts();

-- Drop the temporary function
DROP FUNCTION resolve_slug_conflicts();

-- ===================================================================
-- STEP 3: Create domain permissions for existing users
-- ===================================================================

-- Create admin permissions for domain owners
INSERT INTO "DomainPermission" (
    id,
    "domainId",
    "userId",
    role,
    permissions,
    "grantedBy",
    "grantedAt",
    "expiresAt"
)
SELECT 
    gen_random_uuid() as id,
    d.id as "domainId",
    d."ownerId" as "userId",
    'admin' as role,
    ARRAY['read', 'write', 'share', 'admin', 'invite', 'delete'] as permissions,
    d."ownerId" as "grantedBy",
    d."createdAt" as "grantedAt",
    null as "expiresAt"
FROM "Domain" d
WHERE d."ownerId" IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "DomainPermission" dp 
    WHERE dp."domainId" = d.id AND dp."userId" = d."ownerId"
);

-- ===================================================================
-- STEP 4: Associate existing content with domains
-- ===================================================================

-- Update Keepers to belong to user domains
UPDATE "Keeper" 
SET "domainId" = d.id
FROM "Domain" d
WHERE "Keeper"."userId" = d."ownerId"
AND "Keeper"."domainId" IS NULL;

-- Update Journeys to belong to user domains
UPDATE "Journey" 
SET "domainId" = d.id
FROM "Domain" d
WHERE "Journey"."userId" = d."ownerId"
AND "Journey"."domainId" IS NULL;

-- Update Moments to belong to user domains
UPDATE "Moment" 
SET "domainId" = d.id
FROM "Domain" d
WHERE "Moment"."userId" = d."ownerId"
AND "Moment"."domainId" IS NULL;

-- ===================================================================
-- STEP 5: Create default theme assignments
-- ===================================================================

-- Ensure all users have the default theme assigned
UPDATE users 
SET "preferredThemeId" = (
    SELECT id FROM "Theme" WHERE name = 'Keeper Classic' LIMIT 1
)
WHERE "preferredThemeId" IS NULL
AND EXISTS (SELECT 1 FROM "Theme" WHERE name = 'Keeper Classic');

-- ===================================================================
-- STEP 6: Initialize SOLE memory scopes
-- ===================================================================

-- Create domain-scoped memory entries for existing AI interactions
INSERT INTO "SoleMemoryScope" (
    id,
    "domainId",
    "keeperId",
    "memoryType",
    "scopeKey",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid() as id,
    d.id as "domainId",
    k.id as "keeperId",
    'keeper_context' as "memoryType",
    'keeper_' || k.id as "scopeKey",
    true as "isActive",
    k."createdAt" as "createdAt",
    now() as "updatedAt"
FROM "Domain" d
JOIN "Keeper" k ON k."domainId" = d.id
WHERE NOT EXISTS (
    SELECT 1 FROM "SoleMemoryScope" sms 
    WHERE sms."domainId" = d.id AND sms."keeperId" = k.id
);

-- ===================================================================
-- STEP 7: Create domain usage tracking entries
-- ===================================================================

-- Create initial usage entries for domain creation
INSERT INTO "DomainUsage" (
    id,
    "domainId",
    "userId",
    action,
    metadata,
    timestamp,
    "ipAddress",
    "userAgent"
)
SELECT 
    gen_random_uuid() as id,
    d.id as "domainId",
    d."ownerId" as "userId",
    'migration_create_domain' as action,
    jsonb_build_object(
        'migration_type', 'existing_user',
        'original_user_id', d."ownerId",
        'keepers_count', COALESCE(k.keeper_count, 0),
        'journeys_count', COALESCE(j.journey_count, 0),
        'moments_count', COALESCE(m.moment_count, 0)
    ) as metadata,
    d."createdAt" as timestamp,
    null as "ipAddress",
    'Migration Script v1.0' as "userAgent"
FROM "Domain" d
LEFT JOIN (
    SELECT "domainId", count(*) as keeper_count
    FROM "Keeper"
    GROUP BY "domainId"
) k ON k."domainId" = d.id
LEFT JOIN (
    SELECT "domainId", count(*) as journey_count
    FROM "Journey"
    GROUP BY "domainId"
) j ON j."domainId" = d.id
LEFT JOIN (
    SELECT "domainId", count(*) as moment_count
    FROM "Moment"
    GROUP BY "domainId"
) m ON m."domainId" = d.id
WHERE d.settings->>'migration_source' = 'existing_user';

-- ===================================================================
-- STEP 8: Validation and cleanup
-- ===================================================================

-- Create a function to validate the migration
CREATE OR REPLACE FUNCTION validate_domain_migration()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    count_expected INTEGER,
    count_actual INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check 1: All users have domains
    RETURN QUERY
    SELECT 
        'users_with_domains'::TEXT as check_name,
        CASE 
            WHEN user_count = domain_count THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        user_count as count_expected,
        domain_count as count_actual,
        'All users should have at least one domain' as details
    FROM (
        SELECT 
            (SELECT count(*) FROM users) as user_count,
            (SELECT count(DISTINCT "ownerId") FROM "Domain") as domain_count
    ) counts;

    -- Check 2: All domains have permissions
    RETURN QUERY
    SELECT 
        'domains_with_permissions'::TEXT as check_name,
        CASE 
            WHEN domain_count = permission_count THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        domain_count as count_expected,
        permission_count as count_actual,
        'All domains should have owner permissions' as details
    FROM (
        SELECT 
            (SELECT count(*) FROM "Domain") as domain_count,
            (SELECT count(DISTINCT "domainId") FROM "DomainPermission") as permission_count
    ) counts;

    -- Check 3: All content has domains
    RETURN QUERY
    SELECT 
        'content_with_domains'::TEXT as check_name,
        CASE 
            WHEN orphaned_count = 0 THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        0 as count_expected,
        orphaned_count as count_actual,
        'No content should be orphaned' as details
    FROM (
        SELECT 
            (SELECT count(*) FROM "Keeper" WHERE "domainId" IS NULL) +
            (SELECT count(*) FROM "Journey" WHERE "domainId" IS NULL) +
            (SELECT count(*) FROM "Moment" WHERE "domainId" IS NULL) as orphaned_count
    ) counts;

    -- Check 4: No duplicate slugs
    RETURN QUERY
    SELECT 
        'unique_slugs'::TEXT as check_name,
        CASE 
            WHEN duplicate_count = 0 THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        0 as count_expected,
        duplicate_count as count_actual,
        'All domain slugs should be unique' as details
    FROM (
        SELECT count(*) as duplicate_count
        FROM (
            SELECT slug, count(*) as cnt
            FROM "Domain"
            GROUP BY slug
            HAVING count(*) > 1
        ) duplicates
    ) counts;
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_domain_migration();

-- Drop the validation function
DROP FUNCTION validate_domain_migration();

-- ===================================================================
-- STEP 9: Create migration log entry
-- ===================================================================

-- Log the migration completion
INSERT INTO "DomainUsage" (
    id,
    "domainId",
    "userId",
    action,
    metadata,
    timestamp,
    "ipAddress",
    "userAgent"
)
VALUES (
    gen_random_uuid(),
    null,
    null,
    'migration_completed',
    jsonb_build_object(
        'migration_script', '001_add_domains_to_existing_data.sql',
        'migration_version', '1.0',
        'total_domains_created', (SELECT count(*) FROM "Domain" WHERE settings->>'migration_source' = 'existing_user'),
        'total_permissions_created', (SELECT count(*) FROM "DomainPermission"),
        'total_content_migrated', (
            SELECT 
                (SELECT count(*) FROM "Keeper" WHERE "domainId" IS NOT NULL) +
                (SELECT count(*) FROM "Journey" WHERE "domainId" IS NOT NULL) +
                (SELECT count(*) FROM "Moment" WHERE "domainId" IS NOT NULL)
        ),
        'migration_timestamp', now()
    ),
    now(),
    null,
    'Migration Script v1.0'
);

-- ===================================================================
-- STEP 10: Update statistics
-- ===================================================================

-- Refresh any materialized views or statistics
-- (Add specific commands if your application uses them)

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_domain_owner ON "Domain"("ownerId");
CREATE INDEX IF NOT EXISTS idx_domain_slug ON "Domain"(slug);
CREATE INDEX IF NOT EXISTS idx_domain_custom_domain ON "Domain"("customDomain");
CREATE INDEX IF NOT EXISTS idx_domain_permission_user ON "DomainPermission"("userId");
CREATE INDEX IF NOT EXISTS idx_domain_permission_domain ON "DomainPermission"("domainId");
CREATE INDEX IF NOT EXISTS idx_domain_usage_domain ON "DomainUsage"("domainId");
CREATE INDEX IF NOT EXISTS idx_domain_usage_timestamp ON "DomainUsage"(timestamp);
CREATE INDEX IF NOT EXISTS idx_sole_memory_scope_domain ON "SoleMemoryScope"("domainId");

-- ===================================================================
-- MIGRATION COMPLETE
-- ===================================================================

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Domain migration completed successfully!';
    RAISE NOTICE 'Total domains created: %', (SELECT count(*) FROM "Domain");
    RAISE NOTICE 'Total permissions created: %', (SELECT count(*) FROM "DomainPermission");
    RAISE NOTICE 'Total content items migrated: %', (
        (SELECT count(*) FROM "Keeper" WHERE "domainId" IS NOT NULL) +
        (SELECT count(*) FROM "Journey" WHERE "domainId" IS NOT NULL) +
        (SELECT count(*) FROM "Moment" WHERE "domainId" IS NOT NULL)
    );
END $$; 
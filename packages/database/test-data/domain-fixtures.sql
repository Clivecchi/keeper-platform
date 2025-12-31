-- Domain Layer Test Fixtures
-- This file creates comprehensive test data for domain functionality

-- First, let's create test users if they don't exist
INSERT INTO users (id, email, name, createdAt, updatedAt) VALUES
  ('user-1', 'alice@example.com', 'Alice Johnson', NOW(), NOW()),
  ('user-2', 'bob@example.com', 'Bob Smith', NOW(), NOW()),
  ('user-3', 'charlie@example.com', 'Charlie Brown', NOW(), NOW()),
  ('user-4', 'diana@example.com', 'Diana Prince', NOW(), NOW()),
  ('user-5', 'eve@example.com', 'Eve Chen', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test domains with various configurations
INSERT INTO "Domain" (id, name, slug, "slugHistory", "customDomain", "customDomainVerified", "verificationToken", "verificationMethod", "verifiedAt", status, features, limits, "isPublic", description, "allowRequests", categories, "ownerId", "isActive", "createdAt", "updatedAt", theme, settings) VALUES
  -- Personal domain (verified custom domain)
  ('domain-1', 'Alice Family', 'alice-family', '{}', 'family.example.com', true, 'verify-token-1', 'DNS_TXT', NOW() - INTERVAL '1 day', 'active', '{"kip_enabled": true, "custom_themes": true}', '{"max_keepers": 50, "max_users": 10}', false, 'Our family memories and moments', false, '{"family"}', 'user-1', true, NOW() - INTERVAL '7 days', NOW(), '{"primaryColor": "#3498db"}', '{"timezone": "America/New_York"}'),
  
  -- Team domain (public, unverified custom domain)
  ('domain-2', 'Team Alpha', 'team-alpha', '{"old-team-name"}', 'team.example.com', false, 'verify-token-2', 'CNAME', NULL, 'active', '{"kip_enabled": true, "custom_themes": false}', '{"max_keepers": 100, "max_users": 25}', true, 'Collaborative workspace for Team Alpha', true, '{"team", "work"}', 'user-2', true, NOW() - INTERVAL '5 days', NOW(), '{"primaryColor": "#e74c3c"}', '{"timezone": "UTC"}'),
  
  -- Creative domain (no custom domain)
  ('domain-3', 'Creative Hub', 'creative-hub', '{}', NULL, false, NULL, NULL, NULL, 'active', '{"kip_enabled": true, "custom_themes": true}', '{"max_keepers": 75, "max_users": 15}', true, 'A space for creative collaboration', true, '{"creative", "art"}', 'user-3', true, NOW() - INTERVAL '3 days', NOW(), '{"primaryColor": "#9b59b6"}', '{"timezone": "Europe/London"}'),
  
  -- Suspended domain
  ('domain-4', 'Suspended Domain', 'suspended-domain', '{}', NULL, false, NULL, NULL, NULL, 'suspended', '{"kip_enabled": false}', '{"max_keepers": 10, "max_users": 5}', false, 'This domain has been suspended', false, '{}', 'user-4', true, NOW() - INTERVAL '10 days', NOW(), '{}', '{}'),
  
  -- Archived domain
  ('domain-5', 'Old Project', 'old-project', '{"archived-2023", "legacy-project"}', 'old.example.com', true, 'verify-token-5', 'FILE', NOW() - INTERVAL '30 days', 'archived', '{"kip_enabled": false}', '{"max_keepers": 20, "max_users": 8}', false, 'Archived project from 2023', false, '{"archive"}', 'user-5', false, NOW() - INTERVAL '60 days', NOW(), '{}', '{}'),
  
  -- Premium domain with advanced features
  ('domain-6', 'Premium Workspace', 'premium-workspace', '{}', 'premium.example.com', true, 'verify-token-6', 'DNS_TXT', NOW() - INTERVAL '2 days', 'active', '{"kip_enabled": true, "custom_themes": true, "advanced_analytics": true, "white_label": true}', '{"max_keepers": 500, "max_users": 100}', true, 'Premium workspace with advanced features', true, '{"premium", "business"}', 'user-1', true, NOW() - INTERVAL '14 days', NOW(), '{"primaryColor": "#f39c12"}', '{"timezone": "America/Los_Angeles", "branding": {"logo": "https://example.com/logo.png"}}');

-- Create domain permissions
INSERT INTO "DomainPermission" (id, "domainId", "userId", role, permissions, "grantedBy", "grantedAt", "expiresAt") VALUES
  -- Alice's family domain permissions
  ('perm-1', 'domain-1', 'user-1', 'admin', '{"read", "write", "share", "admin"}', 'user-1', NOW() - INTERVAL '7 days', NULL),
  ('perm-2', 'domain-1', 'user-2', 'user', '{"read", "write"}', 'user-1', NOW() - INTERVAL '6 days', NULL),
  ('perm-3', 'domain-1', 'user-3', 'friend', '{"read"}', 'user-1', NOW() - INTERVAL '5 days', NOW() + INTERVAL '30 days'),
  
  -- Team Alpha permissions
  ('perm-4', 'domain-2', 'user-2', 'admin', '{"read", "write", "share", "admin"}', 'user-2', NOW() - INTERVAL '5 days', NULL),
  ('perm-5', 'domain-2', 'user-1', 'user', '{"read", "write", "share"}', 'user-2', NOW() - INTERVAL '4 days', NULL),
  ('perm-6', 'domain-2', 'user-3', 'user', '{"read", "write"}', 'user-2', NOW() - INTERVAL '3 days', NULL),
  ('perm-7', 'domain-2', 'user-4', 'connection', '{"read"}', 'user-2', NOW() - INTERVAL '2 days', NOW() + INTERVAL '7 days'),
  
  -- Creative Hub permissions
  ('perm-8', 'domain-3', 'user-3', 'admin', '{"read", "write", "share", "admin"}', 'user-3', NOW() - INTERVAL '3 days', NULL),
  ('perm-9', 'domain-3', 'user-1', 'user', '{"read", "write"}', 'user-3', NOW() - INTERVAL '2 days', NULL),
  ('perm-10', 'domain-3', 'user-5', 'user', '{"read", "write"}', 'user-3', NOW() - INTERVAL '1 day', NULL),
  
  -- Premium workspace permissions
  ('perm-11', 'domain-6', 'user-1', 'admin', '{"read", "write", "share", "admin"}', 'user-1', NOW() - INTERVAL '14 days', NULL),
  ('perm-12', 'domain-6', 'user-2', 'user', '{"read", "write", "share"}', 'user-1', NOW() - INTERVAL '10 days', NULL),
  ('perm-13', 'domain-6', 'user-3', 'user', '{"read", "write"}', 'user-1', NOW() - INTERVAL '8 days', NULL),
  ('perm-14', 'domain-6', 'user-4', 'user', '{"read", "write"}', 'user-1', NOW() - INTERVAL '6 days', NULL),
  ('perm-15', 'domain-6', 'user-5', 'connection', '{"read"}', 'user-1', NOW() - INTERVAL '4 days', NOW() + INTERVAL '14 days');

-- Create domain invitations
INSERT INTO "DomainInvitation" (id, "domainId", email, role, "invitedBy", token, "expiresAt", "acceptedAt", "createdAt") VALUES
  -- Pending invitations
  ('invite-1', 'domain-1', 'friend@example.com', 'friend', 'user-1', 'invite-token-1', NOW() + INTERVAL '7 days', NULL, NOW() - INTERVAL '1 day'),
  ('invite-2', 'domain-2', 'colleague@example.com', 'user', 'user-2', 'invite-token-2', NOW() + INTERVAL '5 days', NULL, NOW() - INTERVAL '2 days'),
  ('invite-3', 'domain-3', 'artist@example.com', 'user', 'user-3', 'invite-token-3', NOW() + INTERVAL '3 days', NULL, NOW() - INTERVAL '3 days'),
  
  -- Accepted invitations
  ('invite-4', 'domain-2', 'charlie@example.com', 'user', 'user-2', 'invite-token-4', NOW() + INTERVAL '7 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days'),
  ('invite-5', 'domain-6', 'diana@example.com', 'user', 'user-1', 'invite-token-5', NOW() + INTERVAL '14 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '8 days'),
  
  -- Expired invitations
  ('invite-6', 'domain-1', 'expired@example.com', 'user', 'user-1', 'invite-token-6', NOW() - INTERVAL '1 day', NULL, NOW() - INTERVAL '8 days');

-- Create cross-domain shares
INSERT INTO "CrossDomainShare" (id, "sourceDomainId", "targetDomainId", "contentType", "contentId", permissions, "expiresAt", "allowSubsharing", "requireApproval", "approvedAt", "approvedBy", "createdAt", "updatedAt") VALUES
  -- Active approved shares
  ('share-1', 'domain-1', 'domain-2', 'keeper', 'keeper-1', '{"view", "comment"}', NULL, false, true, NOW() - INTERVAL '1 day', 'user-2', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
  ('share-2', 'domain-2', 'domain-3', 'journey', 'journey-1', '{"view"}', NOW() + INTERVAL '30 days', false, true, NOW() - INTERVAL '2 days', 'user-3', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),
  ('share-3', 'domain-3', 'domain-1', 'moment', 'moment-1', '{"view", "comment"}', NULL, true, true, NOW() - INTERVAL '1 day', 'user-1', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
  
  -- Pending approval shares
  ('share-4', 'domain-1', 'domain-3', 'keeper', 'keeper-2', '{"view"}', NOW() + INTERVAL '14 days', false, true, NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('share-5', 'domain-6', 'domain-2', 'journey', 'journey-2', '{"view", "edit"}', NULL, false, true, NULL, NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  
  -- Expired shares
  ('share-6', 'domain-2', 'domain-1', 'moment', 'moment-2', '{"view"}', NOW() - INTERVAL '1 day', false, true, NOW() - INTERVAL '5 days', 'user-1', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days');

-- Create domain usage analytics
INSERT INTO "DomainUsage" (id, "domainId", "userId", action, metadata, timestamp, "ipAddress", "userAgent") VALUES
  -- Recent login activities
  ('usage-1', 'domain-1', 'user-1', 'login', '{"source": "web", "device": "desktop"}', NOW() - INTERVAL '1 hour', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  ('usage-2', 'domain-1', 'user-2', 'login', '{"source": "mobile", "device": "ios"}', NOW() - INTERVAL '2 hours', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'),
  ('usage-3', 'domain-2', 'user-2', 'login', '{"source": "web", "device": "desktop"}', NOW() - INTERVAL '30 minutes', '10.0.1.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  
  -- Content creation activities
  ('usage-4', 'domain-1', 'user-1', 'create_keeper', '{"keeper_type": "family", "name": "Summer Vacation"}', NOW() - INTERVAL '3 hours', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  ('usage-5', 'domain-2', 'user-3', 'create_journey', '{"journey_name": "Project Alpha", "keeper_id": "keeper-1"}', NOW() - INTERVAL '4 hours', '172.16.0.10', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
  ('usage-6', 'domain-3', 'user-3', 'create_moment', '{"moment_title": "Creative Breakthrough", "journey_id": "journey-1"}', NOW() - INTERVAL '5 hours', '172.16.0.10', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
  
  -- KIP interactions
  ('usage-7', 'domain-1', 'user-1', 'kip_interaction', '{"agent_id": "agent-1", "interaction_type": "query", "tokens": 150}', NOW() - INTERVAL '1 hour', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  ('usage-8', 'domain-2', 'user-2', 'kip_interaction', '{"agent_id": "agent-2", "interaction_type": "generation", "tokens": 300}', NOW() - INTERVAL '2 hours', '10.0.1.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  ('usage-9', 'domain-6', 'user-1', 'kip_interaction', '{"agent_id": "agent-premium", "interaction_type": "analysis", "tokens": 500}', NOW() - INTERVAL '30 minutes', '203.0.113.10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  
  -- Share activities
  ('usage-10', 'domain-1', 'user-1', 'share_content', '{"content_type": "keeper", "content_id": "keeper-1", "target_domain": "domain-2"}', NOW() - INTERVAL '3 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  ('usage-11', 'domain-2', 'user-2', 'approve_share', '{"share_id": "share-1", "action": "approved"}', NOW() - INTERVAL '1 day', '10.0.1.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  
  -- Administrative activities
  ('usage-12', 'domain-1', 'user-1', 'invite_user', '{"email": "friend@example.com", "role": "friend"}', NOW() - INTERVAL '1 day', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  ('usage-13', 'domain-2', 'user-2', 'update_domain_settings', '{"setting": "description", "old_value": "Team workspace", "new_value": "Collaborative workspace for Team Alpha"}', NOW() - INTERVAL '2 days', '10.0.1.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  
  -- Domain verification activities
  ('usage-14', 'domain-1', 'user-1', 'verify_domain', '{"domain": "family.example.com", "method": "DNS_TXT", "status": "success"}', NOW() - INTERVAL '1 day', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  ('usage-15', 'domain-2', 'user-2', 'verify_domain', '{"domain": "team.example.com", "method": "CNAME", "status": "pending"}', NOW() - INTERVAL '12 hours', '10.0.1.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

-- Create SOLE memory scopes for domain isolation
INSERT INTO "SoleMemoryScope" (id, "domainId", "agentId", "memoryData", "createdAt", "updatedAt") VALUES
  ('sole-1', 'domain-1', 'agent-1', '{"memories": [{"type": "family_context", "content": "Family-focused AI assistant for the Johnson family", "importance": 0.9}], "context": "family_domain", "personality": "warm_and_caring"}', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
  ('sole-2', 'domain-2', 'agent-2', '{"memories": [{"type": "team_context", "content": "Project management assistant for Team Alpha", "importance": 0.8}], "context": "team_domain", "personality": "professional_and_efficient"}', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours'),
  ('sole-3', 'domain-3', 'agent-3', '{"memories": [{"type": "creative_context", "content": "Creative collaboration assistant for artists", "importance": 0.85}], "context": "creative_domain", "personality": "inspiring_and_supportive"}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour'),
  ('sole-4', 'domain-6', 'agent-premium', '{"memories": [{"type": "premium_context", "content": "Advanced AI assistant with premium features", "importance": 0.95}], "context": "premium_domain", "personality": "expert_and_sophisticated", "advanced_features": true}', NOW() - INTERVAL '14 days', NOW() - INTERVAL '30 minutes');

-- Create domain transfers for testing transfer functionality
INSERT INTO "DomainTransfer" (id, "domainId", "fromOwnerId", "toOwnerId", token, "initiatedAt", "expiresAt", "approvedAt", "completedAt", "cancelledAt") VALUES
  -- Pending transfer
  ('transfer-1', 'domain-4', 'user-4', 'user-5', 'transfer-token-1', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', NULL, NULL, NULL),
  
  -- Completed transfer
  ('transfer-2', 'domain-5', 'user-4', 'user-5', 'transfer-token-2', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NULL),
  
  -- Cancelled transfer
  ('transfer-3', 'domain-2', 'user-2', 'user-1', 'transfer-token-3', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', NULL, NULL, NOW() - INTERVAL '2 days');

-- Create sample keepers associated with domains
INSERT INTO "Keeper" (id, title, purpose, "keeperType", "memoryPattern", "ownerId", "domainId", "createdAt", "updatedAt") VALUES
  ('keeper-1', 'Family Memories', 'Capturing our family moments and milestones', 'family', 'chronological', 'user-1', 'domain-1', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
  ('keeper-2', 'Team Alpha Project', 'Managing Team Alpha project deliverables', 'project', 'milestone_based', 'user-2', 'domain-2', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
  ('keeper-3', 'Creative Works', 'Showcasing artistic creations and inspirations', 'creative', 'theme_based', 'user-3', 'domain-3', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour'),
  ('keeper-4', 'Premium Portfolio', 'Professional portfolio with advanced features', 'portfolio', 'achievement_based', 'user-1', 'domain-6', NOW() - INTERVAL '14 days', NOW() - INTERVAL '30 minutes');

-- Create sample journeys associated with domains
INSERT INTO "Journey" (id, name, forward, "ownerId", "domainId", "keeperId", "createdAt", "updatedAt") VALUES
  ('journey-1', 'Summer Vacation 2024', 'Our amazing family vacation journey', 'user-1', 'domain-1', 'keeper-1', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
  ('journey-2', 'Project Alpha Phase 1', 'Initial development phase of Project Alpha', 'user-2', 'domain-2', 'keeper-2', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),
  ('journey-3', 'Art Exhibition Preparation', 'Preparing for the upcoming art exhibition', 'user-3', 'domain-3', 'keeper-3', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),
  ('journey-4', 'Portfolio Development', 'Building a comprehensive professional portfolio', 'user-1', 'domain-6', 'keeper-4', NOW() - INTERVAL '13 days', NOW() - INTERVAL '30 minutes');

-- Create sample moments associated with domains
INSERT INTO "Moment" (id, title, narrative, "ownerId", "domainId", "journeyId", "createdAt", "updatedAt") VALUES
  ('moment-1', 'Beach Day Fun', 'The kids built the most amazing sandcastle today!', 'user-1', 'domain-1', 'journey-1', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
  ('moment-2', 'First Sprint Complete', 'Successfully completed our first development sprint with all features delivered', 'user-2', 'domain-2', 'journey-2', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
  ('moment-3', 'Inspiration Strike', 'Found the perfect color palette for the exhibition piece', 'user-3', 'domain-3', 'journey-3', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
  ('moment-4', 'Client Success Story', 'Landed a major client project that will be featured in the portfolio', 'user-1', 'domain-6', 'journey-4', NOW() - INTERVAL '12 days', NOW() - INTERVAL '30 minutes');

-- Add some test data for theme assignments
UPDATE "Domain" SET theme = '{"primaryColor": "#3498db", "secondaryColor": "#2ecc71", "fontFamily": "Inter"}' WHERE id = 'domain-1';
UPDATE "Domain" SET theme = '{"primaryColor": "#e74c3c", "secondaryColor": "#f39c12", "fontFamily": "Roboto"}' WHERE id = 'domain-2';
UPDATE "Domain" SET theme = '{"primaryColor": "#9b59b6", "secondaryColor": "#1abc9c", "fontFamily": "Poppins"}' WHERE id = 'domain-3';
UPDATE "Domain" SET theme = '{"primaryColor": "#f39c12", "secondaryColor": "#e67e22", "fontFamily": "Montserrat", "premium": true}' WHERE id = 'domain-6';

-- Create some test scenarios for error handling and edge cases
INSERT INTO "Domain" (id, name, slug, "ownerId", status, "isActive", "createdAt", "updatedAt") VALUES
  -- Domain with minimal data (for testing defaults)
  ('domain-minimal', 'Minimal Domain', 'minimal-domain', 'user-1', 'active', true, NOW(), NOW()),
  
  -- Domain with very long name (for testing limits)
  ('domain-long', 'This is a very long domain name that tests the limits of what we can store in the database and how it displays in various parts of the user interface', 'very-long-domain-name', 'user-2', 'active', true, NOW(), NOW()),
  
  -- Domain with special characters in settings (for testing JSON handling)
  ('domain-special', 'Special Characters', 'special-chars', 'user-3', 'active', true, NOW(), NOW());

-- Update the special domain with complex JSON settings
UPDATE "Domain" SET 
  settings = '{"notifications": {"email": true, "sms": false}, "privacy": {"analytics": true, "cookies": false}, "integrations": {"slack": {"enabled": true, "webhook": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"}, "discord": {"enabled": false}}, "custom_css": ".keeper-theme { background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); }", "api_keys": {"external_service": "sk-test-123456789"}}',
  features = '{"advanced_sharing": true, "custom_integrations": true, "white_label": true, "analytics_dashboard": true, "api_access": true, "webhook_support": true}'
WHERE id = 'domain-special';

-- Create test data for error scenarios
INSERT INTO "DomainUsage" (id, "domainId", "userId", action, metadata, timestamp) VALUES
  -- Failed operations for testing error handling
  ('usage-error-1', 'domain-1', 'user-1', 'verify_domain_failed', '{"domain": "invalid.example.com", "method": "DNS_TXT", "error": "DNS record not found"}', NOW() - INTERVAL '1 day'),
  ('usage-error-2', 'domain-2', 'user-2', 'kip_interaction_failed', '{"agent_id": "agent-2", "error": "rate_limit_exceeded", "tokens_attempted": 1000}', NOW() - INTERVAL '2 hours'),
  ('usage-error-3', 'domain-3', 'user-3', 'share_content_failed', '{"content_type": "keeper", "content_id": "keeper-nonexistent", "error": "content_not_found"}', NOW() - INTERVAL '3 hours');

-- Final setup: Create indexes for performance (these would normally be in migrations)
-- Note: These are just for reference as they should be handled by Prisma migrations
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_slug_active ON "Domain"(slug) WHERE "isActive" = true;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_custom_verified ON "Domain"("customDomain") WHERE "customDomainVerified" = true;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_owner_active ON "Domain"("ownerId") WHERE "isActive" = true;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_permission_user_domain ON "DomainPermission"("userId", "domainId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domain_usage_analytics ON "DomainUsage"("domainId", "timestamp" DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cross_domain_share_approval ON "CrossDomainShare"("targetDomainId", "approvedAt");

-- Summary statistics for reference
SELECT 
  'Domain Test Fixtures Created' as status,
  (SELECT COUNT(*) FROM "Domain") as total_domains,
  (SELECT COUNT(*) FROM "DomainPermission") as total_permissions,
  (SELECT COUNT(*) FROM "CrossDomainShare") as total_shares,
  (SELECT COUNT(*) FROM "DomainUsage") as total_usage_records,
  (SELECT COUNT(*) FROM "DomainInvitation") as total_invitations; 
-- Board Seed Data for Keeper Platform
-- Creates sample records for all board types with brand-aligned content

-- First, ensure we have a default theme
INSERT INTO themes (id, label, slug, palette, default_mode, created_at, updated_at) 
VALUES (
  'default-keeper-theme',
  'Keeper Classic',
  'keeper-classic',
  '{"primary": "#3B82F6", "secondary": "#EFF6FF", "accent": "#1E40AF", "background": "#F8FAFC", "text": "#1F2937"}',
  'light',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create sample domain if it doesn't exist
INSERT INTO "Domain" (id, name, slug, "ownerId", status, "isActive", "createdAt", "updatedAt", features, settings)
VALUES (
  'keeper-platform-demo',
  'Keeper Platform Demo',
  'keeper-platform',
  'demo-user-1',
  'active',
  true,
  NOW(),
  NOW(),
  '{}',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- Create a demo user if it doesn't exist
INSERT INTO users (id, name, email, "createdAt", "updatedAt", "hashedPassword")
VALUES (
  'demo-user-1',
  'Keeper Demo User',
  'demo@keeper-platform.com',
  NOW(),
  NOW(),
  '$2a$10$example.hash.for.demo.user.only'
) ON CONFLICT (id) DO NOTHING;

-- 1. KEEPER TYPES SEED DATA
-- DevKeeper
INSERT INTO "KeeperType" (id, name, "memoryPattern", system, "createdAt")
VALUES (
  'devkeeper',
  'DevKeeper',
  'STRUCTURED',
  false,
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  "memoryPattern" = EXCLUDED."memoryPattern";

-- StoryKeeper
INSERT INTO "KeeperType" (id, name, "memoryPattern", system, "createdAt")
VALUES (
  'storykeeper',
  'StoryKeeper',
  'NARRATIVE',
  false,
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  "memoryPattern" = EXCLUDED."memoryPattern";

-- BizKeeper
INSERT INTO "KeeperType" (id, name, "memoryPattern", system, "createdAt")
VALUES (
  'bizkeeper',
  'BizKeeper',
  'STRATEGIC',
  false,
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  "memoryPattern" = EXCLUDED."memoryPattern";

-- 2. KIP AGENTS SEED DATA (for AgentBoard)
-- Kip - Lead Agent
INSERT INTO kip_agents (id, slug, name, purpose, model, agent_class, status, model_provider, visibility, tools, permissions, config, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kip',
  'Kip',
  'Kip is the Keeper Platform''s Lead Agent, guiding users with wisdom, humor, and clarity. Sincere, playful, and sharp — the embodiment of ''Building worth Keeping.''',
  'gpt-4',
  'Lead',
  'ready',
  'openai',
  'public',
  ARRAY['conversation', 'memory_management', 'task_coordination'],
  ARRAY['read', 'write', 'admin'],
  '{"tone": "professional", "responseLength": "medium", "expertise": "platform_guidance"}',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  updated_at = NOW();

-- Ceox - Personal Lead Agent
INSERT INTO kip_agents (id, slug, name, purpose, model, agent_class, status, model_provider, visibility, tools, permissions, config, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'ceox',
  'Ceox',
  'Focused on helping you navigate your most important journeys. Ceox serves as your Personal Lead Agent, bringing clarity to complex decisions and helping you build meaningful progress.',
  'gpt-4',
  'Personal',
  'ready',
  'openai',
  'shared',
  ARRAY['journey_planning', 'decision_support', 'progress_tracking'],
  ARRAY['read', 'write'],
  '{"tone": "supportive", "responseLength": "detailed", "expertise": "personal_growth"}',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  updated_at = NOW();

-- Kio - Protocol Agent
INSERT INTO kip_agents (id, slug, name, purpose, model, agent_class, status, model_provider, visibility, tools, permissions, config, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kio',
  'Kio',
  'Manages seamless AI-to-AI and AI-to-human coordination. Kio serves as the Keeper Interface Protocol Agent, ensuring smooth interactions across the platform.',
  'gpt-3.5-turbo',
  'Protocol',
  'ready',
  'openai',
  'private',
  ARRAY['protocol_management', 'coordination', 'interface_optimization'],
  ARRAY['read', 'admin'],
  '{"tone": "technical", "responseLength": "concise", "expertise": "system_coordination"}',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  updated_at = NOW();

-- 3. KEEPERS SEED DATA (for KeeperBoard)
-- First Keeper linked to DevKeeper type
INSERT INTO "Keeper" (id, title, purpose, "keeperTypeId", "keeperType", "ownerId", "domainId", "theme_id", "createdAt", "updatedAt")
VALUES (
  'keeper-dev-1',
  'Platform Development Keeper',
  'Manages the development and evolution of the Keeper Platform itself. Tracks features, bugs, architectural decisions, and development progress.',
  'devkeeper',
  'DevKeeper',
  'demo-user-1',
  'keeper-platform-demo',
  'default-keeper-theme',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  "updatedAt" = NOW();

-- Second Keeper for StoryKeeper
INSERT INTO "Keeper" (id, title, purpose, "keeperTypeId", "keeperType", "ownerId", "domainId", "theme_id", "createdAt", "updatedAt")
VALUES (
  'keeper-story-1',
  'Keeper Origin Stories',
  'Captures the narrative journey of building the Keeper Platform. Documents the vision, challenges overcome, and stories worth keeping.',
  'storykeeper',
  'StoryKeeper',
  'demo-user-1',
  'keeper-platform-demo',
  'default-keeper-theme',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  "updatedAt" = NOW();

-- 4. JOURNEYS SEED DATA (for JourneyBoard)
-- First Journey: "Begin... Again;"
INSERT INTO "Journey" (id, name, forward, "ownerId", "domainId", "createdAt", "updatedAt", "keeperId", "theme_id")
VALUES (
  'journey-begin-again',
  'Begin... Again;',
  'we join the story already in progress... Every ending is a beginning. Every pause, a chance to choose again. This journey captures the moments where we decide to continue, to build, to keep what matters.',
  'demo-user-1',
  'keeper-platform-demo',
  NOW(),
  NOW(),
  'keeper-story-1',
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  forward = EXCLUDED.forward,
  "updatedAt" = NOW();

-- Second Journey: Platform Evolution
INSERT INTO "Journey" (id, name, forward, "ownerId", "domainId", "createdAt", "updatedAt", "keeperId", "theme_id")
VALUES (
  'journey-platform-evolution',
  'Platform Evolution',
  'From concept to reality, tracking the technical and philosophical evolution of Keeper Platform. Each milestone represents not just code, but intention made manifest.',
  'demo-user-1',
  'keeper-platform-demo',
  NOW(),
  NOW(),
  'keeper-dev-1',
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  forward = EXCLUDED.forward,
  "updatedAt" = NOW();

-- 5. PATHS SEED DATA (connected to journeys)
-- Path 1: The Road
INSERT INTO "Path" (id, name, prelude, "ownerId", "journeyId", "keeperId", "theme_id")
VALUES (
  'path-the-road',
  'The Road',
  'A path well-worn, yet full of promise. Every step forward is both familiar and new, carrying the weight of what came before and the lightness of what could be.',
  'demo-user-1',
  'journey-begin-again',
  'keeper-story-1',
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  prelude = EXCLUDED.prelude;

-- Path 2: First Spark
INSERT INTO "Path" (id, name, prelude, "ownerId", "journeyId", "keeperId", "theme_id")
VALUES (
  'path-first-spark',
  'First Spark',
  'The moment the idea caught fire. Not the first idea, but the one that stuck. The one that whispered: this is worth keeping.',
  'demo-user-1',
  'journey-begin-again',
  'keeper-story-1',
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  prelude = EXCLUDED.prelude;

-- Path 3: Technical Foundation
INSERT INTO "Path" (id, name, prelude, "ownerId", "journeyId", "keeperId", "theme_id")
VALUES (
  'path-technical-foundation',
  'Technical Foundation',
  'Building the infrastructure that would support not just features, but dreams. Every architectural decision carries the weight of future possibilities.',
  'demo-user-1',
  'journey-platform-evolution',
  'keeper-dev-1',
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  prelude = EXCLUDED.prelude;

-- 6. MOMENTS SEED DATA (connected to paths and journeys)
-- Moment for "The Road" path
INSERT INTO "Moment" (id, title, narrative, "pathId", "ownerId", "domainId", "createdAt", "updatedAt", "theme_id")
VALUES (
  'moment-road-reflection',
  'Walking the Road',
  'Standing at the crossroads, looking back at the distance traveled and forward to the horizon. The road continues, as it always has, as it always will. But today, we choose to walk it with intention.',
  'path-the-road',
  'demo-user-1',
  'keeper-platform-demo',
  NOW(),
  NOW(),
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  narrative = EXCLUDED.narrative,
  "updatedAt" = NOW();

-- Moment for "First Spark" path
INSERT INTO "Moment" (id, title, narrative, "pathId", "ownerId", "domainId", "createdAt", "updatedAt", "theme_id")
VALUES (
  'moment-spark-ignition',
  'The Spark Ignites',
  'It started with a simple question: What if we built something worth keeping? Not just another platform, but a place where ideas could grow, where stories could live, where the important things wouldn''t get lost in the noise.',
  'path-first-spark',
  'demo-user-1',
  'keeper-platform-demo',
  NOW(),
  NOW(),
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  narrative = EXCLUDED.narrative,
  "updatedAt" = NOW();

-- Journey-level moment for "Begin... Again;"
INSERT INTO "Moment" (id, title, narrative, "journeyId", "ownerId", "domainId", "createdAt", "updatedAt", "theme_id")
VALUES (
  'moment-begin-again-reflection',
  'The Continuous Beginning',
  'Every day is a chance to begin again. Not to start over, but to continue with renewed purpose. The platform grows, the community expands, but the core remains: we are building something worth keeping.',
  'journey-begin-again',
  'demo-user-1',
  'keeper-platform-demo',
  NOW(),
  NOW(),
  'default-keeper-theme'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  narrative = EXCLUDED.narrative,
  "updatedAt" = NOW();

-- 7. ENGAGEMENT TEMPLATES (for KeeperType functionality)
-- Reflection Journal template
INSERT INTO engagement_templates (id, label, slug, type, "targetType", icon, style, config, system, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Reflection Journal',
  'reflection-journal',
  'memory',
  'keeper',
  '📝',
  '{"variant": "journal", "color": "blue"}',
  '{"fields": ["reflection", "topic", "tags"], "autoPromote": true}',
  true,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  "updatedAt" = NOW();

-- Story Capture template
INSERT INTO engagement_templates (id, label, slug, type, "targetType", icon, style, config, system, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Story Capture',
  'story-capture',
  'narrative',
  'journey',
  '📖',
  '{"variant": "story", "color": "purple"}',
  '{"fields": ["title", "narrative", "characters", "themes"], "preserveVoice": true}',
  true,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  "updatedAt" = NOW();

-- Link KeeperTypes to Engagement Templates
INSERT INTO keeper_type_engagement_templates (id, keeper_type_id, engagement_template_id, created_at)
SELECT 
  gen_random_uuid(),
  'storykeeper',
  et.id,
  NOW()
FROM engagement_templates et 
WHERE et.slug = 'story-capture'
ON CONFLICT DO NOTHING;

INSERT INTO keeper_type_engagement_templates (id, keeper_type_id, engagement_template_id, created_at)
SELECT 
  gen_random_uuid(),
  'devkeeper',
  et.id,
  NOW()
FROM engagement_templates et 
WHERE et.slug = 'reflection-journal'
ON CONFLICT DO NOTHING;

-- 8. SAMPLE DOMAIN PERMISSIONS (for PeopleBoard)
INSERT INTO "DomainPermission" (id, "domainId", "userId", role, permissions, "grantedBy", "grantedAt")
VALUES (
  gen_random_uuid(),
  'keeper-platform-demo',
  'demo-user-1',
  'admin',
  ARRAY['read', 'write', 'admin', 'share'],
  'demo-user-1',
  NOW()
) ON CONFLICT DO NOTHING;

-- Create additional demo users for PeopleBoard
INSERT INTO users (id, name, email, "createdAt", "updatedAt", "hashedPassword", "lastLoginAt")
VALUES 
  ('demo-user-2', 'Keeper Collaborator', 'collaborator@keeper-platform.com', NOW(), NOW(), '$2a$10$example.hash.for.demo.user.only', NOW() - INTERVAL '2 days'),
  ('demo-user-3', 'Platform Contributor', 'contributor@keeper-platform.com', NOW(), NOW(), '$2a$10$example.hash.for.demo.user.only', NOW() - INTERVAL '1 week')
ON CONFLICT (id) DO NOTHING;

-- Add permissions for additional users
INSERT INTO "DomainPermission" (id, "domainId", "userId", role, permissions, "grantedBy", "grantedAt")
VALUES 
  (gen_random_uuid(), 'keeper-platform-demo', 'demo-user-2', 'user', ARRAY['read', 'write'], 'demo-user-1', NOW()),
  (gen_random_uuid(), 'keeper-platform-demo', 'demo-user-3', 'friend', ARRAY['read'], 'demo-user-1', NOW())
ON CONFLICT DO NOTHING;

-- 9. SAMPLE KIP SESSIONS (for activity tracking)
INSERT INTO kip_sessions (id, agent_id, user_id, session_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ka.id,
  'demo-user-1',
  'Platform Guidance Session',
  NOW() - INTERVAL '1 hour',
  NOW()
FROM kip_agents ka 
WHERE ka.slug = 'kip'
ON CONFLICT DO NOTHING;

INSERT INTO kip_sessions (id, agent_id, user_id, session_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ka.id,
  'demo-user-2',
  'Journey Planning Session',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
FROM kip_agents ka 
WHERE ka.slug = 'ceox'
ON CONFLICT DO NOTHING;

-- 10. SAMPLE ROLES (for user management)
INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'Platform Admin', 'Full platform administration rights', NOW(), NOW()),
  (gen_random_uuid(), 'Domain Owner', 'Owns and manages domain settings', NOW(), NOW()),
  (gen_random_uuid(), 'Contributor', 'Can contribute content and collaborate', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- Assign roles to users
INSERT INTO user_roles (id, "userId", "roleId", "assignedBy", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'demo-user-1',
  r.id,
  'demo-user-1',
  NOW(),
  NOW()
FROM roles r 
WHERE r.name = 'Platform Admin'
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO user_roles (id, "userId", "roleId", "assignedBy", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'demo-user-2',
  r.id,
  'demo-user-1',
  NOW(),
  NOW()
FROM roles r 
WHERE r.name = 'Contributor'
ON CONFLICT ("userId", "roleId") DO NOTHING;

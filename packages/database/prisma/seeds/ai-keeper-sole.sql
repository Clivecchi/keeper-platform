-- Seed file for AI SOLE Keeper Type and Engagement Templates
-- This file contains the reference implementation KeeperType for AI memory (SOLE pattern)
-- and its associated engagement templates

-- Insert the AI SOLE KeeperType
INSERT INTO "KeeperType" (id, name, "memoryPattern", system, "createdAt") VALUES
('ai-keeper-sole', 'AI SOLE Keeper', 'SOLE', true, now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "memoryPattern" = EXCLUDED."memoryPattern",
  system = EXCLUDED.system;

-- Insert engagement templates for SOLE memory interface
INSERT INTO engagement_templates (id, label, slug, type, "targetType", icon, style, config, system, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Reflection Journal', 'reflection_journal', 'memory', 'keeper', 'journal', '{}', '{}', true, now(), now()),
(gen_random_uuid(), 'MemoryCard Generator', 'memorycard_generator', 'memory', 'keeper', 'card', '{}', '{}', true, now(), now()),
(gen_random_uuid(), 'Voice Panel', 'voice_panel', 'identity', 'keeper', 'microphone', '{}', '{}', true, now(), now()),
(gen_random_uuid(), 'Echo Writer', 'echo_writer', 'memory', 'keeper', 'edit', '{}', '{}', true, now(), now()),
(gen_random_uuid(), 'Identity Logbook', 'identity_logbook', 'timeline', 'keeper', 'book', '{}', '{}', true, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  "targetType" = EXCLUDED."targetType",
  icon = EXCLUDED.icon,
  style = EXCLUDED.style,
  config = EXCLUDED.config,
  system = EXCLUDED.system,
  "updatedAt" = now();

-- Link engagement templates to ai-keeper-sole KeeperType
INSERT INTO keeper_type_engagement_templates (keeper_type_id, engagement_template_id, created_at)
SELECT 
  'ai-keeper-sole' as keeper_type_id,
  et.id as engagement_template_id,
  now() as created_at
FROM engagement_templates et
WHERE et.slug IN ('reflection_journal', 'memorycard_generator', 'voice_panel', 'echo_writer', 'identity_logbook')
ON CONFLICT (keeper_type_id, engagement_template_id) DO NOTHING; 
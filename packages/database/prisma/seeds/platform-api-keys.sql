-- Seed file for Platform API Keys
-- This file contains sample platform-level API keys that serve as fallbacks

-- Clear existing data first
DELETE FROM kip_platform_keys;

-- Insert sample platform API keys
INSERT INTO kip_platform_keys (provider, api_key, label, is_active, created_by, created_at, updated_at) VALUES
('openai', 'sk-platform-openai-key-placeholder', 'Platform OpenAI Key', true, null, NOW(), NOW()),
('anthropic', 'sk-ant-platform-anthropic-key-placeholder', 'Platform Anthropic Key', true, null, NOW(), NOW()),
('together-ai', 'platform-together-key-placeholder', 'Platform Together AI Key', false, null, NOW(), NOW()),
('elevenlabs', 'platform-elevenlabs-key-placeholder', 'Platform ElevenLabs Key', false, null, NOW(), NOW());

-- Verification query
SELECT 
    provider,
    LEFT(api_key, 10) || '...' as masked_key,
    label,
    is_active,
    created_at
FROM kip_platform_keys
ORDER BY provider; 
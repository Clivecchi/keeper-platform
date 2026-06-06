-- B1: Rename provider slug together → together-ai (platform identifier only; TOGETHER_API_KEY env var unchanged)

UPDATE kip_platform_keys SET provider = 'together-ai' WHERE provider = 'together';
UPDATE kip_user_keys SET provider = 'together-ai' WHERE provider = 'together';
UPDATE kip_agents SET model_provider = 'together-ai' WHERE model_provider = 'together';
UPDATE "Integration" SET service = 'together-ai' WHERE service = 'together';

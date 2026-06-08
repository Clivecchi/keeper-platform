-- C1: Per-layer integration health in Integration.metadata.health

UPDATE "Integration" SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
  'health', jsonb_build_object(
    'api', jsonb_build_object(
      'status', CASE WHEN "status" = 'connected' THEN 'live' ELSE 'inactive' END,
      'last_checked', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    'webhooks', jsonb_build_object(
      'status', 'inactive',
      'last_checked', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  )
)
WHERE "service" IN ('railway', 'vercel')
  AND "tier" = 'platform' AND "domainId" IS NULL AND "userId" IS NULL;

UPDATE "Integration" SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
  'health', jsonb_build_object(
    'api', jsonb_build_object(
      'status', CASE WHEN "status" = 'connected' THEN 'live' ELSE 'inactive' END,
      'last_checked', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    'mcp', jsonb_build_object(
      'status', 'inactive',
      'last_checked', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    'webhooks', jsonb_build_object(
      'status', 'inactive',
      'last_checked', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  )
)
WHERE "service" = 'github'
  AND "tier" = 'platform' AND "domainId" IS NULL AND "userId" IS NULL;

UPDATE "Integration" SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
  'health', jsonb_build_object(
    'api', jsonb_build_object(
      'status', CASE WHEN "status" = 'connected' THEN 'live' ELSE 'inactive' END,
      'last_checked', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  )
)
WHERE "service" IN ('anthropic', 'openai', 'together-ai', 'elevenlabs')
  AND "tier" = 'platform' AND "domainId" IS NULL AND "userId" IS NULL;

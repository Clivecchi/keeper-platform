-- C3: Mark GitHub Integration MCP layer live after MCP tools registration

UPDATE "Integration" SET "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
  'health',
  COALESCE("metadata"->'health', '{}'::jsonb) || jsonb_build_object(
    'mcp', jsonb_build_object(
      'status', 'live',
      'last_checked', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  )
)
WHERE "service" = 'github'
  AND "tier" = 'platform' AND "domainId" IS NULL AND "userId" IS NULL;

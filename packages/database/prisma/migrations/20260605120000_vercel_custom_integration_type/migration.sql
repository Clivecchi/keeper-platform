-- Vercel: Services (Nango OAuth) → Custom (VERCEL_TOKEN env verification)
UPDATE "Integration"
SET
  "integration_type" = 'Custom',
  "status" = 'disconnected',
  "nangoConnectionId" = NULL,
  "connectedAt" = NULL
WHERE "service" = 'vercel';

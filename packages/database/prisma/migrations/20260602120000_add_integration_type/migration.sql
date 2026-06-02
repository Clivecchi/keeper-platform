-- IntegrationType: Services (Nango OAuth), Custom (env token verify), AI_Model (future)
CREATE TYPE "IntegrationType" AS ENUM ('Services', 'Custom', 'AI_Model');

ALTER TABLE "Integration" ADD COLUMN "integration_type" "IntegrationType";

UPDATE "Integration" SET "integration_type" = 'Custom' WHERE "service" = 'railway';
UPDATE "Integration" SET "integration_type" = 'Services' WHERE "service" IN ('vercel', 'github');

ALTER TABLE "Integration" ALTER COLUMN "integration_type" SET NOT NULL;

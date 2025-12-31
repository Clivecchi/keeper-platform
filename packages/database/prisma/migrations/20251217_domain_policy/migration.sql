-- Domain-scoped policy storage for Kip agent behavior
CREATE TABLE IF NOT EXISTS "DomainPolicy" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "domainId" TEXT NOT NULL UNIQUE,
  "version" TEXT NOT NULL DEFAULT 'policy-v1',
  "policy" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DomainPolicy_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DomainPolicy_domainId_key" ON "DomainPolicy" ("domainId");

-- Seed default policy pack for any existing domains (idempotent)
INSERT INTO "DomainPolicy" ("domainId", "version", "policy")
SELECT
  d.id,
  'policy-v1',
  $${
    "drafts": {
      "enabled": true,
      "userTriggers": ["draft", "create a draft", "save as draft"],
      "autoDraft": {
        "enabled": true,
        "thresholds": { "minSections": 3, "minChars": 1200 },
        "kinds": ["vehicle_template", "journey_spec", "keeper_type_proposal", "checklist_spec"],
        "behavior": "create_then_confirm"
      }
    },
    "actions": {
      "allow": ["draft.create", "draft.update", "draft.list", "draft.get", "draft.read"]
    },
    "entities": {
      "drafts": { "create": true, "read": true, "update": true, "delete": false },
      "keepers": { "create": false, "read": true, "update": false, "delete": false },
      "journeys": { "create": false, "read": true, "update": false, "delete": false },
      "moments": { "create": false, "read": true, "update": false, "delete": false }
    }
  }$$::jsonb
FROM "Domain" d
ON CONFLICT ("domainId") DO NOTHING;


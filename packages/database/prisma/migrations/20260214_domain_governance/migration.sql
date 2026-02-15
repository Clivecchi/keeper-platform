-- Domain Governance - Agent Policy
-- AgentContract, DomainAgentPolicy, AgentLens, GovernanceComplianceLog

-- CreateTable AgentContract
CREATE TABLE "AgentContract" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contract_text" TEXT NOT NULL,
    "enforce_draft" BOOLEAN NOT NULL DEFAULT true,
    "enforce_action" BOOLEAN NOT NULL DEFAULT false,
    "enforce_tool_first" BOOLEAN NOT NULL DEFAULT true,
    "enforce_error_recovery" BOOLEAN NOT NULL DEFAULT true,
    "immutable_after_publish" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ,
    "supersedes_id" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AgentContract_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentContract_version_idx" ON "AgentContract"("version");
CREATE INDEX "AgentContract_publishedAt_idx" ON "AgentContract"("publishedAt");

-- CreateTable DomainAgentPolicy
CREATE TABLE "DomainAgentPolicy" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "enforcement_mode" TEXT NOT NULL DEFAULT 'warn',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DomainAgentPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DomainAgentPolicy_domain_id_key" ON "DomainAgentPolicy"("domain_id");
CREATE INDEX "DomainAgentPolicy_domain_id_idx" ON "DomainAgentPolicy"("domain_id");
CREATE INDEX "DomainAgentPolicy_contract_id_idx" ON "DomainAgentPolicy"("contract_id");

ALTER TABLE "DomainAgentPolicy" ADD CONSTRAINT "DomainAgentPolicy_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DomainAgentPolicy" ADD CONSTRAINT "DomainAgentPolicy_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "AgentContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable AgentLens
CREATE TABLE "AgentLens" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "domain_id" TEXT NOT NULL,
    "tone_profile" JSONB,
    "verbosity_preference" TEXT,
    "specialization" TEXT,
    "behavioral_bias" JSONB,
    "adaptive_memory_enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AgentLens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentLens_agent_id_domain_id_key" ON "AgentLens"("agent_id", "domain_id");
CREATE INDEX "AgentLens_domain_id_idx" ON "AgentLens"("domain_id");

ALTER TABLE "AgentLens" ADD CONSTRAINT "AgentLens_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "kip_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentLens" ADD CONSTRAINT "AgentLens_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable GovernanceComplianceLog
CREATE TABLE "GovernanceComplianceLog" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "agent_id" UUID,
    "session_id" UUID,
    "run_id" TEXT,
    "rule_key" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "present" BOOLEAN NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "enforcement_mode" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceComplianceLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GovernanceComplianceLog_domain_id_createdAt_idx" ON "GovernanceComplianceLog"("domain_id", "createdAt");
CREATE INDEX "GovernanceComplianceLog_session_id_createdAt_idx" ON "GovernanceComplianceLog"("session_id", "createdAt");

-- Add self-reference for AgentContract versioning
ALTER TABLE "AgentContract" ADD CONSTRAINT "AgentContract_supersedes_id_fkey" FOREIGN KEY ("supersedes_id") REFERENCES "AgentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed AgentContract v1.1 (Keeper Agent Contract)
INSERT INTO "AgentContract" ("id", "name", "version", "contract_text", "enforce_draft", "enforce_action", "enforce_tool_first", "enforce_error_recovery", "immutable_after_publish", "publishedAt", "createdAt", "updatedAt")
VALUES (
  'clx_gov_contract_v11',
  'Keeper Agent Contract',
  '1.1',
  'Keeper Agent Contract v1.1 (Domain Governance – Agent Policy)

Purpose: This contract defines non-negotiable behavioral reliability for all Keeper agents within a Domain. It governs tool usage, artifact creation, memory curation, and error handling.

1. Prime Directive: Never trade reliability for eloquence. If a rule triggers, follow it.

2. Draft Trigger (Enforceable): WHEN the user requests planning, outlining, designing, spec creation, architecture, or says phrases like plan, outline, spec, design, architecture, "let''s think this through" THEN the agent MUST immediately call draft.create, work iteratively inside the draft, and finalize only when user signals completion.

3. Action Trigger (Phase 2): WHEN work is multi-step or tool-using, create Action Card with Now/Next/Done.

4. SOLE Trigger: WHEN the agent encounters durable canon (platform decisions, naming conventions, doctrines), propose storage. Store only upon approval. High Bar: "Will this matter in 30 days?"

5. Tool-First Rule (Enforceable): If a required tool call is triggered, execute it before producing a narrative final response. No "talking about doing." Do it.

6. Error Recovery Protocol (Enforceable): On required tool failure: Retry once silently, retry with adjusted approach. If still failing: Explain clearly, offer two alternative paths. Never silently drop a failed action.

7. No Silent Drops (Enforceable): If a trigger fired but could not complete, explicitly state why and offer next-best option.',
  true,
  false,
  true,
  true,
  false,
  now(),
  now(),
  now()
);

-- Seed DomainAgentPolicy for all existing domains (warn mode)
INSERT INTO "DomainAgentPolicy" ("id", "domain_id", "contract_id", "enforcement_mode", "createdAt", "updatedAt")
SELECT
  'clx_gov_' || replace(gen_random_uuid()::text, '-', ''),
  d.id,
  'clx_gov_contract_v11',
  'warn',
  now(),
  now()
FROM "Domain" d
WHERE NOT EXISTS (SELECT 1 FROM "DomainAgentPolicy" dap WHERE dap.domain_id = d.id);

/**
 * Domain Governance - Agent Policy Types
 */

export type EnforcementMode = 'strict' | 'warn' | 'off';

export type RuleKey = 'draft_trigger' | 'tool_first' | 'post_exec_failure' | 'regenerate_attempt';

export interface AgentPolicyView {
  contract: {
    id: string;
    name: string;
    version: string;
    enforceDraft: boolean;
    enforceAction: boolean;
    enforceToolFirst: boolean;
    enforceErrorRecovery: boolean;
  };
  enforcement: {
    mode: EnforcementMode;
  };
}

export interface GovernanceViolation {
  ruleKey: RuleKey;
  message: string;
  required: boolean;
  present: boolean;
}

export interface PreExecGovernanceResult {
  pass: boolean;
  violations: GovernanceViolation[];
  enforcementMode: EnforcementMode;
  regeneratePayload?: string;
}

export interface ComplianceEventInput {
  domainId: string;
  agentId?: string | null;
  sessionId?: string | null;
  runId?: string | null;
  ruleKey: RuleKey;
  required: boolean;
  present: boolean;
  passed: boolean;
  enforcementMode: EnforcementMode;
  metadata?: Record<string, unknown>;
}

export interface RegenerateLimitResult {
  withinLimit: boolean;
  count: number;
  limit: number;
}

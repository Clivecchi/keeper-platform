/**
 * Governance Middleware
 * Pre-exec and post-exec checks for Agent Contract compliance.
 */

import { prisma } from '@keeper/database';
import { detectDraftTrigger } from './draftTriggerDetector.js';
import { getAgentPolicyView, logComplianceEvent } from './governanceService.js';
import type {
  AgentPolicyView,
  PreExecGovernanceResult,
  GovernanceViolation,
  RegenerateLimitResult,
} from './types.js';

const REGENERATE_LIMIT_PER_HOUR = 3;
const REGENERATE_WINDOW_MS = 60 * 60 * 1000;

export interface PreExecGovernanceParams {
  userInput: string;
  parsedResponse: {
    responseText: string;
    actions: Array<{ type: string; payload?: unknown }>;
  };
  agentPolicyView: AgentPolicyView | null;
  domainId: string | null;
  agentId: string;
  sessionId: string | null;
  runId?: string | null;
}

export interface PostExecGovernanceParams {
  userInput: string;
  parsedResponse: {
    responseText: string;
    actions: Array<{ type: string; payload?: unknown }>;
  };
  actionResults: Array<{
    type: string;
    status: string;
    message?: string;
    errorCode?: string;
  }>;
  agentPolicyView: AgentPolicyView | null;
  domainId: string | null;
  agentId: string;
  sessionId: string | null;
  runId?: string | null;
}

/**
 * Pre-exec governance check. Returns pass/fail and violations.
 */
export async function preExecGovernanceCheck(
  params: PreExecGovernanceParams
): Promise<PreExecGovernanceResult> {
  const {
    userInput,
    parsedResponse,
    agentPolicyView,
    domainId,
    agentId,
    sessionId,
    runId,
  } = params;

  // No governance or off mode: pass
  if (!agentPolicyView || !domainId) {
    return { pass: true, violations: [], enforcementMode: 'off' };
  }

  const { contract, enforcement } = agentPolicyView;
  const mode = enforcement.mode as 'strict' | 'warn' | 'off';

  if (mode === 'off') {
    return { pass: true, violations: [], enforcementMode: mode };
  }

  const violations: GovernanceViolation[] = [];
  const hasDraftCreate = parsedResponse.actions.some((a) => a.type === 'draft.create');

  // Draft Trigger check
  if (contract.enforceDraft) {
    const { triggered, bypassed } = detectDraftTrigger(userInput);
    if (triggered && !bypassed && !hasDraftCreate) {
      violations.push({
        ruleKey: 'draft_trigger',
        message: 'Draft trigger detected but draft.create not present in actions',
        required: true,
        present: false,
      });
    }
  }

  // Tool-First check: if draft trigger fired and we required draft.create, having narrative without action is a violation
  if (contract.enforceToolFirst && violations.some((v) => v.ruleKey === 'draft_trigger')) {
    const { triggered, bypassed } = detectDraftTrigger(userInput);
    if (triggered && !bypassed && parsedResponse.responseText?.trim() && !hasDraftCreate) {
      const existing = violations.find((v) => v.ruleKey === 'tool_first');
      if (!existing) {
        violations.push({
          ruleKey: 'tool_first',
          message: 'Tool-First: narrative present but required draft.create missing',
          required: true,
          present: false,
        });
      }
    }
  }

  const pass = violations.length === 0;

  // Log compliance
  for (const v of violations) {
    await logComplianceEvent({
      domainId,
      agentId,
      sessionId,
      runId,
      ruleKey: v.ruleKey,
      required: v.required,
      present: v.present,
      passed: false,
      enforcementMode: mode,
      metadata: { message: v.message },
    });
  }

  if (pass) {
    await logComplianceEvent({
      domainId,
      agentId,
      sessionId,
      runId,
      ruleKey: 'draft_trigger',
      required: true,
      present: hasDraftCreate,
      passed: true,
      enforcementMode: mode,
    });
  }

  const regeneratePayload =
    violations.length > 0
      ? `Contract violation: ${violations.map((v) => v.message).join('; ')}. Re-run with required tool call.`
      : undefined;

  return {
    pass,
    violations,
    enforcementMode: mode,
    regeneratePayload,
  };
}

/**
 * Post-exec: if required action failed, return failure template to append.
 */
export async function postExecGovernanceCheck(
  params: PostExecGovernanceParams
): Promise<{ appendText: string | null }> {
  const {
    parsedResponse,
    actionResults,
    agentPolicyView,
    domainId,
    agentId,
    sessionId,
    runId,
  } = params;

  if (!agentPolicyView || !domainId) {
    return { appendText: null };
  }

  const { contract } = agentPolicyView;
  if (!contract.enforceErrorRecovery) {
    return { appendText: null };
  }
  const draftTriggerFired = detectDraftTrigger(params.userInput).triggered;

  const failedActions = actionResults.filter((r) => r.status === 'error');
  if (failedActions.length === 0) return { appendText: null };

  // Check if a required action (draft.create when trigger fired) failed
  const requiredDraftCreate =
    contract.enforceDraft && draftTriggerFired && parsedResponse.actions.some((a) => a.type === 'draft.create');
  const draftCreateFailed = failedActions.some((a) => a.type === 'draft.create');

  if (requiredDraftCreate && draftCreateFailed) {
    const failed = failedActions.find((a) => a.type === 'draft.create');
    const msg = failed?.message ?? 'Unknown error';
    const appendText = `\n\nAction draft.create failed: ${msg}. Alternatives: (1) Retry with simpler content; (2) Save as text and create draft manually.`;

    await logComplianceEvent({
      domainId,
      agentId,
      sessionId,
      runId,
      ruleKey: 'post_exec_failure',
      required: true,
      present: false,
      passed: false,
      enforcementMode: agentPolicyView.enforcement.mode,
      metadata: { failedAction: 'draft.create', message: msg },
    });

    return { appendText };
  }

  return { appendText: null };
}

/**
 * Circuit breaker: max N regenerations per session per hour.
 */
export async function checkRegenerateLimit(
  sessionId: string | null
): Promise<RegenerateLimitResult> {
  if (!sessionId) {
    return { withinLimit: true, count: 0, limit: REGENERATE_LIMIT_PER_HOUR };
  }

  const since = new Date(Date.now() - REGENERATE_WINDOW_MS);
  const count = await prisma.governanceComplianceLog.count({
    where: {
      sessionId,
      ruleKey: 'regenerate_attempt',
      createdAt: { gte: since },
    },
  });

  return {
    withinLimit: count < REGENERATE_LIMIT_PER_HOUR,
    count,
    limit: REGENERATE_LIMIT_PER_HOUR,
  };
}

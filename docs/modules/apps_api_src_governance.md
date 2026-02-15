# Governance Module

## 📌 Purpose
Domain governance service layer for agent policy enforcement. Loads AgentContract and DomainAgentPolicy, detects draft triggers, runs pre/post-exec middleware, and logs compliance events.

## 🧱 Key Files
- `governanceService.ts` - Load domain policy, contract, getAgentPolicyView, logComplianceEvent
- `draftTriggerDetector.ts` - Detect draft-triggering phrases (plan, spec, design, etc.) with blocklist and "no draft" escape hatch
- `governanceMiddleware.ts` - preExecGovernanceCheck, postExecGovernanceCheck, checkRegenerateLimit
- `types.ts` - AgentPolicyView, EnforcementMode, RuleKey, PreExecGovernanceResult, ComplianceEventInput
- `index.ts` - Re-exports

## 🔄 Data & Behavior
- **loadDomainAgentPolicy**: Fetches DomainAgentPolicy with contract for a domain
- **getAgentPolicyView**: Merges DomainPolicy (capability) + DomainAgentPolicy (behavior) into AgentPolicyView
- **detectDraftTrigger**: Substring patterns, blocklist (plan a meeting, meal plan, etc.), escape hatch "no draft"
- **preExecGovernanceCheck**: Draft Trigger (enforceDraft) and Tool-First (enforceToolFirst) validation; returns pass/violations/regeneratePayload
- **postExecGovernanceCheck**: Appends failure template when required action fails
- **checkRegenerateLimit**: Circuit breaker, max 3 regenerations per session/hour
- **logComplianceEvent**: Writes to GovernanceComplianceLog

## ⚠️ Notes & ToDo
- [ ] Phase 2: Action Card enforcement (action_card.create, action_card.update)
- [ ] Tune draft trigger blocklist from compliance logs
- [ ] Consider async log writes for performance

## 📆 Update Log

### 2026-02-14 - Initial Domain Governance implementation
- Added governanceService, draftTriggerDetector, governanceMiddleware, types
- Pre-exec: Draft Trigger + Tool-First checks; strict mode triggers regenerate (max 2 retries), circuit breaker 3/hour
- Post-exec: Failure template append when required action fails
- Integrated with resolveAgentEnvironment and runAgent

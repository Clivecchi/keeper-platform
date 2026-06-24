# Governance Module

## 📌 Purpose
Domain governance service layer for agent policy enforcement. Loads AgentContract and DomainAgentPolicy, detects explicit durable-artifact draft triggers, runs pre/post-exec middleware, and logs compliance events.

## 🧱 Key Files
- `governanceService.ts` - Load domain policy, contract, getAgentPolicyView, logComplianceEvent
- `draftTriggerDetector.ts` - Detect explicit draft/document/spec/proposal creation requests with blocklist and read-only/no-change escape hatches
- `governanceMiddleware.ts` - preExecGovernanceCheck, postExecGovernanceCheck, checkRegenerateLimit
- `types.ts` - AgentPolicyView, EnforcementMode, RuleKey, PreExecGovernanceResult, ComplianceEventInput
- `index.ts` - Re-exports

## 🔄 Data & Behavior
- **loadDomainAgentPolicy**: Fetches DomainAgentPolicy with contract for a domain
- **getAgentPolicyView**: Merges DomainPolicy (capability) + DomainAgentPolicy (behavior) into AgentPolicyView
- **detectDraftTrigger**: Explicit durable-artifact patterns (create/save draft, document, spec, proposal), blocklist, and escape hatches for "no draft", read-only, and no-change instructions
- **preExecGovernanceCheck**: Draft Trigger (enforceDraft) and Tool-First (enforceToolFirst) validation; returns pass/violations/regeneratePayload
- **postExecGovernanceCheck**: Appends failure template when required action fails
- **checkRegenerateLimit**: Circuit breaker, max 3 regenerations per session/hour
- **logComplianceEvent**: Writes to GovernanceComplianceLog

## ⚠️ Notes & ToDo
- [ ] Phase 2: Action Card enforcement (action_card.create, action_card.update)
- [ ] Tune draft trigger blocklist from compliance logs
- [ ] Consider async log writes for performance

## 📆 Update Log

### 2026-06-23 - Read-only draft trigger escape hatch
- Expanded `draftTriggerDetector` escape hatches so read-only/no-change instructions do not force `draft.create` governance behavior.
- Narrowed draft triggers to explicit durable-artifact requests instead of generic planning/approach language.

### 2026-02-15 - Wire contract to Kip
- Added `getContractTextForDomain(domainId)` to load full contract text for prompt injection
- Contract text is now injected into Kip's system prompt when domainId is present (callAIModel + buildComposedSystemPrompt)

### 2026-02-14 - Initial Domain Governance implementation
- Added governanceService, draftTriggerDetector, governanceMiddleware, types
- Pre-exec: Draft Trigger + Tool-First checks; strict mode triggers regenerate (max 2 retries), circuit breaker 3/hour
- Post-exec: Failure template append when required action fails
- Integrated with resolveAgentEnvironment and runAgent

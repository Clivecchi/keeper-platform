# policy

## 📌 Purpose
Domain policy pack definitions and helpers that feed Kip environment bundles and policy editing endpoints.

## 🧱 Key Files
- `policyPack.ts`
- `domainPolicyService.ts`
- `kipActionAllowlist.ts` — golden-path + executor allowlist (shared by agents.ts, MCP `kip_actions_list`, REST)
- `kipActionAllowlist.test.ts`

## 🔄 Data & Behavior
- Defines `DEFAULT_POLICY_PACK_V1` (policy-v1) with draft triggers, auto-draft thresholds, and an actions allowlist.
- Loads or upserts domain-scoped policy JSON with a default fallback for environments and API responses.
- `buildAllowedActions()` is the Lead executor gate (policy allow ∪ golden path; `delegate.consult` when a domain roster exists). `mcp.call` is not on this list.
- `GET /api/kip/actions/allowlist?domainId=` and MCP `kip_actions_list` return that allowlist plus JWT `canDraft` when a session is bound. Read-only — no enforcement change. `canDraft` is prompt context; the executor still gates on `allowed[]`.

## ⚠️ Notes & ToDo
- [ ] Add schema validation for policy payloads before saving
- [ ] Surface policy version negotiation if a future pack is introduced

## 📆 Update Log
- 2026-08-22: **document.reorganize.propose** — added to golden path + handlers. Lead Review & Reorganize; Apply is a human Chronicle action, not an agent write.
- 2026-08-19: **Capability Ledger Phase 1** — extracted `kipActionAllowlist.ts` (`GOLDEN_PATH_ACTIONS`, `buildAllowedActions`, `buildKipActionAllowlistStatus`) so the executor, MCP `kip_actions_list`, and `GET /api/kip/actions/allowlist` share one read of the Kip allowlist. No enforcement changes.
- 2025-12-17: Added policy pack v1 constant plus domain policy load/upsert helpers for environment injection and domain policy APIs.


# policy

## 📌 Purpose
Domain policy pack definitions and helpers that feed Kip environment bundles and policy editing endpoints.

## 🧱 Key Files
- `policyPack.ts`
- `domainPolicyService.ts`

## 🔄 Data & Behavior
- Defines `DEFAULT_POLICY_PACK_V1` (policy-v1) with draft triggers, auto-draft thresholds, and an actions allowlist.
- Loads or upserts domain-scoped policy JSON with a default fallback for environments and API responses.

## ⚠️ Notes & ToDo
- [ ] Add schema validation for policy payloads before saving
- [ ] Surface policy version negotiation if a future pack is introduced

## 📆 Update Log
- 2025-12-17: Added policy pack v1 constant plus domain policy load/upsert helpers for environment injection and domain policy APIs.


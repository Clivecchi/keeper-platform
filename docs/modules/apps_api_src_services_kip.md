# kip services

## 📌 Purpose
KIP-related service helpers and mock data sources.

## 🧱 Key Files
- `mockAgents.ts`
- `modeConfig.ts`
- `buildKipEnvironmentContext.ts`
- `resolveAgentEnvironment.ts`

## 🔄 Data & Behavior
- Provides `MOCK_AGENTS` for `/api/kip/agents` mock fallback.
- `modeConfig` resolves per-agent Domain/Debug configs and lens defaults (Domain Lens / Debug Investigator Lens) plus persistence in `kip_agents.config`.
- `buildKipEnvironmentContext` builds a read-only environment bundle (domain, actor roles, UI focus, registries, capabilities) for Kip requests, now including `policy` and a capped `draftsDirectory` for the owner.
- `resolveAgentEnvironment` uses KAM to produce env-v1 bundles for `/api/kip/agents` runs without writes, including domain slug/name, agent identity, per-run debug canary UUID, policy, and drafts directory (last 25 owner drafts).

## ⚠️ Notes & ToDo
- [ ] Expand mock set as needed
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2026-02-15: buildKipEnvironmentContext and resolveAgentEnvironment now include domainIndex (keepers + journeys) for agent prompt injection.
- 2025-12-17: Kip environment builders now attach domain policy (with default policy-v1 fallback) and a capped drafts directory for the authenticated owner so agent runs can enforce policy-aware draft actions.
- 2025-12-16: Environment builders now accept `sessionId` and surface session-owned `activeDraft` summaries (domain-filtered) so KAM bundles and agent runs carry the active draft pointer safely.
- 2025-12-17: `resolveAgentEnvironment` now surfaces domain slug/name, agent identity fields, and emits a per-run debug canary UUID.
- 2025-12-16: Added `resolveAgentEnvironment` to return KAM-resolved env-v1 contexts for Kip runs and keep `/api/kip/agents` executions environment-aware.
- 2025-12-15: Added `buildKipEnvironmentContext` to return stable, read-only environment bundles for Kip domain flows and agent execution.
- 2025-12-14: Added `modeConfig` helpers to normalize and persist agent mode configs + lens defaults.
- 2025-08-31: Added mock agents list.

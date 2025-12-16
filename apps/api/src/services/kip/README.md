# kip services

## 📌 Purpose
KIP-related service helpers and mock data sources.

## 🧱 Key Files
- `mockAgents.ts`
- `modeConfig.ts`
- `buildKipEnvironmentContext.ts`

## 🔄 Data & Behavior
- Provides `MOCK_AGENTS` for `/api/kip/agents` mock fallback.
- `modeConfig` resolves per-agent Domain/Debug configs and lens defaults (Domain Lens / Debug Investigator Lens) plus persistence in `kip_agents.config`.
- `buildKipEnvironmentContext` builds a read-only environment bundle (domain, actor roles, UI focus, registries, capabilities) for Kip requests.

## ⚠️ Notes & ToDo
- [ ] Expand mock set as needed
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-12-15: Added `buildKipEnvironmentContext` to return stable, read-only environment bundles for Kip domain flows and agent execution.
- 2025-12-14: Added `modeConfig` helpers to normalize and persist agent mode configs + lens defaults.
- 2025-08-31: Added mock agents list.

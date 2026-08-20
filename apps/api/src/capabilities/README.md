# capabilities

## 📌 Purpose
Canonical capability strings and runtime resolution for agent/board capability declarations. Infrastructure access (Railway, Vercel, GitHub) is data-governed: declared on `kip_agents.capabilities` and board ceilings, resolved at HTTP route and MCP call time.

## 🧱 Key Files
- `infraCapabilities.ts` — `INFRA_CAPABILITIES` constants and Cloud read seed set
- `agentCapabilityConstants.ts` — core capability strings (actions, sessions, SOLE, drafts)
- `boardCapabilityCeilings.ts` — board-level ceilings (Build Board uses `CLOUD_MCP_CEILING`)
- `resolveCapabilities.ts` — agent record ∩ board ceiling resolution (`ide` normalizes to `build`)
- `boardCeilingStatus.ts` — read-only Cloud MCP ceiling descriptor (MCP `cloud_ceiling_list`, `GET /api/capabilities/ceiling`)
- `capabilityLedger.ts` — Phase 2 aggregating ledger (MCP `capability_ledger`, `GET /api/capabilities/ledger`)

## 🔄 Data & Behavior
- `GET /api/capabilities/resolve?agentSlug=&boardId=` returns effective capability set
- `GET /api/capabilities/ceiling?boardId=build&agentSlug=cloud` returns the declared ceiling and optional agent ∩ ceiling intersection (same rule as `resolveAgentCapabilities`)
- `GET /api/capabilities/ledger?domainId=&agentSlug=` returns the Phase 2 Capability Ledger (MCP scopes + Kip allowlist + Cloud ceiling). JWT MCP slice is a placeholder — real scopes require an MCP token.
- MCP `capability_ledger` is the agent-facing twin (always visible; no enforcement change)
- Railway/Vercel REST routes use `requireCapability` middleware with agent ref via query or headers
- MCP tools declare `requiredCapability`; gate logs warning only (not enforced yet)

## ⚠️ Notes & ToDo
- [ ] // incomplete — deploy capabilities require human confirmation gate before seeding on Cloud
- [ ] // incomplete — MCP capability gate not yet enforced at MCP layer
- [ ] Chronicle editing of agent capabilities and board ceilings (future)

## 📆 Update Log
- 2026-08-19: **Capability Ledger Phase 2** — `capabilityLedger.ts` + `GET /api/capabilities/ledger` + MCP `capability_ledger`. One read of MCP scopes, Kip allowlist, and Cloud ceiling. Key stores listed, not merged. No enforcement changes.
- 2026-08-19: Retired `ide` ceiling identity. `CLOUD_MCP_CEILING` lives in `@keeper/shared`. MCP tool is `cloud_ceiling_list`. Cloud `mcp.call` uses the agent record — it does not invent a Board id.
- 2026-08-19: **Capability Ledger Phase 1** — `boardCeilingStatus.ts` + `GET /api/capabilities/ceiling` + MCP `cloud_ceiling_list`. Read-only exposure of `CLOUD_MCP_CEILING` (and agent ∩ ceiling when context is present). No enforcement changes.
- 2026-07-15: Added `GLOSS_MCP_TOOL_CAPABILITIES` (`gloss.rw`) for `gloss_write_turn`; included in IDE board ceiling and Cloud agent caps.
- 2026-07-14: Added `LIBRARY_MCP_TOOL_CAPABILITIES` (`library.ro`) to `IDE_BOARD_MCP_CEILING` and `CLOUD_AGENT_CAPABILITIES` so IDE Board Cloud can invoke Library MCP tools.
- 2026-06-18: Extended `IDE_BOARD_MCP_CEILING` with GitHub MCP tools, Nango/integration status, and Resend read caps; added `infra.nango.read` and `infra.resend.read`.
- 2026-05-31: Added infra capability constants, resolution service, and board ceilings for Step 3B infrastructure capabilities.

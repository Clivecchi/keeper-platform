# capabilities

## 📌 Purpose
Canonical capability strings and runtime resolution for agent/board capability declarations. Infrastructure access (Railway, Vercel, GitHub) is data-governed: declared on `kip_agents.capabilities` and board ceilings, resolved at HTTP route and MCP call time.

## 🧱 Key Files
- `infraCapabilities.ts` — `INFRA_CAPABILITIES` constants and Cloud read seed set
- `agentCapabilityConstants.ts` — core capability strings (actions, sessions, SOLE, drafts)
- `boardCapabilityCeilings.ts` — board-level ceilings (IDE Board uses `IDE_BOARD_MCP_CEILING`: infra + GitHub + integration MCP caps)
- `resolveCapabilities.ts` — agent record ∩ board ceiling resolution
- `ideBoardCeilingStatus.ts` — read-only IDE/Build ceiling descriptor (MCP `ide_ceiling_list`, `GET /api/capabilities/ceiling`)

## 🔄 Data & Behavior
- `GET /api/capabilities/resolve?agentSlug=&boardId=` returns effective capability set
- `GET /api/capabilities/ceiling?boardId=ide&agentSlug=cloud` returns the declared ceiling and optional agent ∩ ceiling intersection (same rule as `resolveAgentCapabilities`)
- MCP `ide_ceiling_list` is the agent-facing twin (always visible; no enforcement change)
- Railway/Vercel REST routes use `requireCapability` middleware with agent ref via query or headers
- MCP tools declare `requiredCapability`; gate logs warning only (not enforced yet)

## ⚠️ Notes & ToDo
- [ ] // incomplete — deploy capabilities require human confirmation gate before seeding on Cloud
- [ ] // incomplete — MCP capability gate not yet enforced at MCP layer
- [ ] Chronicle editing of agent capabilities and board ceilings (future)

## 📆 Update Log
- 2026-08-19: **Capability Ledger Phase 1** — `ideBoardCeilingStatus.ts` + `GET /api/capabilities/ceiling` + MCP `ide_ceiling_list`. Read-only exposure of `IDE_BOARD_MCP_CEILING` (and agent ∩ ceiling when context is present). No enforcement changes.
- 2026-07-15: Added `GLOSS_MCP_TOOL_CAPABILITIES` (`gloss.rw`) for `gloss_write_turn`; included in IDE board ceiling and Cloud agent caps.
- 2026-07-14: Added `LIBRARY_MCP_TOOL_CAPABILITIES` (`library.ro`) to `IDE_BOARD_MCP_CEILING` and `CLOUD_AGENT_CAPABILITIES` so IDE Board Cloud can invoke Library MCP tools.
- 2026-06-18: Extended `IDE_BOARD_MCP_CEILING` with GitHub MCP tools, Nango/integration status, and Resend read caps; added `infra.nango.read` and `infra.resend.read`.
- 2026-05-31: Added infra capability constants, resolution service, and board ceilings for Step 3B infrastructure capabilities.

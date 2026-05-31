# capabilities

## 📌 Purpose
Canonical capability strings and runtime resolution for agent/board capability declarations. Infrastructure access (Railway, Vercel, GitHub) is data-governed: declared on `kip_agents.capabilities` and board ceilings, resolved at HTTP route and MCP call time.

## 🧱 Key Files
- `infraCapabilities.ts` — `INFRA_CAPABILITIES` constants and Cloud read seed set
- `agentCapabilityConstants.ts` — core capability strings (actions, sessions, SOLE, drafts)
- `boardCapabilityCeilings.ts` — board-level ceilings (IDE Board has all six infra caps)
- `resolveCapabilities.ts` — agent record ∩ board ceiling resolution

## 🔄 Data & Behavior
- `GET /api/capabilities/resolve?agentSlug=&boardId=` returns effective capability set
- Railway/Vercel REST routes use `requireCapability` middleware with agent ref via query or headers
- MCP tools declare `requiredCapability`; gate logs warning only (not enforced yet)

## ⚠️ Notes & ToDo
- [ ] // incomplete — deploy capabilities require human confirmation gate before seeding on Cloud
- [ ] // incomplete — MCP capability gate not yet enforced at MCP layer
- [ ] Chronicle editing of agent capabilities and board ceilings (future)

## 📆 Update Log
- 2026-05-31: Added infra capability constants, resolution service, and board ceilings for Step 3B infrastructure capabilities.

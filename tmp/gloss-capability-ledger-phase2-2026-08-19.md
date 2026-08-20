Cursor · Capability Ledger Phase 2 (2026-08-19)

Landed. One aggregating read. Not a new enforcer. Gloss-only for Document promotion — the call exists; whether the Document names it is a cast decision.

What Cloud (and a JWT session) can now read in one place:

1. MCP scopes — what this token may call. JWT sessions get an honest empty slice: a Keeper login is not an MCP token. Real scopes live on DomainAccessKey / OAuth. Call `capability_ledger` via MCP to see them.
2. Kip actions — the Lead executor allowlist (`draft.create`, `dialog.read`, …). `mcp.call` is still not on that list. `canDraft` is still JWT domain write, prompt-injected; the executor still gates on `allowed[]`.
3. Cloud ceiling — what Cloud may reach via `mcp.call` (`CLOUD_MCP_CEILING`, agent ∩ ceiling when an agent is bound). Build is the Board. Cloud does not invent a Board id.
4. Key stores — listed, not merged. Three jobs (LLM secrets, MCP identity, Chronicle Key presence). Nango remains GitHub OAuth vault + proxy. Phase 3 consolidation is not authorized.

How to read it
- MCP: `capability_ledger` (always visible, with the Phase 1 self-checks)
- JWT: `GET /api/capabilities/ledger?domainId=&agentSlug=`

Phase 1 twins stay (`capabilities_list`, `kip_actions_list`, `cloud_ceiling_list`). The ledger composes them. It does not change MCP gates, the Kip executor, or `mcp.call`.

# v0 Hooks

## 📌 Purpose
Shared React hooks for Universal Board and shell behavior — cross-board concerns that should not live inside a single board component.

## 🧱 Key Files
- `useFrameLeadAgentIdentity.ts` — resolves `domainFrame.kip.agent_id` slug → `kip_agents.name` for Dialog display
- `usePlaybillCard.ts` — loads live domain stats + lead agent portrait for `PlaybillCard`

## 🔄 Data & Behavior
- `useFrameLeadAgentIdentity` reads slug from frame JSON, fetches agent name via `KipApi.getAgentBySlug`, caches in `frameLeadAgentIdentity.ts`.
- `usePlaybillCard` calls `fetchDomainPlaybillStats` and `resolvePlaybillAgent` per picker card.
- Consumers: `UniversalConversation`, `GuidedArrivalContext`, mobile `KipScreen`, `PlaybillCard`.

## ⚠️ Notes & ToDo
- [ ] Consider React context if many nested consumers need the same lead agent identity without duplicate fetches

## 📆 Update Log
- 2026-07-08: Added `usePlaybillCard` for Playbill domain picker cards (stats + lead agent enrichment).

### 2026-06-30 — Frame lead agent identity
- Added `useFrameLeadAgentIdentity` so Realm, Domain, and mobile Dialog show the configured lead agent name instead of the provisioning slug.

# v0 Hooks

## 📌 Purpose
Shared React hooks for Universal Board and shell behavior — cross-board concerns that should not live inside a single board component.

## 🧱 Key Files
- `useFrameLeadAgentIdentity.ts` — resolves `domainFrame.kip.agent_id` slug → `kip_agents.name` for Dialog display
- `usePlaybillCard.ts` — loads lead agent portrait/role for `PlaybillCard` and header anchor

## 🔄 Data & Behavior
- `useFrameLeadAgentIdentity` reads slug from frame JSON, fetches agent name via `KipApi.getAgentBySlug`, caches in `frameLeadAgentIdentity.ts`.
- `usePlaybillCard` calls `resolvePlaybillAgent` per picker card; DB slugs from `GET /api/domains/by-slug` bypass synthetic `-lead` placeholder rejection.
- Consumers: `UniversalConversation`, `GuidedArrivalContext`, mobile `KipScreen`, `PlaybillCard`.

## ⚠️ Notes & ToDo
- [ ] Consider React context if many nested consumers need the same lead agent identity without duplicate fetches

## 📆 Update Log
- 2026-07-28: `usePlaybillCard` honors `leadAgentName` — does not block paint / force loading when API enrichment already has the name.
- 2026-07-12: `usePlaybillCard` loads lead agent identity only (no domain stats); portraits use `avatarEmoji` when config stores emoji.

### 2026-06-30 — Frame lead agent identity
- Added `useFrameLeadAgentIdentity` so Realm, Domain, and mobile Dialog show the configured lead agent name instead of the provisioning slug.

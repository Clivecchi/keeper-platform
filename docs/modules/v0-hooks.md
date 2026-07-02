# v0 Hooks

## 📌 Purpose
Shared React hooks for Universal Board and shell behavior — cross-board concerns that should not live inside a single board component.

## 🧱 Key Files
- `useFrameLeadAgentIdentity.ts` — resolves `domainFrame.kip.agent_id` slug → `kip_agents.name` for Dialog display

## 🔄 Data & Behavior
- `useFrameLeadAgentIdentity` reads slug from frame JSON, fetches agent name via `KipApi.getAgentBySlug`, caches in `frameLeadAgentIdentity.ts`.
- Consumers: `UniversalConversation`, `GuidedArrivalContext`, mobile `KipScreen`.

## ⚠️ Notes & ToDo
- [ ] Consider React context if many nested consumers need the same lead agent identity without duplicate fetches

## 📆 Update Log

### 2026-06-30 — Frame lead agent identity
- Added `useFrameLeadAgentIdentity` so Realm, Domain, and mobile Dialog show the configured lead agent name instead of the provisioning slug.

# v0 Hooks

## 📌 Purpose
Shared React hooks for Universal Board and shell behavior — cross-board concerns that should not live inside a single board component.

## 🧱 Key Files
- `useFrameLeadAgentIdentity.ts` — domain-lead display name from API-enriched `leadAgentName` / slug, not frame JSON alone
- `usePlaybillCard.ts` — loads lead agent portrait/role for `PlaybillCard` and header anchor

## 🔄 Data & Behavior
- `useFrameLeadAgentIdentity` prefers authoritative `leadAgentName` from `settings.primaryAgentId` enrichment; slug lookup is fallback only.
- `usePlaybillCard` calls `resolvePlaybillAgent` per picker card; DB slugs from `GET /api/domains/by-slug` bypass synthetic `-lead` placeholder rejection.
- Consumers: `UniversalConversation`, `GuidedArrivalContext`, mobile `KipScreen`, `PlaybillCard`.

## ⚠️ Notes & ToDo
- [ ] Consider React context if many nested consumers need the same lead agent identity without duplicate fetches

## 📆 Update Log
- 2026-08-18: `useFrameLeadAgentIdentity` accepts authoritative `leadAgentName` so display is not a frame-mirror read.
- 2026-07-28: `usePlaybillCard` honors `leadAgentName` — does not block paint / force loading when API enrichment already has the name.
- 2026-07-12: `usePlaybillCard` loads lead agent identity only (no domain stats); portraits use `avatarEmoji` when config stores emoji.

### 2026-06-30 — Frame lead agent identity
- Added `useFrameLeadAgentIdentity` so Realm, Domain, and mobile Dialog show the configured lead agent name instead of the provisioning slug.

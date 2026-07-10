# Realm Board

## 📌 Purpose
Personal domain primary board (`?board=realm`). Uses the Universal Board shell — Nav · Dialog · Chronicle — with content-gated nav, Cover-first Chronicle, and solo dialog orchestration (lead agent from domain frame JSON).

## 🧱 Key Files
- `RealmBoard.tsx` — Thin wrapper: `<UniversalBoard def={REALM_BOARD_DEF} />`
- `../UniversalBoardDefinition.ts` — `REALM_BOARD_DEF` source of truth

## 🔄 Data & Behavior
- **Interior (default authenticated):** Owner/keeper on `/d/:slug?board=realm`. Full nav per `REALM_BOARD_DEF`; `contentGated` hides empty entity sections except Dialogs (`navAlwaysShow`).
- **Friends:** Same URL; content filtered by `resolveDomainAudience` → `friend` (wired in `V0Shell`, not a separate route).
- **Public:** Guests do **not** use Realm board — `access.isPrivate: true` blocks unauthenticated access. Public story uses Present/Cover guest routes only.

Nav blocks (Realm-only extras):
- **Chatter** — dialogs with no linked journey/keeper (`context.subject` empty or not matching a domain entity).
- **Connections** — `GET /api/domains/:domainId/connections`; section hidden when count is 0 (`contentGated`).

Conversation: lead agent slug from `domainFrame.kip.agent_id` (`agentFromFrame: true`), `dialogOrchestration: "solo"`, `kipMode: "domain"`.

## ⚠️ Notes & ToDo
- [ ] Phase 4B — Realm Screen prototype (mobile default route)
- [ ] Phase 4C — extend `UniversalMobileShell` for staged Dialog + Chronicle on realm
- [ ] Connection row click → Chronicle manage surface (nav is list-only today)

## 📆 Update Log
### 2026-07-09 — Realm Arrival at `/home`
- Home shell uses arrival Dialog stack and Chronicle Playbill rail via `v0/realm/`
### 2026-07-01 — Phase 4A: Realm Board definition
- Added `REALM_BOARD_DEF`, `RealmBoard.tsx`, registry + workspace nav wiring
- Extended `UniversalNavPanel` with `chatter` and `connections` blocks
- Documented Interior / Friends / Public audience split

# Realm Board

## 📌 Purpose
Personal domain primary board (`?board=realm` and user Home at `/home`). Uses the Universal Board shell — Nav · Dialog · Chronicle — with content-gated nav, Cover-first Chronicle, and director dialog orchestration (Kip + domain lead in footer Agents bar).

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

Conversation: lead agent slug from `domainFrame.kip.agent_id` (`agentFromFrame: true`), `dialogOrchestration: "director"`, `directorAgentSlug: "kip"`, `kipMode: "domain"`. When the frame lead is not Kip (e.g. CeoX on Chuck's domain), **lead-led collaboration** applies: the lead owns Dialog; Kip adds optional platform support beneath. Kip-led domains keep director orchestration (Kip synthesizes).

## ⚠️ Notes & ToDo
- [x] Phase 1 — `/home` and `?board=domain` on mobile use `UniversalBoard` + `BoardMobilePanelBar`
- [x] Phase 1b — legacy `UniversalMobileShell` retired from V0Shell routing
- [ ] Connection row click → Chronicle manage surface (nav is list-only today)

## 📆 Update Log
### 2026-07-12 — Phase 1b: Domain board on mobile
- Domain board (`?board=domain`) uses same adaptive Nav · Dialog · Chronicle layout as `/home`.
- Cross-domain picker via top-bar playbill (`DomainSwitcherOverlay`), not separate mobile Domains tab.

### 2026-07-12 — Phase 1: mobile Universal Board at /home
- Narrow viewports on user Home mount `UniversalBoard` with bottom panel bar (Nav · Dialog · Chronicle) instead of `UniversalMobileShell` tab screens.
- Same components as desktop: `UniversalNavPanel`, `UniversalConversation`, `UniversalViewPanel` / `KeeperPresence`.

### 2026-07-11 — Director orchestration + Kip on Home
- `REALM_BOARD_DEF` uses `dialogOrchestration: "director"` (was `solo`) — `/home` restores footer **Agents** bar with Kip + domain lead; attachments forward to delegated lead agent runs.

### 2026-07-09 — Realm Arrival at `/home`
- Home shell uses arrival Dialog stack (remarks, invitations, composer placeholder) and Chronicle Playbill rail via `v0/realm/`
- Anchor resolution prefers `users.primaryDomainId` (see API `GET /api/domains/my`)
### 2026-07-01 — Phase 4A: Realm Board definition
- Added `REALM_BOARD_DEF`, `RealmBoard.tsx`, registry + workspace nav wiring
- Extended `UniversalNavPanel` with `chatter` and `connections` blocks
- Documented Interior / Friends / Public audience split

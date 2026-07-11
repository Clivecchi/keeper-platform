# Realm Arrival — Design Capture

**Keeper Platform · Design reference · July 9, 2026**

Canonical design reference for Realm Arrival. Supersedes the July 8 Scene-Change Travel forward design. Build prompts remain one per done condition.

See also: `docs/realm-development-plan.md` (broader Realm phase map).

## Locked decisions

- Realm = board mode (`REALM_BOARD_DEF`) + entry shell (`/home`) — no new Prisma models, no user→agent FK
- Domain lead is the realm agent via `users.primaryDomainId` → anchor domain → `frame_json.kip.agent_id`
- Arrival hierarchy: agent remarks (Dialog Response) → invitation buttons inside message (≤4) → composer with agent lead → Playbill rail in Chronicle
- Location strip persistent (read-only on `/home`); person chrome = quiet corner avatar menu only
- Presence Field = named Treatment pattern for all presence imagery
- Uncast domains: "{Domain} presents **Agent**" — not "Casting"
- Realm Feed = visual User-Realm Graph; event shape graph-compatible from day one
- Splash curtain = load UX only; never an excuse for slow domains

## Build sequence (done conditions)

| # | Done condition | Status |
|---|---|---|
| 1 | Routing → `/home` | Done (prior session) |
| 2 | Anchor → `primaryDomainId` | **Implemented 2026-07-09** |
| 3 | Arrival surface (Section 2) | **Implemented 2026-07-09** |
| 4 | Splash curtain | **Implemented 2026-07-09** |
| 5 | Realm Feed | **Implemented 2026-07-09** (v1 aggregate; design regroup for event edges) |
| 6 | Realm experience completion | **Implemented 2026-07-10** — invitations, feed navigation, anchor persist, mobile parity |

## Implementation map

| Area | Location |
|---|---|
| Anchor API | `apps/api/src/api/domains/routes.ts` — `GET /my` `isPrimary` |
| Agent environment | `apps/api/src/services/kip/resolveAgentEnvironment.ts` |
| Realm feed API | `apps/api/src/api/realm/feed.ts` |
| Feed types | `packages/shared/src/realm/feed.ts` |
| Arrival UI | `apps/web/src/v0/realm/` |
| Scene change | `apps/web/src/v0/sceneChange/` |
| Home shell | `apps/web/src/pages/home/HomeShellPage.tsx`, `V0Shell` `shellMode === "home"` |

## Open (regroup)

- Invite verb across scenes
- Ceox traveling-presence / guest privacy
- Feed retention and edge-scope for "in my reach"
- Exact invitation-button appearance rules
- Three Sizes One Shape (separate capture)

## 📆 Update Log

### 2026-07-10 — Arrival presentation corrections
- Remarks as Dialog Response with invitations inside bubble; Playbill rail in Chronicle; anchor domain excluded from travel list; realm home solid surface (no cover wallpaper)

### 2026-07-09 — Design capture filed; build completed in Cursor
- Phases 2–5 implemented per this capture

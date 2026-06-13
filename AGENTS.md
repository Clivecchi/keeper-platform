# Keeper — Agent Index

> A structured map of the platform, designed for quick reference and gentle orientation.
> Read this first. Follow the pointers. Do not treat this file as the full spec — it is the index.

---

## Who You Are Working With

**Chuck Livecchi** — platform owner, creative director, non-developer.
Explain what you are doing and why. Bring options with a recommendation.
Surface decisions; do not bury them in implementation.
Do not commit unless Chuck asks. When asked: run `pnpm run smoke` first, then one clear commit message.

**The canonical phrase:** Kip builds Keeper. On Keeper. Through Keeper.

---

## Read These First (in order)

Before touching any code, read these canonical documents:

| Document | What It Covers | Trust Level |
|---|---|---|
| `docs/keeper-heart-mind.md` | Data model + narrative/runtime split | Highest — code-backed |
| `docs/keeper-ui-experience.md` | Surfaces, frames, engagement pipeline | Highest — code-backed |
| `Keeper jsonframe spec.md` | JSON UI Frame build sequence (Steps 1–6) | High — March 2026 — verify exact filename in repo root |
| `.cursor/rules/root-rules.mdc` | Monorepo rules, ops contract, CI/CD | High — technical rules valid; §12 Kip framing outdated |
| `.cursor/rules/readme-policy.mdc` | README + docs/modules/ sync on folder changes | Always apply |
| `.cursor/rules/strict-types.mdc` | TypeScript export conventions | Always apply |

If a document conflicts with the Prisma schema or live codebase, **the codebase wins.**

---

## Data Model — Canonical Hierarchy

**Data layer (Prisma — sacred, do not flatten or rename):**
```
Domain → Keeper → Journey → Path → Moment
```

**Experience runtime (separate layer — do not collapse into data model):**
```
Domain.frame_json → ExperienceMode → Frame → SlideType → Theme tokens
```

ExperienceMode derives at runtime as: `publicStory | commons | kipFocus | admin`

Frames are surfaces (V0FrameKey): `cover`, `index`, `moment`, `moments`, `commons`, `kip`, `admin`, `journeys`, `present`, `hub`

Present, Commons — surfaces/frames, not Prisma models.
Chronicle = right panel (UniversalViewPanel), not a frame route.
"View" is overloaded in code. Do not treat it as a hierarchy layer.

→ Full detail: `docs/keeper-heart-mind.md`

---

## Agents & Assistance — Kip

Kip is both: a modular agent framework (actions, sessions, MCP) **and** a named Lead agent with a fixed voice and persona. These are not in conflict.

**What Kip does today (wired and working):**
- Full AI chat pipeline via Lead agent class
- SOLE memory: system prompt injection, memory card reads at session start, `sole.save` / `sole.read` actions
- Domain contract injection via frame JSON + policy packs
- `experienceContext` injected into UniversalConversation, AgentBoardFrame, and API
- Session management, naming, closing rituals
- MCP tool integration
- Engagement Template execution

**What Kip still needs (Phase 1 gaps):**
- SOLE Voice Panel, Echo, Logbook — schema exists, no agent actions yet
- Reliable trigger conditions for `sole.save` vs drafts
- Full Engagement Template surfacing on Moments and Presents
- Frame navigation on the user's behalf
- Companion surface hardening (public guest path — jsonframe Steps 3–5)

**Kip's model:** `claude-sonnet-4-6` via Anthropic API (default for seeded agents — verify against `packages/database/prisma/seeds/ai-keeper-sole.sql` before assuming model string).
Per-agent config may override via `kip_agents` / platform keys — do not hardcode Anthropic everywhere.
`ANTHROPIC_API_KEY` must be present in Railway environment variables.

→ Full detail: `docs/keeper-heart-mind.md`, `Keeper jsonframe spec.md`

---

## Activity — Build State

**Current focus: JSON UI Frame (jsonframe spec Steps 1–6)**

| Step | What | Status |
|---|---|---|
| 1 | Domain JSON object + fetch | Done — `Domain.frame_json`, V0Shell load |
| 2 | Audience resolution | Done — `resolveAudience.ts` |
| 3 | InteractionBar from JSON | Done — labels + order from JSON; Rendr TODO for layout grouping |
| 4 | Companion SlideType | Done — guest agent/kip frames redirect to cover + companion; greeting + cues wired |
| 5 | Cover card from JSON | Done — `available_to` enforced; Design View TODO for card variants |
| 6 | Kip reads the JSON | Done on auth paths — experienceContext wired |

All six steps are complete. JSON UI Frame v0 is functionally complete per jsonframe spec. Broader public/auth hardening may still remain.

**Note for domains with existing `frame_json` in DB:** Re-seed or PATCH `frame_json` if you want `interaction_bar.labels` persisted. `loadDomainFrame.ts` merges default labels as fallback.

**Phase 1 (jsonframe Steps 1–6 complete — now in progress):**
- Extend Universal Board / Chronicle — do not rebuild IDE or Agent boards from scratch
- Legacy KeeperJourneysPage / KeeperMomentsPage OR migrate to v0 frames (JourneysFrame v0 is real — extend it)
- Engagement Templates wired on Moments and Presents
- Theme creation UI and API
- Present / SlideType storytelling surfaces
- Icon View Switcher (spec'd in jsonframe spec for admin workspace — not yet built as one control)

**Phase 2:** Pool Keeper (proof of concept on working platform)
**Phase 3:** Generation Keeper (first production instance — livecchi.us)

Do not build Phase 2 features while Phase 1 is incomplete.

**Product flow language:** Capture → Shape → Keep → Show (product).
**Engineering UX flow** (root-rules): Capture → Connect → Create → Build.
Do not treat these as competing implementations.

---

## System — Platform Infrastructure

**Stack:**

| Layer | Technology | Host |
|---|---|---|
| Monorepo | pnpm workspaces + Turbo | — |
| Frontend | React 19 + Vite + TypeScript | Vercel |
| Backend | Express + TypeScript | Railway |
| Database | PostgreSQL + Prisma | Railway |
| Auth | KAM (`packages/kam`) + JWT | — |
| Shared packages | `@keeper/database`, `@keeper/kam`, `@keeper/shared` | — |
| AI providers | Anthropic, OpenAI, Together, ElevenLabs | Per-agent config |
| Proxy | `apps/proxy` (MCP + read-only gateway) | Railway (often disabled) |

**Prisma schema:** `packages/database/prisma/schema.prisma`
(root-rules.mdc has a stale path — use the above)

**Boards** (authenticated workspaces): `?board=ide|agent|domain|designer` on `/d/:slug/board`
Universal Board = nav + conversation + Chronicle (right panel). See `apps/web/src/v0/boards/`.

**Operational commands:**
```
After API edits:   pnpm run quick:api
After web edits:   pnpm run quick:web
Before commit:     pnpm run smoke
DB migrate:        pnpm db:migrate
DB generate:       pnpm db:generate
```
(DB commands run from repo root via root package.json → @keeper/database)

**Live URLs:**
- Production: `ke3p.com`
- Hub: `ke3p.com/d/default?frame=hub`
- IDE Board: `ke3p.com/d/default?board=ide`
- Agent Board: `ke3p.com/d/default?board=agent`
- Local dev: `http://localhost:5173`

---

## Known Architectural Debt

Do not recreate these problems:

| Issue | Detail | Rule |
|---|---|---|
| Dual Journey API routes | Active route: `apps/api/src/api/journeys.ts`. Inactive upgrade path: `apps/api/src/api/journey/domain-integrated-routes.ts` (explicitly not mounted) | Never add a third route |
| Auth legacy tokens | `keeper_session`, `keeper_token`, `auth_token` in authMiddleware | Consolidate on KAM; never add a third auth path |
| SOLE wiring gaps | Voice Panel / Echo / Logbook schema exists, not called | Wire in; never remove SOLE infrastructure |
| Kip Draft reliability | CRUD exists; trigger conditions under-specified | Fix triggers; do not rebuild |
| Role matrix display bug | `GET /api/admin/roles/users` returns `roles: []` — line 45, explicit comment in `apps/api/src/api/admin/roles.ts` | Fix with Board redesign, not in isolation |
| Memory Patterns registry | UI scaffolding only — no API or DB table | SOLE is real (service layer); registry is not connected to it |
| Agent Classes registry | UI scaffolding only — `role` field is real and changes runtime | Persona = not implemented (not disabled); Standard/Lead/Coordinator = real |

**Engagement Templates:** "Start Journey" failures often mean templates weren't seeded. Check `packages/database/prisma/seeds/journey-path-moment-engagement-templates.seed.ts`.

---

## What Not to Build Yet

These are real, documented, and coming. They are not now:

- Icon View Switcher (Phase 1 item — spec'd for admin workspace, not yet built as one control)
- 3D co-build / rendering engine
- Live vendor pricing
- Mobile app
- Marketplace (KeeperType publishing)
- Dev Board / Kip + Cloud collaborative IDE (Cloud's current build target — not yet)
- Persona agent class implementation

---

## Agent Rules

1. **Read before writing.** Check what exists before building. Ask the codebase first.
2. **One bounded goal per session.** Name it. Finish it. Do not scope-creep.
3. **Do not touch what you are not asked to touch.** Working code stays working.
4. **Never create a second version of something that already exists.**
5. **Follow existing patterns.** Match Prisma style, Express route structure, React conventions in codebase.
6. **Do not commit unless Chuck asks.** When asked: `pnpm run smoke` first, then one clear commit message.
7. **Update folder READMEs.** Any change to `/components`, `/routes`, `/lib`, `/api` — update that folder's `README.md` and copy to `docs/modules/`. See `.cursor/rules/readme-policy.mdc`.
8. **End every session** with: what changed, what the next logical task is.

---

*This is an index, not a spec. When in doubt, follow the canonical documents it points to.*
*Last updated: May 2026 — jsonframe Steps 1–6 complete. Phase 1 platform stack in progress.*
*Maintained by: Cloud · final review: Chuck*
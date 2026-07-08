# V0 Shell

## 📌 Purpose
Centralize frame routing, theme application, and navigation helpers for domain board surfaces.

## 🧱 Key Files
- `V0Shell.tsx`
- `V0ShellContext.tsx`
- `FrameContext.tsx`
- `AgentComposerContext.tsx` — Provides composer state from AgentBoardFrame to Margin (bottom bar)
- `guestPublicStory.ts` — guest-allowed frames + URL resolution for public story
- `usePlacementMode.ts`
- `useWorkspaceView.ts`
- `useAgentWorkspaceView.ts`

## 🔄 Data & Behavior
The shell resolves the domain slug, applies the active theme/style, and routes frames by query param. It exposes navigation helpers so frames can build URLs and return to `/d/:slug/board` with theme preserved.

Audience is resolved once via `GET /api/domains/by-slug/:slug/audience` (optional auth) and `@keeper/shared` `resolveDomainAudience` — roles: `guest | friend | keeper | admin`. Child frames consume `resolvedAudience` from context; they do not re-resolve independently.

## 📆 Update Log
- 2026-07-07: `/home` anchor resolution — no silent `default` slug fallback; empty state when user has no domains (use `?domain=` or add a domain).
- 2026-07-07: Pending `?board=` state ignores workspaces unavailable on the active domain slug; clears stale pending board/definition when slug changes (fixes picker stuck after Ke3p → Ceox).
- 2026-07-03: `KeeperTopBar` board links filtered by domain — IDE/Design only on platform slug `default` (KE3P).
- 2026-07-03: **Lead agent + Design board fixes** — auto-provision runs for domain owners when lead agent row is missing (not only unseeded frames); Design workspace auto-selects `?definition=domain` when none set; router/window mismatch warnings dev-only.
- 2026-07-02: **FrameContext** journey resolution uses `loadJourneyNavRows` (board nav cache) instead of raw `/api/journeys` — dedupes with Nav/Conversation/Chronicle.
- 2026-07-02: **Soft domain switch** — slug changes apply cached domain/frame/audience immediately; `UniversalBoard` no longer remounts on domain pick.
- 2026-07-02: Public guest cover uses `gray-earth` default style (not Warm Dark `neutral`); synchronous `domain-resolved` theme bootstrap from default frame JSON before async fetch.
- 2026-07-02: Board workspace switch performance — domain by-slug fetch uses `domainShellCache`; audience context no longer cleared on every auth tick.
- 2026-07-01: Phase 4B — mobile auth default `?board=realm`; Realm tab is primary home in `UniversalMobileShell`; `/realms` entry route.
- 2026-07-01: Phase 3.3 — guests with `?board=*` strip to public story (Cover / Present); no blank screen or UniversalMobileShell; `PublicGuestChrome` + `public-story-shell` wrapper.
- 2026-07-01: Phase 3.2 — fetches domain audience context from API; `friend` role for connection-scoped members.
- 2026-06-28: Step 1.2 auto-provision — domain owners loading an unseeded personal domain trigger `POST /api/domains/:id/provision` and frame reload (`v0/lib/ensureDomainProvisioned.ts`).
- 2026-06-27: Domain workspace (`?board=domain`) now mounts `DomainBoard` (includes live `DomainSwitcher` fetch) instead of bare `UniversalBoard`.
- 2026-06-15: `FRAME_TO_JSON_KEY` canonical source moved to `@keeper/shared/structure/frameJsonMap`; this file re-exports for backward-compatible imports.
- 2026-06-12: Removed designer-only auto-default `?definition=ide` (was racing stale router and blocking Design open). All board URL writes use `commitBoardSearch` → `navigate()` from authoritative search params.
- 2026-06-12: Panel reads use `useBoardDefinitionFromUrl()` hook — V0Shell still exposes `boardDefinitionId` for legacy consumers.
- 2026-06-12: Design definition selection — all board panels read `boardDefinitionId` from V0Shell (parsed from `location.search`); no panel uses `useSearchParams()` for `?definition=`.
- 2026-06-12: `UniversalBoard` key is `boardId` only — definition switches no longer remount the board (fixes stale `useSearchParams` on Design nav highlight).
- 2026-06-12: Design nav uses `setSearchParams(prev => …)` updaters; removed workspaceEpoch remount race.
- 2026-06-12: Board definition id derived from `location.search` each render; UniversalBoard key includes `?definition=` for definition-to-definition remounts.
- 2026-06-12: Board workspace navigation centralized in V0Shell (`switchWorkspace`, `selectBoardDefinition`); strips stale `?definition=` / legacy `?boardDef=` on non-Design workspaces.
- 2026-05-25: Renamed `ExperienceMode` → `PlacementMode` (`usePlacementMode.ts`, `placementMode`, `placementActions`) — shell placement vs domain Experience concept.
- 2026-05-21: jsonframe Step 4 — guests requesting `?frame=agent|kip` redirect to cover with `companion=1`; `usePlacementMode.openKip` opens companion for guests. `resolveFrame` maps guest agent/kip requests to cover.
- 2026-03-28: Authenticated users with no `frame` or `board` query params are redirected (replace) to `?board=domain`; `defaultFrame` remains `commons` for explicit `?frame=` navigation.
- 2026-02-28: FrameContext now derives domain from V0Shell domainData when inside V0Shell — single /api/domains/by-slug fetch, eliminates duplicate domain requests and staged load flicker.
- 2026-02-19: Added AgentComposerContext — AgentBoardFrame provides composer props; Margin consumes when frame is agent/kip to render composer in bottom bar.
- 2026-01-31: Registered the Present frame in the v0 shell frame registry and frame key union.
- 2026-01-27: Added Experience Mode controller + actions and allowed public Kip frame access.
- 2026-01-19: Added kip frame alias to point at the agent surface.
- 2026-01-19: Registered the Index frame in the v0 shell frame registry and frame key union.
- 2026-01-19: Added visible build stamp (commit + build time) for v0 shell frames.
- 2026-01-18: Added canonical v0 shell routing + navigation helpers.
- 2026-01-24: Redirected unauthenticated requests away from private frames (kip/agent/admin/profile).
- 2026-01-25: Gated the build timestamp HUD behind `VITE_SHOW_DEBUG_HUD` and moved it away from the bottom margin.
- 2026-01-25: Defaulted authenticated domain board routing to the Commons frame.
- 2026-02-05: Added `FrameContext.tsx` implementing the Context Contract (auth, domain, keeper/journey selection, theme, frame metadata). Injected `FrameContextProvider` inside V0Shell wrapping all frame components.
- 2026-02-09: Extracted `useWorkspaceMode` — generic hook for URL-driven workspace mode state. Reads/writes a search param, validates against an allowed mode list, and falls back to a default. Used by CommonsFrame and available for any frame with switchable workspace modes.
- 2026-02-09: Added `useWorkspaceView` — URL-driven workspace view state hook using a `WorkspaceView` discriminated union (`feed | entity | create | summary`). Replaces fixed mode enums for workspaces that need entity-level navigation. Serializes view state to `?view=`, `?entityType=`, `?entityId=`, `?template=` search params. `useWorkspaceMode` remains for simpler fixed-mode cases.
- 2026-02-09: Added `useAgentWorkspaceView` — Agent-specific workspace view hook with `dialogue | draft | cockpit` view kinds. Serializes to `?view=dialogue&sessionId=xxx`, `?view=draft&draftId=yyy`, `?view=cockpit`. Used by the new `AgentBoardFrame`. Split `"agent"` frame key to point at `AgentBoardFrame`; `"kip"` retains the legacy `AgentFrame`.
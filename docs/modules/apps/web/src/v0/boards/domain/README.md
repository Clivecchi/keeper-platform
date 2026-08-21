# Domain Board

## ?? Purpose
The public-facing domain overview board. Persisted Kip conversation in the center (sessions created and resumable). Domain feed (recent Moments + active Journeys) lives in Chronicle (right panel) as its ambient idle state. Three-column layout: left board/frame nav, center dialog shell, right Chronicle.

## ?? Key Files
- `DomainBoard.tsx` ? Root board component; delegates three-column layout to `UniversalBoard`.
- `DomainSwitcherOverlay.tsx` ? Reusable domain switcher overlay (fetch, list, add panel, navigate). Used by `UniversalBoard` on all member boards.
- `domainSwitcherData.ts` ? Fetches `GET /api/domains/my`; uses API `leadAgentSlug` (DB-first from `settings.primaryAgentId`); frame fallback; in-memory + sessionStorage cache (5 min TTL).
- `domainShellCache.ts` ? Per-slug by-slug + audience cache; `prefetchDomainShell`; `resolveDomainCoverUrl` / `resolveDomainShellDisplayName`; warm-skip predicates.
- `domainShellBootstrap.ts` ? `bootstrapDomainShell` orchestrator + `isDomainShellReady` (requires display name) + cover decode wait.
- `dialogSessionPrefetch.ts` ? Prefetch/resume Dialog session during curtain so board reveal is Dialog-ready.
- `domainShellPrefetch.ts` ? Re-export of `prefetchDomainShell` (legacy import path).
- `DomainAiAccessNav.tsx` ? AI provider access summary (Agent Board).
- `DomainExternalAccessNav.tsx` ? domain MCP access keys for external tools (Domain / Realm / IDE nav).
- `externalAccessKeyIds.ts` ? Chronicle id helpers (`dak:{id}`, `external-access` overview).
- `domainSwitcherTheme.ts` ? Fixed light-on-dark ink tokens for picker readability.

## ?? Data & Behavior
- **Domain switcher**: `UniversalBoard` mounts `useDomainSwitcher` ? top-bar domain click opens overlay on IDE, Agent, Design, and Domain boards. Selection navigates to `/d/:slug?board=<current workspace>` (soft switch ? shell stays mounted). List is cached client-side (5 min); hover prefetches domain shell data (frame + by-slug + audience). Nav lists use stale-while-revalidate per `domainId`.
- **Left panel**: Collapsible board switcher (Domain / Design / Agent) and frame list.
- **Center panel**: `DomainBanner` at top, then `DomainBoardConversation` ? persisted Kip sessions routed through `KipApi.runAgent`. Sessions are created on mount, resumable.
- **Right panel**: Chronicle (`UniversalViewPanel`). When `domainSlug` is provided (as it is for Domain Board), the idle state shows domain feed content: recent kept Moments + active/present Journeys. Never blank.
- No feed/dialog toggle ? the center is always a dialog. The feed lives in Chronicle.

## ?? Notes & ToDo
- [x] Default lead agent + keeper seed on domain create (`provisionDomainOnCreate` ? Step 1.2).
- [x] Set `primaryDomainId` when user's first personal domain is created.
- [x] Phase 2.1 Guided Arrival ? first owner visit shows Cover + lead-agent Dialog (`v0/guidedArrival/`).
- [ ] Domain Board session resumption ? allow users to return to a prior Domain session via Chronicle trail.
- [ ] Repair existing domains via `POST /api/domains/:id/provision` from onboard UI (API ready; auto-repair on shell load added 2026-06-28).

## ?? Update Log

### 2026-08-20 — Universal Nav prefetch
- Reveal curtain always warms Dialogs, Drafts, Keepers, Journeys, and Library. External Access stays on Domain Config.

### 2026-08-17 — Glossary in Domain Nav
- Domain `navBlockOrder` inserts **Glossary** after Keeper and before Library. Chronicle read of the Object Glossary — not nested in Library, not labeled as a Document.

### 2026-08-03 — dialogCueing rename (Pass 1)
- `resolveRevealNavSections.ts`: `def.conversation.dialogOrchestration === "director"` ? `def.conversation.dialogCueing === "directed"` (board def field rename, no behavior change).

### 2026-08-03 — Dialog+Gloss OAuth scopes
- `DomainExternalAccessNav`: **Add Dialog+Gloss** patches grant scopes to include `dialog.ro` + `gloss.rw` (keeps existing library scopes).

### 2026-08-03 — External Access OAuth grants
- `DomainExternalAccessNav` lists active MCP OAuth grants with revoke; MCP URL copy uses canonical `https://api.ke3p.com/mcp`.

### 2026-07-28 — Domain picker SWR cache
- `peekDomainSwitcherEntries` returns last-known list after TTL; overlay seeds from cache and never shows "Loading domains" when any list exists (background revalidate).
- `prefetchDomainSwitcherEntries` refreshes stale cache instead of treating expired TTL as empty.

### 2026-08-17 — External writing ingest
- New External Access keys include `dialog.rw` (Bring in writing) alongside Dialog read and Gloss.

### 2026-07-24 ? cast-select-must-not-change-atmosphere
- `domainShellCache` bumps a version + `subscribeDomainShellCache` so UniversalBoard can refresh cover without tying atmosphere to cast selection.
- Cover resolve remains per-slug; never read another domain's theme during soft-switch races.

### 2026-07-22 ? stop-eager-dialog-creation
- `dialogSessionPrefetch` ? resume-only during curtain (no Dialog create on visit).
- `prepareDomainBoardReveal` ? board-ready no longer requires a session id.

### 2026-07-15 ? External Access nav dedupe + Chronicle manage
- Removed duplicate `DomainExternalAccessNav` render (was mounted in both `externalAccess` block and inside Library).
- Nav key rows show label + prefix; click opens Chronicle `ExternalAccessKeyPresence` (label edit, revoke).
- `externalAccess` placed after Library in Domain/Agent board `navBlockOrder`.

### 2026-07-14 ? External Access keys
- `DomainExternalAccessNav` ? create/revoke domain-bound MCP keys (Library read); secret shown once

- 2026-07-12: **Playbill dropdown** ? `DomainSwitcher` renders inside `keeper-topbar-playbill-anchor` (no body portal); toggle on header click; add/status panels share anchored dropdown shell.
- 2026-07-12: **Shell bootstrap** ? `domainShellBootstrap.ts` parallelizes cold-load fetches; Chronicle enrichment reads cached by-slug record (no duplicate `GET /domains/:id`).
- 2026-07-12: **Phase 1b mobile** ? Domain board on ?767px uses adaptive `UniversalBoard` (Nav · Dialog · Chronicle bottom bar); domain picker via top-bar playbill.
- 2026-07-11: **DB-first `leadAgentSlug`** ? API resolves from `settings.primaryAgentId`; `domainShellCache` stores `leadAgentSlug` on by-slug fetch.
- 2026-07-10: Domain picker uses **Playbill** cards (`PlaybillCard`) ? top-bar header + travel list with live stats (`GET /api/domains/:id/stats`).
- 2026-07-07: `resolvePostLoginDomainSlug` returns `null` when user has no domains ? never falls back to platform slug `default`; `/home` shows explicit empty state until `?domain=` or a domain exists.
- 2026-07-07: Domain picker resolves target `?board=` to a workspace available on the selected slug (e.g. Ceox lands on Domain, not IDE); navigation uses `replace: true`.
- 2026-07-02: `resolvePostLoginDomainSlug` ? login lands on primary owned domain (`isPrimary` from `/api/domains/my`), not hardcoded `default`.
- 2026-07-02: **Soft domain switch** ? no `UniversalBoard` remount on slug change; `domainShellCache` seeds by-slug/frame/audience; board selection + Chronicle Acts reset in place; panel split persists per workspace.
- 2026-07-02: **Domain switch prefetch** ? hover/focus on picker cards calls `prefetchDomainShell` (frame + by-slug) before navigate.
- 2026-07-03 (pm): Home shell domain picker navigates to `/home?domain=:slug` (anchor switch); member boards unchanged.
- 2026-07-02: **P1.1 domain picker cache** ? `domainSwitcherData.ts` adds memory + sessionStorage cache (5 min TTL), deduped fetch, `prefetchDomainSwitcherEntries` on board mount; overlay uses stale-while-revalidate (instant open from cache, background refresh).
- 2026-07-01: Phase 2.1 Guided Arrival ? `GuidedArrivalOrchestrator` on Domain Board; lead agent Dialog + Chronicle Cover greeting for pending owners.
- 2026-06-30: Phase 1.1 ? Extracted `DomainSwitcherOverlay.tsx` + `useDomainSwitcher`; wired in `UniversalBoard` so IDE, Agent, and Design boards get the same top-bar domain switcher as Domain Board.
- 2026-06-28: `V0Shell` auto-calls `POST /api/domains/:id/provision` when personal domain frame still shows KE3P defaults; reloads frame after repair.

### 2026-06-28 ? AI Access nav typography + domain copy
- `DomainAiAccessNav`: provider lines 14px; section uses shared `keeper-nav-section-title` (no 10px override).
- `DomainAddPanel`: placeholders say domain, not realm (Realm is a separate Universal Board).

### 2026-06-27 ? Step 1.2 (partial): Add domain from switcher
- `DomainAddPanel` + `POST /api/domains`; navigates to new slug on success.
- Picker ink: fixed light-on-dark tokens in `domainSwitcherTheme.ts`.

### 2026-06-27 ? Switcher: user domains + readable text
- Fetch switched from `GET /api/domains` (all domains) to `GET /api/domains/my` (owned + permitted only).
- Client filters inactive / soft-deleted rows.
- `DomainSwitcher` ink/border tokens fixed for dark board theme (`--theme-ink-*-color`, `hsl(var(--theme-border-soft))`).

### 2026-06-27 ? Domain switcher overlay + stale cache fix
- Switcher/status panels render via `createPortal(document.body)` with `position: fixed` so the dropdown is not clipped by board layout.
- API `getUserDomains` heals stale Redis lists when owned domains are missing from cache (repair-script path).

### 2026-06-27 ? Step 1.1: Real domains in DomainSwitcher
- Removed `MOCK_DOMAINS` from `DomainBoard.tsx`.
- Added `domainSwitcherData.ts` ? live fetch from `GET /api/domains` (`domains` array from paginated response). Uses same-origin fetch on localhost so Vite `/api` proxy is used during local dev.
- Loading, empty, and error states render in `DomainBoard` before `DomainSwitcher` opens (switcher UI unchanged).
- Domain selection navigates to `/d/:slug/board?board=domain` so Chronicle reloads via `DomainFocusPresence`.

### 2026-05-09 ? Domain Board center correction + useAgentDialog
- Removed `centerMode` state, `FeedFrame`, Feed/Dialog toggle, and `/api/domains/:id/kip/designer` route from Domain Board.
- Created `DomainBoardConversation.tsx` ? wires `useAgentDialog({ mode: "domain", agentSlug: "kip" })` for persisted sessions.
- Center is now a standard dialog panel; sessions created and resumable like IDE/Agent boards.
- Chronicle (`UniversalViewPanel`) now receives `domainSlug` prop enabling domain feed (recent Moments + active Journeys) at idle state ? never blank.
- 2026-04-28 (Prompt 5): Added `activeJourneyId` state. When "Journeys" frame is selected in the left nav, the board fetches `/api/public/:domainSlug/journeys`, picks the first Journey, and renders `KeeperJourneyPanel` in the right panel (full-panel, no outer header). `handleMomentSelectFromJourney` fetches the moment by ID when a Moment row is tapped in `KeeperJourneyPanel`, then switches the right panel to `MomentDetailPanel`. Existing Feed `onMomentSelect` and `MomentDetailPanel` behavior unchanged.
- 2026-04-27 (Prompt 4): Added `centerMode: 'feed' | 'dialog'` state (default: `'feed'`). Domain Board now launches in Feed Mode (The Commons ? FeedFrame in Zone 2, no Banner). Sending a message triggers a transition to Dialog Mode (The Workshop ? DialogueMessageList in Zone 2, Banner with ? Commons affordance). `onReturnToFeed` prop on `KeeperDialogFrame` wires the back button to return to Feed Mode. Trigger B (Keeper selection) is pending ? no `activeKeeper` state exists in DomainBoard yet.
- 2026-04-27 (Prompt 3): `DomainBoard` restructured. Removed separate `FeedFrame` block and fixed-height (300px) `KeeperDialogFrame`. Now uses a single `KeeperDialogFrame` with `dialogContent={<FeedFrame .../>}` filling the full remaining height below `DomainBanner`. Removed `background: "#fefdfb"` from center panel so Board atmosphere is visible. Feed scrolls inside `.dialog-message-surface` with 85% gradient dissolve.

### 2026-07-15 ? Load sequence quality
- Shell readiness requires display name; shared cover URL helper; dialog session prefetch during curtain.
- Fail-closed gate + retry lives in DomainShellGate; travel warm-skip aligned with readiness.


### 2026-07-16 ? Board reveal readiness
- prepareDomainBoardReveal warms shell, dialog session, lead Playbill agent, and nav under the curtain.
- Playbill agent cache persists across domain switches; switcher prefetches all lead agents.


### 2026-07-17 ? Curtain awaits Nav warm
- `resolveRevealNavSections.ts` ? maps board def ? nav slices to warm before reveal.
- `prepareDomainBoardReveal` awaits `prepareBoardNavData` alongside dialog/cover/lead.
- Gate/travel skip require `isBoardNavWarm` so a warm shell without Nav does not skip the curtain.

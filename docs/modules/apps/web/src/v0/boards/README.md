# Boards

## ?? Purpose
V0 Boards are full-viewport surfaces accessed via the `?board=` URL parameter. A Board owns its layout, chrome (top banner, InteractionBar), and context entirely � V0Shell mounts a Board and steps back.

## ?? Key Files
- `UniversalBoard.tsx` � Master orchestrator shell (Nav � Dialog � Chronicle); mounts domain switcher overlay for all boards
- `boardNavDataCache.ts` � In-memory nav list cache (dialogs/journeys/keepers/drafts/agents) across workspace switches
- `domain/domainShellCache.ts` � Per-slug domain + audience cache for soft domain switch
- `boardRegistry.ts` � Registry of all V0 Boards; parallel to `FRAME_REGISTRY` for Frames
- `workspaceBoardNav.ts` � Shared `?board=` / `?boardDef=` URL helpers for workspace switching
- `domainWorkspaceBoards.ts` � Per-domain allowed workspace boards (KE3P vs member domains)
- `realm/` � Realm Board (`?board=realm`) � personal domain primary workspace
- `designer/` � The Design Board (Platform Admin tool for editing domain frame JSON with Kip)

## ?? Data & Behavior
- Boards are accessed via `?board=<key>` on any `/d/:slug/board` URL
- `BOARD_REGISTRY` maps each key to a component, display name, and auth flags (`isPrivate`, `isAdminOnly`)
- V0Shell reads `?board=` and renders the matching Board component inside V0ShellProvider context
- Boards call `useV0Shell()` to access `domainSlug`, `domainFrame`, `resolvedAudience`, etc.
- `?board=` takes precedence over `?frame=` when both are present in the URL
- **Nav content gating (Realm prerequisite):** `NavPanelDef.navMode` � `"static"` (default) shows all enabled sections; `"contentGated"` hides entity sections when loaded count is 0. Override with `navAlwaysShow` (e.g. `["dialogs"]`). Logic in `navContentGating.ts`; applied in `UniversalNavPanel.renderNavBlock`.

## ?? Notes & ToDo
- [ ] Boards do not currently have their own URL namespace � they share `/d/:slug/board`
- [ ] `V0BoardKey` type lives in `boardRegistry.ts`; if more boards are added, consider splitting
- [x] Migrate existing boards (IDEBoard, AgentBoard, DomainBoard) to use `UniversalBoard` shell � DONE
- [x] Build `UniversalConversation` component � DONE (Level 2, 2026-05-10)
- [ ] Level 3: UniversalViewPanel (right panel) reads def.contextSurface; 5-state IDEBoard right becomes default Chronicle behavior

## ?? Update Log

### 2026-07-30 — Agent Echo persistence + resume/sanitize
- After Echo / Kip-collaboration runs, primary agent message gets `metadata.echo` (`content`, `attributedTo`, `status`: ok|empty|failed) via `updateMessageMetadata` — same persistence pattern as Voice Card `castVoices`, separate field.
- `useAgentDialog.normalizeMessage` rehydrates `echo` on fetch/reload (Agent Board + lead-led Domain/Realm).
- Echo side-sessions never resume as the primary board session; Echo ensure uses exact session name.
- `sanitizeUserMessageContent` strips `[Agent Echo — supporting role]` and `[Platform collaboration — …]` scaffolds.

### 2026-07-28 — Board land resumes last session (per boardId)
- `UniversalConversation` passes `dialogBoard: def.boardId` into `useAgentDialog` — Realm no longer shares Domain's Dialog key via `kipMode: "domain"`.
- IDE / Designer / echo resume-create paths use `def.boardId` the same way.
- Contract: mount resumes the board Dialog's last session (pick up where you left off); first send creates only when none exists. Nav need not open a Dialog.

### 2026-07-28 — Chronicle contract (no Sessions) + Playbill chip
- Overlay still mounts `UniversalViewPanel` (Trail Bar + Panel Body). Session lists removed from Chronicle enrichment (agent/dialog) and Draft Sessions blocks; Keeper ambient relabeled Journeys.
- Strip idle tip = domain name + “Journeys · Moments”; expand clears agent-only selection → domain idle. Gloss from Document points closes overlay (long-press + button → `requestDiscussDraftPoint`).
- Playbill Path A: name-only chip; full picker remains top-bar overlay.

### 2026-07-28 — Chronicle strip + Nav drawer (retire bottom tabs)
- Adaptive Domain/Realm (≤767px): Dialog always primary; **Nav** = hamburger → `BoardMobileNavDrawer`; **Chronicle** = ambient strip above Composer → `BoardMobileChronicleOverlay`.
- `BoardMobilePanelBar` no longer mounted. Playbill owns LIVE/identity; Dialog domain/breadcrumb banners suppressed on this path (`suppressMobileDomainBanner`).
- Top board-link row hidden when Nav drawer is active (one identity bar).

### 2026-07-27 — Mobile Dialog density (Playbill + banner + composer)
- Top-bar Playbill + Dialog banner collapse on ≤767px (see `v0/components`); adaptive Domain/Realm already wires `mobile-staged` composer.
- `UniversalConversation` — response stage hides composer toolbar agent chips so the compact input floor stays thin.
- `board-mobile.css` — compact banner padding + larger tap targets for expanded access actions; thinner response-stage composer chrome.

### 2026-07-26 — Roll Call consults full cast by default
- Empty multi-select no longer means “consult nobody.” Domain/Realm consults all non-Lead, non-silent cast members so voice cards appear without clicking every chip. Explicit chip selection still narrows the set.

### 2026-07-25 — Domain mobile composer reclaim (compact-after-send)
- `UniversalConversation` — on adaptive mobile Domain/Realm (`usesAdaptiveMobileBoardLayout`, ≤767px), wires existing `dialogLayout="mobile-staged"` + `useMobileKipDialogStage` so the composer shrinks to `mobile-compact` after send/idle and re-expands on focus. Reuses KeeperDialogFrame → AgentComposer size mapping; no second sizing path. Desktop and non-adaptive boards unchanged. Does not mount UniversalMobileShell.
- `board-mobile.css` — ≤767px overrides so staged compact (44/56) and expanded (38vh/50vh) beat `.keeper-board-scope` composer 108/220 floors.
- Focus expand: deferred blur handler so class/rows updates don’t collapse mid-tap; clear focus only when a send finishes.

### 2026-07-25 — post-deploy cast honesty + consult reporting
- `directorDialog` — Document-item quoting rules on instrument + cast synthesis prompts; participation helper for support_only/silent.
- `UniversalConversation` — passes `dialogId` + `instrumentParticipation` into `useAgentDialog` / director config.
- Client director logs: `addressedInstrument` (single-pin only) vs `consultedSlugs` + accurate consult counts.

### 2026-07-24 — cast-select-must-not-change-atmosphere
- Board page cover is locked to the current domain slug (shell state only when slug matches; else per-slug cache). Cast/instrument toggles never supply cover.
- `useBoardThemeRegistration` depends only on Moment/Path/Journey/Keeper ids — engaging Ceox (or any instrument) no longer re-registers global `domain-resolved` theme.
- Shell cache exposes a version subscription so late cover prefetch paints without unrelated selection churn.

### 2026-07-24 — standing honesty + Dialog participation
- Cast Header chips show Support / Silent from `config.dialog_participation` (default voice; Agent Config override).
- Client `[AgentTurn]` logs mechanism A vs plain Lead / director instrument before `runAgent`.
- Docs: Mechanisms A (multi-select) and B (`delegate.consult`) kept distinct; standing honesty lives in live `callAIModel`.

### 2026-07-23 — becoming-together-complete
- Domain/Realm multi-select now consults engaged cast members for real minimal replies (or honest empty) before Lead synthesis — not stamp-only.
- Cast Header Invite opens `InviteCollaboratorDialog` → `POST /connections/invite` with copyable accept link; `/invite/accept` redeems tokens.
- Anti-fabrication on consult paths: director fallback + cast synthesis never invent another agent's words; `delegate.consult` action + follow-up for Lead-initiated consults.

### 2026-07-23 — stop-orphan-echo-sessions
- Echo/collaboration effect in `UniversalConversation` is resume-only (no create on effect). Create deferred to first real echo via `resumeOrCreateBoardSession` with correct `dialogBoard`/`dialogFrame` keys — stops dialog_id=null orphan multiplication.

### 2026-07-22 — stop-eager-dialog-creation
- `UniversalConversation` IDE/Designer mount effects use `resumeBoardSession` only; first send creates via `useAgentDialog.sendMessage`.
- Prefetch / curtain paths no longer create empty Dialogs on visit.

### 2026-07-22 — Cross-domain cast membership
- `UniversalConversation` loads Dialog cast members/candidates from kip-dialogs APIs; merges enabled leads into `domainDirectorBoardInstruments` / labels.
- Cast Header **Add** (via `DirectorCastHeader`) enables a lead by `homeDomainId` only — Admin + lead resolution stay server-side.
- Phase 1 enablement only; no per-agent delegation.

### 2026-07-19 — Realm Chronicle Dialog scope
- `UniversalNavPanel` passes `selectedDialogId` / `onDialogSelect` into `RealmStagedNav` so Dialog headers can scope Chronicle
- `UniversalViewPanel` keeps Realm Chronicle on `DomainRealmStory` for dialog / draft / moment / library subjects (Document scope, not entity Focus)
### 2026-07-17 � Dialog delete from Nav list
- `UniversalNavPanel` � Dialogs (and Chatter) rows reuse Draft-style hover trash ? `InlineDeleteRow` confirm; calls `deleteDialog`, drops the row + `removeCachedBoardNavRow` on 204, surfaces 404/500 in the confirm row, clears selection/session when the deleted Dialog was selected.
- `boardNavDataCache.removeCachedBoardNavRow` � optimistic cache drop without full nav reload.

### 2026-07-16 � Theme handoff after load curtain
- `UniversalBoard` StyleScope remounts per domain/theme slug so board inherits curtain-registered `domain-resolved` tokens.
- V0Shell theme bootstrap prefers `peekDomainFrame` before DEFAULT (see shell + sceneChange).

### 2026-07-12 � Phase 1b: Domain board mobile adaptive layout
- `usesAdaptiveMobileBoardLayout()` � Domain + Realm at ?767px use `BoardMobilePanelBar` (Nav � Dialog � Chronicle).
- V0Shell always mounts `UniversalBoard`; legacy `UniversalMobileShell` removed from routing.

### 2026-07-12 � Phase 1: Realm /home mobile uses UniversalBoard
- `UniversalBoard.tsx` � mobile panel focus layout for member boards; imports `board-mobile.css`, `BoardMobilePanelBar`, `useBoardMobilePanelFocus`.
- `workspaceBoardNav.ts` � `usesAdaptiveMobileBoardLayout()` replaces legacy shell gate.

### 2026-07-08 � Keeper, Dialog, Agent Nav create Acts
- Seeded `keeper.create`, `dialog.create`, `agent.create` engagement templates.
- Domain Board Nav `+` on Keepers and Dialogs opens Chronicle Acts (same pipeline as Journeys).
- Agent Board Nav `+` creates agents; Lead agents assign `settings.primaryAgentId` so they appear in the roster.
- `UniversalBoardContext` adds `bumpDialogNav` / `dialogNavRevision` for dialog list refresh after create.

### 2026-07-11 � Lead-led domain collaboration (CeoX leads, Kip supports)
- **Personal domains with non-Kip lead** (`ceox`, etc.): Dialog runs on the domain lead agent � not Kip director synthesis.
- **Kip collaboration echo** � after the lead replies, Kip may add a brief platform/infra beat beneath (same pattern as Agent Board echo; silence is valid).
- **Agents footer:** domain lead + Kip; click Kip to consult platform directly.
- **Kip-led domains** (e.g. `ke3p` default): unchanged IDE-style director mode.

### 2026-07-11 � Agents footer dedupe
- **Domain director instruments:** canonical lowercase slug keys prevent duplicate CeoX/Ceox chips when `frame_json.kip.agent_id` casing differs from `kip_agents.slug`.

### 2026-07-11 � Realm/Home director mode + attachment delegation
- **`REALM_BOARD_DEF`:** `dialogOrchestration: "director"` on `/home` � Kip returns to footer Agents bar alongside domain lead (CeoX, etc.).
- **API `kip/agents`:** director instrument runs now receive `attachments` so delegated lead agents can use vision on screenshots.
- **Domain director instruments:** Kip label always registered in `directorInstrumentLabels`; footer chips mirror Design board when lead is set.

### 2026-07-08 � Domain lead (Ceox) always available on owner domains
- **`frameLeadAgentIdentity`:** domain lead slugs (`ceox`, `*-lead`, �) never cached as missing; no silent Kip substitution in UI.
- **`useFrameLeadAgentIdentity`:** clears stale cache and shows formatted lead name while API resolves.
- **`UniversalConversation`:** domain lead from `frame_json` **or** domain agent roster; pinned to toolbar + footer by default; Kip only in footer Agents bar; dismiss toolbar chip keeps lead invoked via footer.

### 2026-07-08 � Universal agent surfacing (Design + Domain dedupe)
- **Design Board:** `dialogOrchestration: "director"` � Rendr owns composer; footer **Agents** bar lists domain lead (when set) + Kip for delegation.
- **Domain Board:** when platform Kip is the only lead, toolbar ? badge hidden � Kip appears once in footer Agents bar (no duplicate).
- **`AgentComposer`:** `showToolbarAgentIdentity` prop � footer-only agent identity when toolbar would duplicate footer.

### 2026-07-07 � Domain switch + Nav add reliability
- `UniversalBoard.tsx` � only syncs `domainId` from `domainData` when record slug matches URL slug (prevents stale Ke3p id on Ceox after picker switch).
- `UniversalBoardContext.tsx` � `requestChronicleEngagement` surfaces template fetch failures instead of silent no-op (Nav `+` actions).

### 2026-07-03 � Board session reset + load performance
- `UniversalBoard.tsx` � switching `?board=` now clears `activeSessionId`, Chronicle engagement, and nav selection (fixes wrong dialog session after Domain ? IDE ? Agent tab changes).
- `useAgentDialog.ts` � controlled session mode no longer falls back to stale `internalSessionId`; board key change resets transcript bootstrap.
- `useSelectionSessionResume.ts` � Agent nav uses board-scoped `resumeOrCreateBoardSession` instead of agent-wide session lists.
- `UniversalConversation.tsx` � removed duplicate 600ms message refetch; bumps Library nav when `image.generate` archives to Library.
- `kip-dialogs.ts` � `resolve/active` and dialog GET return session `messageCount` only (no full `kip_messages` hydration on bootstrap).

### 2026-07-02 � Soft domain switch
- Domain picker no longer remounts `UniversalBoard` or `KeeperBoardPanelGroup` � slug/context swap in place
- `domainShellCache.ts` seeds by-slug, audience, and frame JSON on navigate; selection and Chronicle Acts reset via `UniversalBoardContext`

### 2026-07-02 � Board switch performance (no full remount)
- `V0Shell` mounts one `UniversalBoard` � switching `?board=` updates `def` in place instead of remounting Domain/IDE/Agent shells
- `boardNavDataCache.ts` � in-memory cache (2 min TTL) for dialogs/journeys/keepers/drafts/agents; survives workspace switches within the same domain
- `boardEntityNameResolver.ts` � keeper/journey banner titles reuse nav cache (no duplicate list fetches from Dialog)
- `UniversalNavPanel` stale-while-revalidate from cache; refetch only when list version bumps
- `UniversalConversation` agents/journey-count/keeper-journey names share nav cache; Chronicle journey poll shares cache
- `domainShellPrefetch.ts` � hover prefetch frame + by-slug before domain switch
- `UniversalBoard` clears entity selection on workspace change; panel group key is slug-only (not boardId)
- `loadDomainFrame` memory cache (5 min TTL) avoids redundant frame fetches

### 2026-07-02 � P3.1 Draft Nav grouping
- **`UniversalNavPanel`**: Drafts grouped by `kind` (sub-cards when multiple kinds); labels show `kind � status` for generic/repeated titles; selected draft first, then `updated_at` desc; client-side hide for `promoted`/`archived` if API returns them.
- **`draftNavUtils.ts`**: shared filter, sort, group, and label helpers.

### 2026-07-02 � P2.3 Cloud routing visibility
- Failed/empty instrument delegation returns `directorDelegation` with `status: failed|empty` from API and client fallback beat.
- `DialogueMessageList` shows amber routing notice when Cloud/Rendr was targeted but did not respond (replaces silent hide).

### 2026-07-02 � P1.2 nav perf (drafts + conversation)
- **`UniversalNavPanel`**: Drafts fetch deferred until section expanded or `selectedDraftId` set; uses `KipApi.listDrafts` with `limit=50` and `excludeStatus=promoted,archived`.
- **`UniversalConversation`**: Removed eager `limit=500` moments fetch on domain idle; moment stat shows `�` until keeper/journey selection triggers a capped fetch.

### 2026-06-30 � Frame lead agent display name (Universal Dialog)
- `UniversalConversation` resolves `frame_json.kip.agent_id` ? `kip_agents.name` via shared `useFrameLeadAgentIdentity` when the active dialog agent is the domain lead (Realm board + Guided Arrival).

### 2026-07-01 � Phase 4A: Realm Board (`?board=realm`)
- **`REALM_BOARD_DEF`** � fifth Universal Board: `contentGated` nav, `chatter` + `connections` blocks, Cover-first Chronicle, solo dialog, `agentFromFrame`
- **`realm/RealmBoard.tsx`** � thin wrapper; registered in `boardRegistry.ts`, `workspaceBoardNav.ts`, `useBoardDefs`, `KeeperTopBar`
- **`UniversalNavPanel`** � Chatter (unassigned dialogs), Connections API, workspace board links on Domain + Realm boards
- **`V0Shell`** � mounts `RealmBoard` for `?board=realm`; guests blocked via `isPrivate`
- Audiences: Interior (auth owner), Friends (same URL + audience filter), Public (guest story routes � not realm board)

### 2026-07-01 � Phase 1.3: Journey / Path / Moment engagement templates
- `UniversalNavPanel`: Journeys `+` ? `journey.create`; when a journey is selected, Path `+` ? `path.create`, Moment `+` ? `moment.create` (includes `pathId` when path is in selection)
- `JourneyFocusPresence` / `PathFocusPresence`: cover actions call `requestChronicleEngagement` (Chronicle Act shell, not inline duplicate)
- `ChronicleEngagementSurface`: selects created journey/path/moment after submit
- API: `POST /api/paths` accepts slug-style `journeyId` / `keeperId`; `POST /api/moments` accepts optional `pathId`

### 2026-06-30 � Phase 1.1: Domain switcher on all member boards
- **`domain/DomainSwitcherOverlay.tsx`** � Extracted switcher fetch/open/add/navigate logic from `DomainBoard`.
- **`UniversalBoard`** � `useDomainSwitcher(def.boardId)` wires top-bar domain click on IDE, Agent, Design, and Domain boards; navigates to same workspace after domain select/create.
- **`DomainBoard.tsx`** � Slim entry point only; switcher owned by UniversalBoard.

### 2026-06-30 � Nav content gating infrastructure (Realm prerequisite)
- `NavPanelDef`: optional `navMode` (`static` | `contentGated`, default `static`) and `navAlwaysShow` for exceptions.
- `navContentGating.ts` + unit tests � hide dialogs/journeys/keepers/drafts/agents/library when count is 0 under `contentGated`.
- `UniversalNavPanel`: applies gating in `renderNavBlock` before section render. Existing boards unchanged.

### 2026-06-28 � Composer instrument pin does not open Chronicle
- Director mode (IDE + Domain): pinning an agent in composer sets `activeBoardInstrument` for delegation only � Dialog stays in focus; Chronicle unchanged. Configure agents via Agent board Nav.

### 2026-06-28 � Agents nav refreshes after Chronicle Config save
- `UniversalBoardContext`: `bumpAgentNav(patch?)` + `agentNavRevision` / `agentNavRowPatch` (same pattern as Keys/Keepers).
- `UniversalNavPanel`: refetches agents on revision; optimistic name/model patch until refetch completes.
- `KeeperPresence`: agent Config save calls `bumpAgentNav` when `name` or `model` changes.

### 2026-06-28 � Domain dialog no longer wiped by draft URL
- **useSelectionSessionResume:** Domain Board `?draftId=` / draft nav drives Chronicle only � center Dialog keeps its Kip session (fixes empty �Say hello to Kip� after Opening Moment Spec selection).
- **UniversalBoardContext:** `onDialogSelect` (and Journey/Keeper/Moment/Agent) clears `?draftId=` from the URL so Dialog nav clicks are not immediately undone by URL sync.
- **useSelectionSessionResume `openIdle`:** refetches the active session instead of wiping messages when a session id still exists.
- **UniversalConversation:** refetches messages when session is set but transcript is empty (recovery after stale wipe).
- **IDE draft resume:** links active session to draft when none is linked yet; avoids resetting to idle greeting.
- **UniversalConversation:** IDE session bootstrap skips when a session is already active.

### 2026-06-26 � Message-frame draft open pipeline
- **UniversalBoardContext:** `?draftId=` URL syncs to `selectedDraftId`; `onDraftSelect` writes `draftId` + `board=domain` to the query string so Chronicle opens the draft from message receipts and shared links. Dialog/Journey/Keeper nav clears `?draftId=` so center Dialog resume is not blocked.
- **LinkedCard / DialogueMessageList:** in-board draft/journey/moment cards call board selection callbacks instead of legacy `/agent?view=drafts` routes.

### 2026-06-22 � Panel error boundaries + composer draft autosave
- **UniversalBoard:** wraps Nav, Dialog, and Chronicle in `PanelErrorBoundary` � one panel crash no longer takes down the full board.
- **Composer autosave:** unsent dialog text persists in `sessionStorage` via `useComposerDraftAutosave` (see hooks README).

### 2026-06-22 � IDE session resume + draft Dialog link
- **UniversalConversation:** IDE and Designer session bootstrap use `resumeOrCreateBoardSession` (board-scoped `/kip/dialogs/resolve/active`) instead of agent-wide `getSessionsByAgentId`.
- Reuses empty Dialog sessions on mount instead of creating a new ghost session each refresh.
- Pairs with API auto-link of `kip_drafts.dialog_id` from the active session so Chronicle Sessions blocks populate.

### 2026-06-19 � Board-only engagement (Singular UI)
- `engagement/` module: `useBoardEngagement`, `BoardEngagementForm`, `PresenceEngagementActions`, `JourneyChronicleEngagement`
- `UniversalNavPanel`: JOURNEYS `+` ? `journey.create` template
- `KeeperPresence`: journey Chronicle ? add moment / path / moment create; moment Chronicle ? `MomentFocusPresence` (cover + Config edit)
- `UniversalBoardContext`: `bumpJourneyNav` refreshes nav after engagement

### 2026-06-19 � Draft EntityKind Phase 1b
- `bumpDraftNav` gains `requestDiscussDraftPoint` / `clearDraftDiscussAnchor` for Dialog anchor context
- Domain board `onAfterAgentRun` wired for draft receipts + anchor clear

### 2026-06-19 � Draft EntityKind (Phase 1)
- `bumpDraftNav` + `draftNavRevision` / `draftNavRowPatch` on board context
- `UniversalNavPanel` Drafts `+` ? `requestChronicleEngagement('draft.create')`
- `ChronicleEngagementSurface` routes success by template slug (draft vs journey/path/moment)
- `onDraftListRefresh` ? `bumpDraftNav` (replaces local list bump)

### 2026-06-20 � Director continuity ("try again")
- `@keeper/shared/directorContinuity` resolves retry/refer-back phrases to the last delegatable user message
- `useAgentDialog` sends `taskMessage` on director delegation; API re-resolves from session if omitted
- Kip synthesis prompts forbid claiming the session starts cold

### 2026-06-18 � Block delegation failure placeholder in UI
- `isDirectorDelegationFailureContent` � never render "did not respond this turn" in DialogueMessageList
- API auto-creates Cloud/Rendr agent records when missing (production seed gap)

### 2026-06-17 � Director UX polish (no failure placeholder, Horizon timing)
- Failed Cloud/Rendr delegation: no "did not respond" beat in bubble � Kip answers directly with stronger fallback prompt
- Horizon stays on **Cloud is thinking�** for full API wait (instrument phase until response)
- API: instrument environment resolves with IDE board capability ceiling for infra reads

### 2026-06-17 � Server-side director delegation
- Cloud/Rendr sub-runs move to API (`directorDelegation` on Kip run) � fixes failed client delegation and synthesis prompt in user bubble
- Web: single Kip `runAgent` with user `content` + `directorDelegation`; delegation beat from response

### 2026-06-17 � Director dialog: hide orchestration prompts from user bubble
- `sanitizeUserMessageContent`: session rows saved as synthesis input show the user's words, not `[Director synthesis � Kip]`
- `buildInstrumentUnavailableDelegationBeat`: Cloud/Rendr beat in Kip bubble when sub-run fails (structure preserved)
- `useAgentDialog`: passes `userId` to Cloud runAgent; patches last user message after fetch

### 2026-06-17 � Director fallback when Cloud sub-run fails
- `resolveDirectorInstrument`: pinned chip or `Cloud �` / `Rendr �` prefix in message
- `buildDirectorFallbackSynthesisPrompt`: Kip still in director mode when instrument reply empty � no "you're talking to Kip" / "hand off to Cloud"

## ?? Update Log

### 2026-07-19 — Realm Chronicle Dialog scope
- `UniversalNavPanel` passes `selectedDialogId` / `onDialogSelect` into `RealmStagedNav` so Dialog headers can scope Chronicle
- `UniversalViewPanel` keeps Realm Chronicle on `DomainRealmStory` for dialog / draft / moment / library subjects (Document scope, not entity Focus)
### 2026-07-03 � Per-domain workspace board sets
- **`domainWorkspaceBoards.ts`** � platform slug `default` (KE3P): Realm � Domain � IDE � Design � Agent; all other domains: Realm � Domain � Agent only.
- Top bar, sidebar Boards section, and `V0Shell` redirect deep links that request IDE/Design on member domains.

### 2026-07-03 � Collaborative agent surfacing (Domain + IDE label)
- **Domain board:** Domain lead agent on composer toolbar (� dismisses to Agents bar); Kip on footer as always-invoked director collaborator; lead pinned for delegation by default.
- **IDE board:** Composer footer eyebrow **Agents** (was Tools) for Cloud/Rendr � matches Domain vocabulary.
- **Realm board:** unchanged � solo Kip dialog; domain lead not shown (cover-first realm surface).

### 2026-06-28 � Domain-accessible agents on Agent board Nav (not IDE Nav)
- **Agent board** Nav lists domain-accessible roster from `GET /api/domains/:id/kip/agents`: domain lead (when set) ? Kip ? Cloud ? Rendr � each configurable in Chronicle.
- **IDE board** keeps Cloud/Rendr in composer **Agents** bar only; no Agents section in left Nav.
- API `loadDomainAccessibleAgents` merges global platform agents (`cloud`, `rendr`) into every domain roster.

### 2026-06-28 � Domain board director mode + domain agent roster
- `DOMAIN_BOARD_DEF`: `dialogOrchestration: "director"` � Kip owns composer; domain lead (e.g. Ceox) pin-able like Cloud/Rendr on IDE.
- `UniversalConversation`: loads `GET /api/domains/:id/kip/agents`; `BoardInstrumentsBar` in composer footer on Domain board.
- `BoardInstrumentSlug` generalized to `string`; director delegation supports any registered agent slug (API + web).
- Kip environment includes `domainAgents` roster so Lead knows domain lead agents exist.

### 2026-06-17 � Director dialog fixes (delegation beat, Horizon phases, focus)
- `directorDialog.ts`: stronger delegation/synthesis prompts (no "you're talking to Kip" correction); robust `extractAgentReplyFromRunResult`
- `useAgentDialog`: `directorConfigRef` + single post-run merge for `delegation` / `actionResults`; `onDirectorPhaseChange` for Horizon
- `UniversalConversation` ? `KeeperDialogFrame`: `thinkingStatusLabel` shows Cloud then Kip while sending
- `DialogueMessageList`: scroll opacity anchors on bottommost (newest) message, not topmost

### 2026-06-17 � IDE director dialog orchestration
- `UniversalBoardDefinition`: IDE preset uses `dialogOrchestration: "director"`; Agent preset stays `solo`
- `directorDialog.ts`: delegation + synthesis prompts, `DirectorDialogConfig`, `extractAgentReplyFromRunResult`
- `UniversalConversation`: Kip always owns composer on IDE; Cloud/Rendr chips pin `activeBoardInstrument` for delegation only (no agent swap, no Chronicle navigation)
- `useAgentDialog`: when instrument pinned, runs instrument ? Kip synthesis; attaches `delegation` beat on last agent message
- `DialogueMessageList`: renders instrument delegation above Lead content (echo stays below)
- `IntegratedServicesBar`: pin/unpin copy for director delegation

### 2026-06-15 � Library Pass 1 polish (nav labels, hero image, config save)
- `libraryNavUtils`: filename extraction via URL pathname; skip placeholder `display_label` values (e.g. source icon letter); `resolveLibraryHeroAvatar()` for image uploads
- `UniversalNavPanel`: removed source-type icon letter badges from Library nav rows; consolidated Add URL into card list; filter invalid rows
- `EntityCoverPresence`: render hero `avatar` as image when value is a URL/data URI
- `LibraryItemFocusPresence`: stable Manage ? config handler; full-height config shell with save bar

### 2026-06-14 � Library EntityKind nav (Domain board, Pass 1)
- `UniversalBoardDefinition`: `library` nav section on Domain board (`navBlockOrder` includes `library`)
- `UniversalBoardContext`: `selectedLibraryItemId`, `onLibraryItemSelect`, `bumpLibraryNav` + optimistic row patch
- `UniversalNavPanel`: Library section with upload (+) and Add URL; labels via shared `libraryItemChronicleTitle()`
- `UniversalViewPanel`: `library` trail kind routing

### 2026-06-27 � Agent Board: domain-scoped nav + AI Access summary
- Agent nav uses `GET /api/domains/:domainId/kip/agents` (Kip + domain lead only).
- **AI Access** nav (`DomainAiAccessNav`): included vs yours whisper � not IDE key registry.
- Key cover shows **Access: Included / Yours** � never raw `PLATFORM` source.

### 2026-06-27 � Agent Board: domain-scoped nav
- Agent nav uses `GET /api/domains/:domainId/kip/agents` (Kip + domain lead only).
- Removed platform Keys / AI Providers from Agent Board def � IDE Board only.

### 2026-06-14 � Nav cleanup (Domain � IDE � Agent boards)
- Shared nav section titles: larger accent-weight headers in `index.css` (`.keeper-nav-section-title` + SidebarCard titles)
- `SidebarCard`: optional `collapsible` / `defaultCollapsed` for nav section collapse
- **Domain Board**: nav order Keeper ? Dialogs ? Journeys ? Boards; Boards section switches workspace via `switchWorkspace` (syncs with top bar)
- **IDE Board**: removed Dialogs, Journeys, Keepers from nav; Capabilities kind groups collapsed by default; Keys / AI Providers collapse when ?4 items
- **Agent Board**: removed Journeys, Keepers, Drafts; added Keys + AI Providers (same sources as IDE)

### 2026-06-13 � Capabilities nav (IDE board, Pass 1)
- `UniversalNavPanel`: Capabilities section grouped by kind (Infra / Tool / Permission / Action); labels via `capabilityChronicleTitle()`
- `UniversalBoardContext`: `selectedCapabilityId`, `onCapabilitySelect`, `bumpCapabilityNav` optimistic patch + revision

### 2026-06-13 � Keys nav label aligned with Chronicle
- `keyNavUtils.ts`: `keyChronicleTitle()` shared with cover; `pickKeyRowForProvider` / `collapseKeyNavRows` prefer `selectedKeyId` over env-first collapse
- `UniversalNavPanel`: Keys nav uses `keyChronicleTitle`; stores all rows and re-collapses when selection changes; refetches on `keyNavRevision`
- `UniversalBoardContext`: `bumpKeyNav(patch?)` bumps revision + optional optimistic row patch after Key Config save

### 2026-06-12 � Optimistic board definition + router/window desync fix
- V0Shell holds `pendingBoardDefinitionId` � UI updates immediately on nav click before router catches up
- When `window.location.search` and React Router `location.search` disagree on `?definition=`, trust window
- `[BoardDefinitionNav]` log on select + mismatch warning; nav log includes `windowDefinition`
- All reads via `useBoardDefinitionFromUrl()` ? V0Shell effective `boardDefinitionId`

### 2026-06-12 � useBoardDefinitionFromUrl: live URL reads + navigate writes
- Added `useBoardDefinitionFromUrl.ts` � reads `?definition=` from `useLocation().search` on every navigation
- Nav, Conversation, Chronicle, and `UniversalBoardContext` use the hook for reads (not V0Shell context)
- `selectBoardDefinition` uses `navigate()` instead of `setSearchParams` updater (fixes stale second-click)
- Auto-default `?definition=ide` when opening Design workspace without a definition
- Nav diagnostic log moved to `useEffect` � logs on definition change only, not every render

### 2026-06-12 � Single source for ?definition= (V0Shell boardDefinitionId)
- `UniversalNavPanel`, `UniversalConversation`, and `UniversalViewPanel` read `boardDefinitionId` from `useV0Shell()` � not `useSearchParams()`
- V0Shell parses `location.search` each render; avoids stale Design nav highlight / composer focus after definition switches
- Removed redundant `key` on inner `UniversalBoardProvider` (outer `V0Shell` key on `boardId` is sufficient)

### 2026-06-12 � Design board composer: board definition focus (not frame)
- Removed stale `selectedFrameKey = null` stub � composer and session bootstrap now use `?definition=` / `designerFocusKey`
- Designer sessions resolve/create with `dialogSubject: "boardDef"` and `dialogFrame` = board def id

### 2026-06-12 � UniversalNavPanel render diagnostic for Thinking Space Diag
- `UniversalNavPanel` logs `[UniversalNavPanel]` with `boardDefinitionId` from V0Shell on every render � consumed by Dialog Diag stream

### 2026-06-12 � Design board nav: setSearchParams updater + live searchParams reads
- Removed `workspaceEpoch` remount race (epoch bumped before URL propagated)
- Workspace/definition URL writes use `setSearchParams(prev => �)` � no stale `location.search` closures
- Sidebar/Chronicle/center read `parseBoardDefinitionId(searchParams)` each render
- `UniversalBoard` key tracks `boardId:definition` only; context mirrors URL on param change

### 2026-06-12 � Board definition highlight follows ?definition= on every URL change
- `readBoardDefinitionId` / `readWorkspaceBoardId` parse `location.search` (not memoized `searchParams` identity)
- Sidebar, Chronicle, and center banner re-derive selection from URL on each param change
- `UniversalBoard` key includes `boardDefinitionId` so definition-to-definition switches remount cleanly

### 2026-06-12 � Nav collapse chevron crash fix
- `UniversalNavPanel`: moved collapsed early-return after `useCallback`/`useMemo` for board definitions (Rules of Hooks violation crashed page on collapse)

### 2026-06-12 � URL-only board definition selection (desync fix)
- Sidebar, Chronicle, and center banner read `boardDefinitionId` from V0Shell URL � not React context
- Removed context?URL sync effects that could leave IDE highlighted while `?definition=domain`
- V0Shell board nav uses `setSearchParams` only (same source as `matchedDef` routing)
- Every workspace/definition change bumps `workspaceEpoch` to force board remount

### 2026-06-12 � Workspace nav authority + ?definition= param
- `?board=` = workspace only (top bar); `?definition=` = Design board spec nav (replaces confusing `?boardDef=`)
- All workspace URL writes live in `V0Shell` (`switchWorkspace`, `selectBoardDefinition`, `clearBoardDefinition`)
- Top bar / Design nav / Chronicle trail call shell methods � no distributed `setSearchParams`
- `workspaceEpoch` remounts board if URL already matches (unsticks desynced UI)
- Legacy `?boardDef=` migrated to `?definition=` on Design workspace

### 2026-06-12 � Workspace board nav desync fix
- Added `workspaceBoardNav.ts` � single helper module for `?board=` / `?boardDef=` updates
- Top bar uses `navigate()` with preserved query params (replaces `setSearchParams` only)
- V0Shell strips stale `?boardDef=` when workspace board is not Design
- Design board syncs `?boardDef=` ? selection bidirectionally; non-Design clears stale selection in context
- Top bar `z-50` so Brief scrim does not block board tabs

### 2026-06-10 � Top bar workspace board switch fix
- Removed context?URL push for `boardDef` (re-added param after top bar cleared it, blocking IDE/Agent/Domain switches)
- Top bar uses `setSearchParams` for workspace board tabs; strips `boardDef` when leaving Design
- Trail back-nav on Design clears `boardDef` from URL explicitly

### 2026-06-10 � Design boardDef nav: context-first selection
- Board Definitions nav uses **spec/meta** pattern: `onBoardDefSelect` + `setSearchParams` (not `navigate()`)
- Context is source of truth; URL mirrors selection for deep links only (one-time on mount)
- Removed continuous URL?context sync that could re-lock selection after trail/clear
- `onBoardDefSelect` clears entity selections when a def is chosen

### 2026-06-10 � Board URL sync + boardDefs merge fix
- `resolveBoardDefs`: nav section flags are code-only (frame JSON could leak `boardDefs` onto IDE)
- `boardDefs: false` explicit on IDE/Agent/Domain defs; Chronicle `boardDef` kind gated to `designer` board only
- Top bar board switch preserves query params; clears `boardDef` when leaving Design
- Board Definitions nav navigates to `?board=designer&boardDef=<id>`; shell syncs URL ? selection
- `UniversalBoard` keyed by `boardId` in V0Shell

### 2026-06-10 � Board switch + Chronicle live selection
- `UniversalBoardProvider` keyed by `def.boardId` � selection and session reset when switching IDE / Agent / Design / Domain tabs
- Chronicle `PanelBody` driven by live context (see `panels/README.md`)

### 2026-05-28 � Domain board load: single domain fetch + deferred session
- **UniversalBoard:** `domainId` syncs from `V0Shell` `domainData` � removed duplicate `/api/domains/by-slug` fetch
- **useAgentDialog:** domain mode waits for resolved `domainId` before `createSession` � avoids double session + message reload

### 2026-05-27 � Draft update reliability (IDE + Agent)
- **UniversalConversation:** wired `onConfirmDraftUpdate` for `draft.update.propose` confirm cards; IDE mode handles `draft.update` receipts (Chronicle + draft list refresh)
- **Agent Board:** unchanged � already had confirm wiring via `AgentBoardFrame`

### 2026-05-26 � Agent Board draft visibility after agent actions
- **useAgentDialog:** attaches `actionResults` to agent/domain messages (action receipt cards in Dialog)
- **UniversalConversation:** on successful `draft.create`/`draft.update`, refreshes Drafts nav and opens draft in Chronicle; moment/journey receipts tappable on Agent Board
- **UniversalBoard:** internal `draftListVersion` / `journeyListVersion` bumps via `onDraftListRefresh` / `onJourneyListRefresh` center props

### 2026-05-26 � Agent Board: decouple Dialog from Chronicle nav
- **UniversalConversation:** `activeDialogAgentId` persists the center-panel agent when Chronicle shifts to keeper/journey/draft; session no longer reverts to Kip
- **useSelectionSessionResume:** skips session swap on Agent Board for keeper/journey/draft-only nav
- **Echo session:** dedicated `"Agent Board Echo"` session name � no longer hijacks the most recent Kip thread

### 2026-05-26 � UI polish + agent echo prompt + Chronicle lens editing
- **Dialog glass:** frosted center panel � atmosphere visible through Dialog (see `index.css`, `KeeperDialogFrame`)
- **Typography:** base `html` font-size 17px ? 19px; nav, banner, Chronicle field classes scaled in `.keeper-board-scope`
- **Chronicle:** Lens prompt editable textarea ? `PATCH /api/kip/lenses/:lensId`; composed prompt refresh after save
- **Agent echo:** supporting-role prompt frames exchange context explicitly (UniversalConversation)

### 2026-05-26 � Agent Echo rename (no behavior change)
- Renamed `leadAgentWhisper` ? `agentEcho` on board def; `kipLeadAgentId` ? `echoAgentId`; `kipEchoSessionId` ? `echoSessionId`
- Echo attribution fallback uses `def.conversation.agentName` via `echoAgentName` prop � not hardcoded "Kip"
- Comments updated to "agent echo" / "echo agent session"

### 2026-05-26 � Agent Board Phase 4: Agent Echo (Dialog Response)
- **Lens seed:** `Agent Board Lens` added; `## Echo Role (Agent Board)` section appended to Domain Lens and Agent Board Lens � editable via Chronicle after re-seed
- **Agent echo inference:** `UniversalConversation` fires second `KipApi.runAgent` on echo agent id + echo agent session after non-default agent replies when `agentEcho: true`
- **Agent echo rendering:** `AgentDialogueMessage.echo` attached beat beneath agent bubble in `DialogueMessageList` � empty agent echo renders nothing
- **Session split:** Primary agent session (e.g. Cloud) stays separate; agent echo stored in echo agent session history

### 2026-05-25 � Agent Board Phase 3: center dialog follows selected agent
- **Preflight:** Lens prompt PATCH validation errors surface inline in Chronicle (10-character minimum)
- **Board def:** `agentEcho: true` on `AGENT_BOARD_DEF.conversation`
- **Center dialog:** `UniversalConversation` resolves `agentSlug` / display name from selected nav agent when it differs from board default; Banner shows agent name, board name, and purpose prelude
- Session resume already keyed on `selectedAgentId`; `kipAgentId` from `useAgentDialog` now matches the resolved agent

### 2026-05-25 � Agent Board Phase 0�2 (Universal Board + Chronicle)
- **Phase 0:** `PATCH /api/agents/:id` for Chronicle saves; `context_scope` on GET; `AGENT_BOARD_DEF.nav.primarySection: "agents"` (agents first in nav)
- **Phase 1:** Composed system prompt preview in Chronicle (read-only; API `GET /api/agents/:id/composed-prompt`)
- **Phase 2:** Editable tagline + lens prompt in Chronicle; agent view state copy mentions composed prompt

### 2026-05-25 � Experience rename: `experienceContext` ? `agentContext`
- `UniversalConversation` Kip injection payload renamed; no behavior change.

### 2026-05-25 � Layer 3: Chronicle frame routing unwind (`UniversalBoardContext`)
- Removed `selectedFrameKey`, `activeBoardForFrames`, and `onFrameSelect` from selection state and actions
- `onBoardDefSelect` now only sets `selectedBoardDefId`; `clearSelection` no longer clears frame state

### 2026-05-24 � Board readability pass (contrast + larger type)
- Theme tokens: darker secondary/tertiary ink, stronger borders (styleRegistry + themeRegistry)
- Panel chrome: more opaque surfaces, clearer borders (nav + Chronicle)
- Chronicle/presence: +2px typography scale, story cards with stronger borders
- SidebarCard: larger titles and list items for nav scanning
- `index.css` `.keeper-board-scope`: dialog banner, Kip messages, composer zone readability

### 2026-05-24 � Universal Chronicle: single KeeperPresence path (Steps 1 + 4)
- Chronicle routes exclusively through KeeperPresence; no board-specific panel renderers
- `mergeViewStates()` � all boards declare every subject; viewStates are treatment copy only

### 2026-05-24 � KeeperPresence Phase 1: active journey in board context
- `UniversalBoardContext` exposes `activeJourneyId` (from FrameContext) and `onSetActiveJourney` for Chronicle Set as Active � components call board context, not FrameContext directly

### 2026-05-23 � Universal nav: one panel, one card, code defs win
- Deleted `UniversalSwitcherPanel` � no alternate nav component remains.
- All nav sections (Dialogs, Integrations, Frames, Board Definitions, etc.) render as `SidebarCard` � same chrome on every board.
- `resolveBoardDefs()` merges domain frame JSON with code defs; built-in boardIds always use `UniversalBoardDefinition.ts` as source of truth (fixes stale seeded defs).
- `DesignerDraftProvider` mounts only when the board def requires it (designer / frames / boardDefs).
- Removed `requiresDensity` from Design Board � no global density override special case.
- Frame catalog moved to `frameCatalog.ts` (not under `designer/`).

### 2026-05-23 � Gate 2 follow-up: Design Board nav shell parity
- Removed `nav.variant: 'switcher'` � Design Board now uses `UniversalNavPanel` like every other board.
- Frames + Board Definitions render as `BoardNavCard` (same Board Nav treatment as IDE Integrations / Agent Agents).
- Domain Nav sections (Dialogs, Journeys, Keepers) gated on `def.nav.sections.*` flags.

### 2026-05-23 � Gate 2: full Universal Board compliance
- **Dialog transport:** Design Board uses `useAgentDialog` + `KipApi.runAgent` (divergent `/kip/designer` path removed from hook).
- **Nav:** Domain Nav vs Board Nav layers � `BoardNavCard` + divider; IDE Integrations (Vercel, Railway, GitHub) in Board Nav; Instruments removed.
- **Composer Tools:** Cloud and Rendr invoke agents via `IntegratedServicesBar` Tools section (IDE Board only).
- `UniversalBoardDefinition`: `integrations` replaces `instruments`; `ConversationPanelDef.agentSlug` added.

### 2026-05-23 � Gate 1: selection drives both panels
- `UniversalBoardCenterProps` includes `selectedDialogId`; passed to `UniversalConversation`.
- `UniversalConversation` calls `useSelectionSessionResume` and builds Banner context from every Nav record type (Dialog, Journey, Keeper, Draft, Agent).

### 2026-05-10 � Level 2: UniversalConversation (single conversation render file)
- Created `UniversalConversation.tsx` � replaces IDEBoardConversation, AgentBoardConversation, DomainBoardConversation
  - `agentContext` computed once from `useV0Shell()`, not three times
  - Calls `useAgentDialog` with parameters from `def.conversation` (agentSlug, agentDisplayName, mode, dialogueMode)
  - Branches on `def.conversation.kipMode` only for banner props + three ide-mode callbacks (onAfterAgentRun, handleSaveTitle, onServiceOpen adapter)
  - Calls `useDraftContext` for ide and agent modes with agentId from useAgentDialog
  - Domain mode: renders `DomainBanner` above `KeeperDialogFrame` with fetched journeyCount/momentCount
  - `KeeperDialogFrame` rendered exactly once
- Updated `UniversalBoard.tsx`:
  - `center` prop is now optional � omit it to get UniversalConversation by default
  - `domainSlug` added to default UniversalViewPanel (enables domain feed in Chronicle idle state)
  - `selectedServiceSlug` added to `UniversalBoardCenterProps` (exposed from context for right panel branch)
  - `boardKind` ternary fixed for proper TypeScript narrowing
- `AgentBoard.tsx` ? `<UniversalBoard def={AGENT_BOARD_DEF} />` (3 lines)
- `DomainBoard.tsx` ? custom left panel + DomainSwitcher overlay only; center/right/state removed
- `IDEBoard.tsx` ? custom right panel only (5-state); left + center removed; all selection reads from centerProps
- Deleted: `IDEBoardConversation.tsx`, `IDEBoardNav.tsx`, `AgentBoardConversation.tsx`, `DomainBoardConversation.tsx`
### 2026-05-04 � Universal Board: Full Definition with Treatment
- Created `UniversalBoardDefinition.ts` � runtime board definition types and all four board defs
  - `UniversalBoardDef` interface � a new Board is a new object of this type, not a new component
  - `NavPanelDef`, `ConversationPanelDef`, `ContextPanelDef` � per-panel configuration
  - `ContextViewStateDef.presenceTreatment` � free-form treatment instructions to Rendr
  - `IDE_BOARD_DEF`, `AGENT_BOARD_DEF`, `DOMAIN_BOARD_DEF`, `DESIGNER_BOARD_DEF` � all four boards as defs
  - `BOARD_DEFINITIONS` registry � index by boardId
- Created `UniversalBoardContext.tsx` � unified selection state context
  - Mutually exclusive entity selections (Journey/Moment/Keeper/Draft/Agent/Service)
  - Session selection is independent � does not clear entity focus
  - Nav collapsed state owned at board level
  - `useUniversalBoard()` and `useUniversalBoardOptional()` hooks
- Created `UniversalBoard.tsx` � master orchestrator shell
  - Three panels: `UniversalNavPanel` (left) + `center` render prop + `UniversalContextPanel` (right)
  - domainId resolved once at board root � never delegated to panels
  - `rightOverride` prop for boards with transient right panel states (ServicesFrame, etc.)
  - `center` render prop delivers `UniversalBoardCenterProps` to the conversation component
- Created `panels/UniversalContextPanel.tsx` � right panel Living Multi-Context Surface
  - Treatment character: presence and intentional interaction
  - Five presence surfaces: DomainPresence, JourneyPresence, MomentPresence, KeeperPresence, DraftPresence
  - `PresenceTransition` layer � CSS-driven exit/enter sequence (140ms exit, 200ms enter)
  - Each surface fetches its own data � self-sufficient
- Updated `boardRegistry.ts` � added `def: UniversalBoardDef` field to each entry
### 2026-05-04 � Moment 2.2: UniversalNavPanel
- Created `UniversalNavPanel.tsx` � new file only, no existing files modified
- Single standard left nav panel component for all Boards rendering data records
- Replaces four divergent nav implementations (IDEBoardNav, AgentBoardNav, DomainBoard inline JSX, DesignBoardList) � wiring to Boards happens in Moments 2.6�2.9
- Layer 1: Dialogs, Journeys, Keepers, Drafts (conditional on boardContext)
- Layer 2: Board Instruments � IDE (Cloud, Rendr), Agent (fetched Agents), Designer (Rendr), Domain (none)
- All fetches keyed on `domainId` (never calls `/api/domains/by-slug`); all colors via `hsl(var(--theme-*))` only
- Response shapes confirmed from actual API routes and commented inline on every fetch

### 2026-05-04 � Moment 2.2: AgentBoard Reconciliation
- All 9 diagnostic gaps addressed. See `agent/README.md` for full change log.
- `AgentBoardIdlePanel.tsx` created in `agent/` directory.
- `AGENT_BOARD_SCHEMA` in `UniversalBoardSchema.ts` updated � right panel now has 3 named view states: `draft`, `agent`, `idle`.

### 2026-05-04 � Moment 2.1: Universal Board Schema
- Created `UniversalBoardSchema.ts` � new file only, no existing files modified
- Exports three interfaces: `UniversalBoardViewState`, `UniversalBoardDataFetch`, `UniversalBoardSchema`
- Exports four typed constants: `IDE_BOARD_SCHEMA`, `AGENT_BOARD_SCHEMA`, `DOMAIN_BOARD_SCHEMA`, `DESIGN_BOARD_SCHEMA`
- All constants populated from diagnostic-confirmed facts; unconfirmed values marked `// TODO: verify`
- Note: `boardRegistry.ts` confirms `isPrivate: true` for all boards; schema document's `isPrivate: false` for IDE/Agent/Domain diverges � flagged for Chuck to verify intent
- This is documentation-first wiring. Moment 2.2 begins Board reconciliation using this schema as the standard.
### 2026-03-31
- Domain Board (`domain/DomainBoard.tsx`): Brief mode center panel now renders `DomainBrief` (editable domain JSON form) instead of the placeholder; Kip composer unchanged.

### 2026-06-28
- `requestRewriteDraftPoint` + `draftComposeHint` � Chronicle **Rewrite** opens Dialog with prefilled `draft.point.rewrite` instructions; `draftDiscussIntent: rewrite` in agentContext.
- `UniversalConversation` forwards `activeDraftId` to Kip runs; prefills composer from `draftComposeHint`.

### 2026-03-11
- Created `boards/` directory and `boardRegistry.ts` (Step 3 of designer-to-board migration)
- Moved designer files from `frames/designer/` to `boards/designer/` (Step 2)

### 2026-07-17 � Curtain awaits Nav warm
- `prepareBoardNavData` / `isBoardNavWarm` in `boardNavDataCache` � await required nav slices under the load curtain.
- `prepareDomainBoardReveal` awaits board-def sections (not fire-and-forget) so Nav is not empty after reveal.

### 2026-07-17 � Warm Dark board shell restored
- `UniversalBoard` uses `themeApply="treatment"` for domain-resolved (no `?theme=`) so Dialog/Chronicle stay Warm Dark glass; domain accent still flows via `focus.ring`.

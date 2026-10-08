# Keeper Operational Truth

Version 0.3 • October 8 2026 • Decisions and evidence on top of the 0.2 audit
Status: Product intent approved by Chuck on 2026-10-08. Implementation is not an approved operational baseline. Not a public release. Not runtime-verified as a whole.

Version 0.2 remains the code audit against `be18e65deb6cc398c9f48615485020f862e78d79`. It is not superseded. Version 0.1’s product contracts, OT IDs, parked register, and source register stand. PK01–PK14 stay parked. No requirement is dropped.

## Decisions recorded 2026-10-08

These are product-intent approvals. They are not implementation evidence.

1. KE3P is the acceptance Domain. Frogmore remains the Living Discovery test case.
2. Domain Config stays in Board Chronicle for now. This is a provisional refinement of the Blueprint’s Config Frame requirement (S01). Discoverability and permissions still have to be checked. The Frame requirement is not dropped.
3. A durable written handoff is enough ownership for this slice. It names objective, owner, status, blocker, next action, and completion evidence. It is this file, which survives reload in the repository. It does not resume work by itself. No assignee model was added.
4. Ceox gets an Agency Core on the existing versioned structure. Advisory and challenge stay. Capabilities are the reads already allowed. Permissions were not widened for parity.
5. A Dialog named Keeper Operational Truth exists on KE3P, scoped to the Domain owner (`available_to: ["keeper"]`, dialog `cmv04yrn50001otb8mwjrj0as`). The full document stays in this file. It was not copied to Library, because a Library item has no private flag. Proposed Points were written and then removed: the access check against `dialogAudienceWhere` passed (owner sees it; a second user does not; a null user does not), but the running API’s catalog and `dialog.read` do not use that filter yet. Point bodies wait until that code is what the API is running. Accepting a Point does not verify a requirement.

## Handoff

- Objective: finish MVP continuity on KE3P without a new work system.
- Owner: Cursor implements. Chuck confirms meaning.
- Status: receipt seam is local commit `cf16e1e8f5806539aeaea2f7194295b98b837f84`. Ceox core and the claim diagnostic are local commit `abf1b7a4`. The catalog and `dialog.read` filter are the commit that contains this file. Not pushed. Not deployed.
- Blocker: production web and API SHAs are unknown. Local web (`localhost:5173`) and local API (`localhost:3001/health`) timed out, so Finding the Plot was not replayed. Authenticated claim needs Chuck’s session.
- Next action: replay Dialog → Stage → Dialog → Stage on a named commit, then claim one anonymous Moment while signed in.
- Completion evidence: reload of the same Place and Work, and a kept Moment whose anonymous key can no longer write it.

The SHA line above is completed in the evidence section. Do not treat a process start time as a commit.

## Evidence layers

“Partial” in the 0.2 register means the code contains some of the requirement. It does not mean the requirement is approved, committed, deployed, tested, or seen live. Read each row as seven separate facts. Blank means not done.

| ID | Contract and approval | Named commit | Uncommitted candidate | Deployment | Deterministic tests | Live and reload | Gap, owner, next |
|---|---|---|---|---|---|---|---|
| OT01 | Guest Cover and member Board stand. Config-as-Chronicle is a provisional refinement, not a dropped Frame. | `be18e65d` has Chronicle Config and no `?frame=config`. | None for this row. | Unknown SHA. `www.ke3p.com` returned the shell. | Board-default tests not re-run. | Visitor path not walked. Config discoverability not clicked. | Chuck can find Config from Domain focus Chronicle in a later signed-in check. Owner: Chuck for the visit, Cursor for the note. |
| OT02 | Public Moment draft, keep, feed. | Production API, unknown SHA. | Diagnostic body check is uncommitted. | API process id `3ab11ff3-8662-45f5-bb08-36aee80e9ce1`. SHA unknown. | Not a unit test. | Create, PATCH, keep, and feed succeeded for `cmv04wg0l0006mr01u06qrove`. Row deleted because it was unclaimed. Reload of a retained Moment was not left in place. | Signed-in claim. Owner: Chuck’s session. |
| OT03 | Anonymous key, then claim. Diagnostic must not require `ownerId`. | Production routes return `claim` at the top level and no `ownerId`. Diagnostic correction is `abf1b7a4`. | None after that commit. | Same unknown API SHA. The diagnostic is not deployed. | Shared claim-contract tests passed. | Unauthenticated claim of a fake token returned 401. Real token was not claimed. Feed contained the id before deletion. | Claim while signed in, then PATCH with the old key and expect 401 or 403. |
| OT04 | One auth surface is still the contract. | Legacy token names remain in `be18e65d`. | None. | Not checked as a login. | Not re-run. | Not a login. | Do not add a third path. |
| OT05 | Design stays `frame_json` until a route is decided. | `be18e65d`. | None. | Unknown. | Web DesignFrame tests did not run (`jsdom` missing). | Not opened. | No new Design route in this pass. |
| OT06 | Diagnostics stays a guest Frame. | `be18e65d` has the frame. | C1/C2 correction. | Unknown web SHA. | Not clicked. | Not clicked. | Run the frame after the claim session. |
| OT07 | Dialog \| Stage continuity. Do not redesign it. | `be18e65d` `workspaceSurface.ts`, `KeeperTopBar.tsx`. | None. | Unknown web SHA. | Web vitest could not load. Source was read. | Finding the Plot not replayed. Local servers timed out. | Replay on a running local web. Record that commit. |
| OT08 | Stage stays up across selection and reload. | Same as OT07. | None. | Unknown. | Source read. | Not replayed. | Same replay. |
| OT09–OT15 | Unchanged from the 0.2 audit. | `be18e65d` unless a row there says otherwise. | None in this pass. | Unknown. | Discovery gate 12 passed earlier. Frogmore 10:09 was not replayed. | Not driven. | Do not invent the Frogmore turn. |
| OT16 | Receipts reach the Lead even when prose is empty. Proposals do not finish an investigation. | `cf16e1e8` (local, not pushed). See git log for the full SHA. | None for the seam itself. | Not deployed. | API director prompt test passed. Shared cast-room and artifact tests passed. Web selector checked with `tsx`, not vitest. | No live model turn. | Deploy is out of this pass. A live turn is still open. |
| OT17 | Ceox advises and challenges. Capabilities stay the reads. | `abf1b7a4` adds `CEOX_CORE`. | None after that commit. | Not deployed. Not written onto the production `kip_agents` row by this pass. | Agency-core tests passed, including the capability list. | Not loaded by a running server with this code. | Next server start that loads Ceox can persist the core. Do not add write tools. |
| OT18–OT25 | Unchanged from the 0.2 audit. | `be18e65d` plus `cf16e1e8` where the receipt seam touches the room. | None beyond that commit’s files. | Unknown. | Room tests are not a model replay. | Not driven. | No new work system. |
| OT26 | Present contract recovered, not extended. | `be18e65d` `PresentFrame.tsx`. | README contract note only. | Unknown web SHA. | Not a browser visit. | Not opened. | `?frame=present` and optional `journeyId` is the public read. No share or release control. |
| OT27 | Still not a completed public MVP. | — | — | — | Unit tests do not close this row. | The Moment proof above is one slice, then deleted. | Acceptance domain is KE3P. |
| OT28 | This file is the register. The Dialog is the private home. | The commit that adds this file also adds the catalog and `dialog.read` filter. | None after that commit. | Filter not deployed. Dialog list on the current API already hides keeper Dialogs from other users. Catalog and `dialog.read` on that API do not. | `dialogVisibility` tests passed. Prisma check: owner sees `cmv04yrn50001otb8mwjrj0as`; another user does not; null user does not. | Dialog row re-read after create. Eight proposed Points were inserted and then cleared (count 8 → 0). | Import Points only after the filter is the running API. |

## What changed after the 0.2 audit

Local commit `cf16e1e8` (not pushed) carries the Agency evaluation loop and the specialist receipt seam. Empty prose with receipts is still a contribution. “do not create” and “not to create” block create, update, and treatment proposals. A Point or Treatment proposal does not satisfy an investigation when no artifact was requested. `presented` is still always appended, labeled with the outcome.

`pnpm run smoke` was not run before `cf16e1e8`. That gap stays on the record.

Anonymous Moment `cmv04wg0l0006mr01u06qrove` was created, updated, kept, and seen on the KE3P kept feed, then deleted because `ownerId` was still null. Do not treat that id as a retained object.

Prepared for Chuck Livecchi. Cursor supplied the code and runtime evidence below. Chuck still confirms meaning.

## What this pass did

Read-only investigation plus unit tests already in the tree. No product redesign. No schema change. No Keeper import. No commit.

Verified means a named check was actually run or a named source file was read at this commit, and the limit is stated. A symbol in a prompt is not a model decision. A passing unit test is not a browser visit. A healthy API is not proof of the public Moment loop.

## Repository and runtime

| Fact | Evidence |
|---|---|
| Branch | `cloud`, tracking `origin/cloud` |
| HEAD | `be18e65deb6cc398c9f48615485020f862e78d79` — “yb” — 2026-10-07 21:31:18 -0400 (2026-10-08 01:31 UTC) |
| Remote | `origin/cloud` is the same SHA |
| Local work | Uncommitted. Agency evaluation, receipt classification, artifact prohibition, and Agency Core v2 text live only in the working tree. They are not HEAD and not a deploy. |
| Web production | `https://www.ke3p.com/` returned 200 from Vercel. HTML asset `index-DnW4ZOr-.js`. Last-Modified 2026-10-08 13:01 UTC. SHA not recoverable. |
| API host shell | `https://api.ke3p.com/health` is the same Vercel app (SPA `index.html`). `/health` is not rewritten to Railway. |
| API process | `https://api.ke3p.com/api/test` proxies to Railway and returned JSON from Express. Direct `https://keeper-platform-production.up.railway.app/health` was healthy. Service `keeper-platform`, deployment id `3ab11ff3-8662-45f5-bb08-36aee80e9ce1`, Node v20.20.2, production, uptime about 21h 4m at 2026-10-08 22:36 UTC, so the process started near 01:32 UTC. That is consistent with a deploy of this commit. It is not a git SHA. |
| Vercel project access | The Vercel tool returned Unauthorized. Web SHA is unknown. |
| Database | Prisma schema was read. Live migration status was not compared to production. |
| Browser flows | Finding the Plot, anonymous claim, and a first-time visitor were not driven in a browser. |
| Secrets | Not recorded. |

Uncommitted files that change the Agency claims in version 0.1 include `packages/shared/src/castRoom.ts`, `packages/shared/src/artifactAuthority.ts` (new), `packages/shared/src/agencyCore.ts`, `apps/web/src/v0/boards/castRoomTurn.ts`, `apps/web/src/hooks/useAgentDialog.ts`, `apps/api/src/api/kip/agents.ts`, `apps/api/src/services/kip/pointIntent.ts`, and `apps/api/src/scripts/replay-agency-loop.ts`. README copies moved with them. Treat HEAD as what a deploy of `origin/cloud` can contain. Treat the working tree as a candidate repair.

## Tests executed this pass

| Suite | Tree | Result | Limit |
|---|---|---|---|
| `packages/shared` `castRoom.test.ts`, `agencyCore.test.ts`, `artifactAuthority.test.ts`, `stageComposition.test.ts` | Working tree for cast room, agency core, and artifact authority. Stage composition file is unmodified vs HEAD. | 29 passed | Correlation and grammar rules. No model call. No browser. |
| `apps/api` `preserve-discovery-gate.test.ts` | Committed gate (file not in the local diff) | 12 passed | Gate logic. Not the Frogmore 10:09 turn. |
| `apps/web` `workspaceSurface.test.ts` | Not executed | Failed to load: `@testing-library/react` and `jsdom` are missing in this workspace | Surface rules were read from source instead. |

## Contradictions against version 0.1

### Stale reported implementation, now confirmed in HEAD

S12 said the multi-voice room appends `resolved` and `presented` with no evaluation loop, drops `refs` in `parseCastRoomEvents`, and does not use `CAST_ROOM_CONTRIBUTION_CAP` as a retry. That matches `git show HEAD` for `packages/shared/src/castRoom.ts` and `apps/web/src/v0/boards/castRoomTurn.ts`. HEAD `projectCastRoomTrail` concatenates prior `contributed`, `acted`, and `resolved` lines with the current turn and does not label them as history. HEAD specialist consultations store prose and status. They do not attach `actionResults`.

### Candidate repair, not a shipped repair

The working tree adds `continueOrPresent`, `aimIsSatisfied`, `contributionMatchesDirection`, labeled prior trail, direction refs, and a Lead evaluate pass inside `runProgressiveCastRoom`. `resolved` is appended only when that function says the aim is met. `presented` is still always appended, now labeled with the outcome (`completed`, `rejected`, `unfinished`, `blocked`). Unit tests for those rules passed. `useAgentDialog` still keeps progressive-room consultations only when `instrumentReply` is non-empty, and it still does not copy `room.consultations[].actionResults` into `castActionResults` before the Lead present pass. Receipts can reach the in-room evaluate call. They still do not join the Lead action list the single-voice path already forwards.

`packages/shared/src/artifactAuthority.ts` treats “do not create” and “not to create” as a prohibition and is consulted from the working-tree `agents.ts` before `draft.update.propose`, `draft.create`, and `treatment.propose`. That file is untracked. HEAD `detectPointIntent` has “do not create” and does not have the shared “not to create” helper. HEAD Kip/Cloud principles still tell the model to preserve unfinished work as a Draft.

`PLATFORM_AGENCY_CORES` still has only `kip`, `cloud`, and `rendr` on HEAD and in the working tree. Ceox remains a seeded agent without a platform core. Working-tree cores are version 2 and still accept a stored version 1.

### Product-decision conflicts (not code defects)

S01 names Domain Config as a discoverable Frame. `V0FrameKey` has no `config`. Domain Config is Chronicle presence (`DomainConfigPresence`). Member entry with no `?board=` defaults to `realm` via `resolveDefaultWorkspaceBoardId`. Authenticated work is the Universal Board. Guest `/d/:slug` still uses `?frame=` for Cover, Moment, Feed, and Diagnostics. Later singular-UI decisions and the Blueprint Frame list both remain in force until Chuck says how Config discovery applies to a first-time visitor.

S09’s four continuity corrections are largely present in committed `workspaceSurface.ts` and `KeeperTopBar.tsx` (one Dialog | Stage control; subject selection does not call `leave-stage`; no current mobile effect was found that closes Stage only because it is non-arrival). That is source presence. It is not the Finding the Plot replay.

### Environment blockers

Deployed web SHA is unknown. Deployed API SHA is unknown. Provider replay was not run. The Frogmore 10:09/10:10 transcript is not in this repository and was not reconstructed.

### Missing evidence

No row below is a completed public MVP. Passing the tests in this pass does not close OT27.

## Requirement register

Dates below are 2026-10-08. Environment for code verdicts is local HEAD `be18e65d` unless the row says working tree. Owner of the next action is Cursor unless the row needs a product decision from Chuck.

### OT01 — Public Domain route and required Frame navigation

Verdict: **Partial**. Guest `/d/:slug` loads `V0Shell` and defaults to Cover. `?frame=` switches registered frames (`frameRegistryMap.ts`, `V0FrameKey`). `loadDomainFrame` reads `Domain.frame_json`. `available_to` is enforced on Cover. Guests may open Moment, Feed, and Diagnostics. Guest Agent/Kip redirects to Cover with companion. Members with `?board=` use the Universal Board; default board id is `realm`. There is no `?frame=config`.

Data: `Domain.frame_json`. Actor: public read; Config edits stay permissioned. UI: guest URL; member board. Tests: board-default unit coverage was not re-run here. Runtime: `www.ke3p.com` returned the web shell. A visitor was not walked through Cover → Moment → Kip → Config → Diagnostics. Gap: Config is not a Frame route, and member discovery is the Board. Next: Chuck confirms that guest Frames plus Board Chronicle Config satisfy S01. Dependency: OT04, OT27.

### OT02 — Domain draft autosave, keep, and visible proof

Verdict: **Partial**. `POST/PATCH /api/v0/moments/drafts` and `POST /api/v0/moments/:id/keep` set `Moment.keptAt`. `MomentBody` debounces autosave at 800ms. `FeedFrame` lists `status=kept`. Kip `kip_drafts` are a second draft system and are not this public Moment pipeline.

Data: Prisma `Moment`. Actor: optional auth. UI: `?frame=moment`, `?frame=feed`. Tests: none found for `/api/v0/moments`. Runtime: not executed. Gap: no live keep-and-reload proof. Next: one anonymous keep on the chosen Domain, then reload Cover and Feed. Dependency: OT03, OT06.

### OT03 — Anonymous draft session and authenticated claim

Verdict: **Partial**. Create requires a domain and either a user or `x-anon-key`. Web stores `keeper_anon_moment_key:${domainSlug}`. Keep of an anonymous Moment returns `claim: { token, expiresAt }`. `POST /api/v0/moments/claim` requires auth and clears `anonKey` and the claim fields. The claim JSON returns id, title, body, status, timestamps, and domain. It does not return `ownerId`.

Confirmed defect: Diagnostics step C1 marks success only when `ownerId` is present (`diagnostics-frame.tsx`), so a successful claim is reported as “ownerId missing from response.” Tests: none. Runtime: not executed. Gap: that mismatch, then a real claim without a duplicate identity. Next: align C1 with the claim payload, then run the pipeline once. Dependency: OT04, OT06.

### OT04 — Singular authentication

Verdict: **Partial**. KAM login and register are the current form (`AuthForm`, `/login`, `/register`, invite accept). `authMiddleware` still accepts `keeper_session`, `keeper_token`, `token`, and `auth_token`. The web client also stores `keeper_auth_token`. Tests: KAM smoke exists; not re-run. Runtime: not a login. Gap: one session surface is not what the code does. Next: do not add a third path. A later auth pass can retire legacy cookie names after a compatibility check. Dependency: OT01, OT03.

### OT05 — v0 structure, themes, and Design Frame

Verdict: **Partial**. `DesignFrame` is a layout component, not a `V0FrameKey`. Themes and structural slices live in `Domain.frame_json`, `packages/shared/src/structure/frameJsonMap.ts`, and `?frame=theme`. Designer board previews frames. This is not Rendr’s Stage composition grammar. Tests: `DesignFrame.test.tsx` did not run (web test runner missing `jsdom`). Gap: Design Frame is not a routable first-class Frame, and Domain-wide theme enforcement is not proven. Next: name the existing `frame_json` path as the Design Frame start before any combined Stage solution. Dependency: OT12. Decision: Chuck, if “first-class” must mean its own route.

### OT06 — Copyable diagnostics and capture pipeline checks

Verdict: **Partial**. `?frame=diagnostics` is guest-reachable. `diagnostics-frame.tsx` builds a copyable report (auth, domain, network, errors) and runs create/update/keep plus anonymous keep and claim. Tests: none for that UI. Runtime: not clicked. Gap: C1 fails closed on `ownerId` (OT03). Next: fix that check and run it. Dependency: OT02, OT03.

### OT07 — One Board, stable Place and Work, Dialog and Stage modes

Verdict: **Partial**. `UniversalBoardContext.workspaceSurface` is the mode. `nextWorkspaceSurface` does not treat subject selection as `leave-stage`. `KeeperTopBar` exposes one Dialog | Stage control. Perform/Performance is not a peer nav item in current top bar code. In-canvas Workshop remains a return from full-room presentation, not a second Place.

Tests: `workspaceSurface.test.ts` was not executed here; the source was read. Runtime: Finding the Plot → Dialog → Stage → Dialog → Stage was not replayed. Gap: browser, mobile, deep link, and reload. Next: that replay on KE3P before any navigation redesign. Dependency: OT08, OT11.

### OT08 — Stage composes current work and survives mobile and selection

Verdict: **Partial**. No current effect was found that closes Stage only because it is non-arrival. `KeeperStageCanvas` composes from `selectedDialogId`. With no Dialog, `selectStageTruth` can show realm/domain “where we are” or a stored story. `stageArriving` stays true until someone leaves Stage, so arrival can remain the center when no Dialog is selected. Non-dialog work targets do not drive the center composition.

Runtime: not replayed on a phone or after reload. Gap: prove selected work stays in the center and in Chronicle, and that “where we are” appears only with nothing selected. Next: the same KE3P replay as OT07, including a selection made while already on Stage. Dependency: OT07, OT12.

### OT09 — Natural conversation and a singular Composer

Verdict: **Partial**. `AgentComposer` is the instrument. Default conversation profile is `conversation`. A toolbar can cycle Conversation / Cast / Agency. That cycle is not a gate in front of the textarea. “Natural speech” is not a separate mode in code. Runtime: a simple question was not sent. Gap: one live turn that stays conversation. Next: acceptance C in a later session. Dependency: OT10, OT19.

### OT10 — Lead or Human controls Frame promotion

Verdict: **Partial**. `applyDialogFrameAuthority` / `promotedDialogFrame` gate display. Director guidance and `humanRequestedFrame` are the authority paths that were found. Rendr composition is instructed not to emit `promote` on its own. Story packet text can still nudge `presentFrame`. Runtime: not promoted live. Gap: one turn where a human or Lead promotes, Rendr composes, the transcript remains, and the next send returns to conversation. Next: acceptance C. Dependency: OT09, OT12.

### OT11 — Story capture, identity, navigation refresh, Stage handoff

Verdict: **Partial**. Stories live in Domain settings (`keeperStory.ts`, `stories-routes.ts`, `activeStoryId`). `story.save` is an allowlisted action. `UniversalConversation` reloads stories after a `story.save` receipt. Add to Story and Take to Stage exist (`FramePerformanceView`, `StoryPresence`, `openStageRoom`). A separate filmstrip (`keeperStage.story`) still exists beside `settings.stories`.

Runtime: not reloaded in a browser. Gap: prove one capture keeps its reference and that Stories navigation shows it after save. Next: acceptance C’s Stage-insertion check, separate from Frame promotion. Dependency: OT07, OT08.

### OT12 — Sourced Rendr composition, validation, apply, and restore

Verdict: **Partial**. `composeStagePass` and `decideStageComposition` are in committed `packages/shared/src/stageComposition.ts`. This pass’s stage-composition tests passed: unsourced cites drop, unknown tokens keep the previous arrangement, restore clears stored truth, Kip authorization does not itself apply a composition. `stage.composition.propose` runs from the Lead turn when the client says the board is on Stage (`expressStageComposition.ts`). It is not a free Cast tool.

Runtime: “I do not know where I am…” was not spoken on Stage. Gap: a live proposal, reload, and restore. Next: acceptance G after OT07 holds. Dependency: OT08, OT10.

### OT13 — Living manuscript: proposal, acceptance, and Section placement

Verdict: **Partial**. Points default to `proposed` with `proposedBy`. Human Accept is `draft.point.accept` and the Point card. Open is a real section (`DOCUMENT_OPEN_SECTION`). Acceptance does not assign a Section. Status union includes `pending`. Chronicle maps Point status `pending` to an error tone and status `proposed` to a pending tone (`realmNavGrowth.ts`). Runtime: not accepted in the product. Gap: legibility of Open versus accepted-but-unplaced, and the pending tone. Next: do not migrate `pending`. Show acceptance and Section as separate in the next manuscript pass. Dependency: OT14, OT15.

### OT14 — Review and Reorganize, separate from writing intake

Verdict: **Partial**. `document.reorganize.propose` stores a proposal. Chronicle labels include Current, Proposed, Apply, New, Refined, Moved, Merged, Retire (`documentReorganize.ts`, `DocumentShell.tsx`). Bring in writing is `ingestExternalDocument` and creates accepted Points from markdown. It is not the reorganize action. Tests: not re-run. Runtime: not applied. Gap: one propose-and-apply on an existing Document. Next: after discovery provenance is trustworthy enough to read. Dependency: OT13.

### OT15 — Living Discovery keeps one new subject meaning

Verdict: **Partial**. `preserve-discovery@1` (`preserveDiscoveryTurn.ts`, `preserveDiscoveryGate.ts`) loads the Dialog document, proposes at most one Point, stamps Jev as the preserving agency, and refuses an exchange the manuscript already holds. Gate tests: 12 passed. The Frogmore failure (Soul Before Polish, Chronology Doesn’t Apply, Characters Not Singers, versus a process summary) was not replayed. The 10:09 turn is not in the repo and was not invented. Gap: that semantic replay, with receipts. Next: acceptance F when a session transcript is available. Dependency: OT13, OT16.

### OT16 — Discovery and executor provenance, visible receipts

Verdict: **Partial**. `ActionReceiptCard` shows type, status, and message. It has no actor or location fields. Single-voice consults in `useAgentDialog` annotate and forward `actionResults`. HEAD multi-voice `castRoomTurn` drops them. Working tree records `acted` events and can show receipts to the in-room evaluate pass, then still omits them from `castActionResults`. Gap: the Lead present pass and Chronicle must name who discovered, who executed, and what changed. Next: copy correlated specialist receipts into the Lead present path. Dependency: OT20.

### OT17 — Versioned Agency Core, identity, responsibility, parity

Verdict: **Partial**. `resolveAgencyCore` prefers `kip_agents.config.agency`, then `PLATFORM_AGENCY_CORES`. Keys: Kip, Cloud, Rendr. Ceox has no platform core. Working tree bumps the constant to v2 and still parses v1. A named capability is not an allowlist grant (`buildAllowedActions` remains authoritative). Tests: agency core file passed, including “stored v1 wins.” Runtime: cores were not read from production rows. Gap: Ceox parity is still open. Next: do not invent a fourth identity system. Decide whether Ceox gets a core of the same shape. Decision: Chuck. Dependency: OT19.

### OT18 — Catalog shelves: counts, paging, search, and body reads

Verdict: **Partial**. `catalog.read` with no shelf returns counts; with a shelf it pages titles and ids (`domainCatalog.ts`, limit default 12, max 20). Bodies stay on `dialog.read`, `draft.read`, `keeper.read`, `journey.read`, `moment.read`, `library.read`. Compact prompts dropped the old title dump. `peopleNotes` and `keeperStage` titles can still enter a fuller environment. A Domain larger than the old caps was not opened. Gap: live shelf beyond the first page, and a check that unauthorized rows are absent. Next: acceptance E on a crowded Domain. Dependency: OT17.

### OT19 — Objective continuity and bounded Cast direction

Verdict: **Partial**. HEAD is one specialist pass, then unconditional `resolved`. Working tree loops up to `CAST_ROOM_CONTRIBUTION_CAP` (2) and can direct again. Durable resumption across later human turns is not a stored assignment. Kip still directs with `engage` slug and aim. Gap: the loop is local-only, and unfinished work has no owner field (OT23). Next: land the working-tree loop only after OT20’s receipt seam is in the same change. Dependency: OT20, OT21, OT23.

### OT20 — Specialist receipts reach the Lead, correlated to the current aim

Verdict: **Partial**. Confirmed on HEAD: multi-voice path drops `actionResults`; `parseCastRoomEvents` drops `refs`. Working tree correlates a contribution to `directionId` on the same `humanTurnId` and unit-tests that rule (passed). The hook still does not forward those receipts into the Lead present `actionResults`. Gap: that one assignment in `useAgentDialog`. Next: the smallest code change in the existing room. Do not add a second orchestrator. Dependency: OT16, OT19.

### OT21 — Evaluate, retry, or stop before objective resolution

Verdict: **Partial**. Absent on HEAD (`resolved` is unconditional). Present as `continueOrPresent` / `aimIsSatisfied` in the working tree. Tests passed for retry after rejection and for refusing to treat a proposal as a completed aim. Not deployed. A model did not evaluate anything in this pass. Gap: production behavior, and honest stop when the cap is spent. Next: same change as OT20, then one live failure that stays unresolved. Dependency: OT22, OT24.

### OT22 — Prohibitions and real ACT, ADVANCE, and STOP

Verdict: **Partial**. HEAD `POINT_CONSTRAINT_PATTERNS` includes “do not create” and not the shared “not to create” path. HEAD Cloud principle says to ADVANCE with a Draft when a patch is unavailable. Working tree `humanProhibitsArtifacts` covers “not to create”, and `artifactSkipMessage` skips Point, Draft, and Treatment proposes. Tests passed. `agents.ts` wiring is uncommitted. A follow-up can still be a model decision if the skip is not on that turn. Gap: deployed enforcement, plus a live “So do it” that does not emit Slides, a Treatment, or SOLE. Next: keep the skip on the existing allowlist. Dependency: OT21, OT24.

### OT23 — Unfinished objective ownership and resumable handoff

Verdict: **Partial**. `kip_drafts` has `owner_id` and no assignee. ADVANCE names an owner in prompt text. `unfinished` is an assessment outcome in the working tree, not a Desk. Gap: resumption still depends on the next human sentence and the trail. Next: do not add a Desk. After OT21 can leave a turn unfinished, record the handoff in an existing Draft or Point only when the human asked. Dependency: OT19, OT13. Decision: Chuck, if a body-text handoff is enough for MVP.

### OT24 — Inspectable model routing, credentials, and fallback

Verdict: **Partial**. Per-agent `kip_agents.model` and `model_provider`. Seeds name Kip `gpt-4o` and Cloud/Rendr `claude-sonnet-4-6` (historical seed text, not a live row). Cast offers use `resolvePurposeOffering('cast_offer')`. Jev/preserve-discovery uses `TYPESAFE_DEFAULT_MODEL` (`jev-latest`). UI exists: Agent builder, Cockpit, Agent Config. Env names only: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TOGETHER_API_KEY`, `ELEVENLABS_API_KEY`, `TYPESAFE_API_KEY`. No secret values were read. Replay was not run. Gap: the effective production assignment is unread, and this pass did not open the Config screen. Next: read one Lead, one offer, and one Jev path from Config or the agent row without printing keys. Dependency: none for the audit. Blocks live OT19–OT22 replay.

### OT25 — Honest action status, deployment, and runtime evidence

Verdict: **Partial**. Working tree `classifyActionReceipt` separates proposed, persisted, executed, failed, and blocked. HEAD does not. Production API is up. Its git SHA was not on the safe status route. Web and API clocks differ (API process ~01:32 UTC, web HTML Last-Modified 13:01 UTC), so they may not be one revision. Gap: bind a browser result to a SHA before calling a flow deployed. Next: recover SHAs when Vercel access exists. Do not treat Railway “healthy” as MVP. Dependency: OT21, OT27.

### OT26 — Present: audience, access, destination, share, and release

Verdict: **Partial**. `?frame=present` and `PresentFrame` exist. Cast `presented` is a trace event. Document status `presented` is a lifecycle word. `publicStory` is placement. None of these is a share/release contract. No destination, permission, or publish workflow was found in the Present module. Gap: the whole product mode. Next: do not add Present to navigation. Specify the minimum release with Chuck after capture and Stage continuity have evidence. Dependency: OT01, OT07, OT11. Decision: Chuck.

### OT27 — End-to-end public performance and first-time onboarding

Verdict: **Unverified**. The code contains pieces of arrival, Moment draft, keep, claim, Feed, Diagnostics, Board, and Stage. This pass did not run the visitor loop. Unit tests do not close it. Gap: the Blueprint loop on one Domain. Next: after OT03’s diagnostic check is honest and OT07’s replay exists. Dependency: OT01–OT06, OT26.

### OT28 — Operational Truth inside Keeper, with revisions

Verdict: **Unverified** as integration. A suitable path exists and was not used. Full text can be a Library item. A Dialog `document_manuscript` can hold Points through Bring in writing (`ingestExternalDocument` → accepted Points, not a Library item) or through proposed Points. Neither path was called. This file is `docs/keeper-operational-truth.md` in the repo only.

Gap: Chuck chooses the audience and the home. Importing accepted Points would look like approval. Next: Library for the full 0.2 text, and a development Dialog only when Chuck wants OT rows as proposed Points. Do not add an operational-truth service. Dependency: Chuck’s decision. This pass does not publish.

## Parked register

PK01–PK14 from version 0.1 are unchanged. Nothing in this pass promotes them into the sprint.

## One repair sequence

1. Keep HEAD as the baseline. The uncommitted Agency diff is the candidate for OT16 and OT19–OT22, and it is not done until specialist receipts reach the Lead present pass.
2. Browser-prove OT07 and OT08 on KE3P with Finding the Plot, including selection while on Stage, reload, and a narrow mobile width. No new Board.
3. Make Diagnostics C1 agree with the claim response, then run the anonymous draft, autosave, keep, claim, and Feed check once.
4. Only then choose the minimum Present release (OT26) and run the visitor loop (OT27).
5. Import this guide after step 1’s evidence is in the text and Chuck names the Library or Dialog home.

Recommended single acceptance Domain: KE3P. It is the Domain named for the Stage replay. Using it for the public visitor loop avoids a second MVP. Frogmore stays the Living Discovery case, not a separate product program. Livecchi.biz and Sheyenne stay named contexts until Chuck picks a later audience.

## Decisions still Chuck’s

- Accept 0.2 as the code audit, not as the approved baseline.
- Confirm KE3P as the one acceptance Domain, or name another.
- Confirm guest Frames for Cover, Moment, and Diagnostics, with Domain Config remaining Chronicle on the Board.
- Confirm whether a body-text handoff is enough unfinished-work ownership for MVP.
- Confirm whether Ceox gets an Agency Core in the same shape as Kip, Cloud, and Rendr.
- Name the Keeper home for this guide, and who may read it.

## Baseline revision record

Version 0.1 — October 7 2026 — Consolidated supplied sources. No repository inspection.

Version 0.2 — October 8 2026 — Cursor code and runtime reconciliation at `be18e65d`. Verdicts above. Uncommitted Agency repair recorded separately from HEAD. Not deployed as this document. Not imported into Keeper. Not approved.

Next version — After Chuck’s semantic decisions and a replay that names commit, environment, actor, and reload. Do not call a later draft code-confirmed until that evidence exists.

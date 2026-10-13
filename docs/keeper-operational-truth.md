# Keeper Operational Truth

Version 0.3 • October 8 2026 • Decisions and evidence on top of the 0.2 audit
Status: Product intent approved by Chuck on 2026-10-08. Implementation is not an approved operational baseline. Not a public release. Not runtime-verified as a whole.

The October 10 exchange is recorded at the end of this file. It is evidence about a failed Document update. It does not replace this version, and it does not authorize deleting Points.

Version 0.2 remains the code audit against `be18e65deb6cc398c9f48615485020f862e78d79`. It is not superseded. Version 0.1’s product contracts, OT IDs, parked register, and source register stand. PK01–PK14 stay parked. No requirement is dropped.

## Decisions recorded 2026-10-08

These are product-intent approvals. They are not implementation evidence.

1. KE3P is the acceptance Domain. Frogmore remains the Living Discovery test case.
2. Domain Config stays in Board Chronicle for now. This is a provisional refinement of the Blueprint’s Config Frame requirement (S01). Discoverability and permissions still have to be checked. The Frame requirement is not dropped.
3. A durable written handoff is enough ownership for this slice. It names objective, owner, status, blocker, next action, and completion evidence. It is this file, which survives reload in the repository. It does not resume work by itself. No assignee model was added.
4. Ceox gets an Agency Core on the existing versioned structure. Advisory and challenge stay. Capabilities are the reads already allowed. Permissions were not widened for parity.
5. A Dialog named Keeper Operational Truth exists on KE3P, scoped to the Domain owner (`available_to: ["keeper"]`, dialog `cmv04yrn50001otb8mwjrj0as`). The full document stays in this file. It was not copied to Library, because a Library item has no private flag. Proposed Points were written and then removed: the access check against `dialogAudienceWhere` passed (owner sees it; a second user does not; a null user does not), but the running API’s catalog and `dialog.read` do not use that filter yet. Point bodies wait until that code is what the API is running. Accepting a Point does not verify a requirement.

## Decision recorded 2026-10-12

Explicitly approved by Chuck. This governs how existing implementation is reconciled. It does not replace version 0.3, OT01–OT28, or PK01–PK14. It does not approve the implementation as a baseline.

Build through an unfolding experience—and keep what emerges within reach.

- **Dialog:** we speak, discover, and create together—through talk and visual expression.
- **Story:** we shape what emerges into a coherent telling, connected to its sources.
- **Stage:** we experience and work with that telling in a composed, visual space.
- The same work stays connected and within reach throughout.
- **Slides** help express it. **Rendr** shapes how we experience it.

Not implied: every utterance becomes a Story, every reply becomes a Slide, or Stage requires a saved Story before any work can be explored. The human remains Author. Meaningful presentation stays under the human or the domain Lead.

### Definitions this decision clarifies

| Earlier wording | Where it stood | What this decision does |
|---|---|---|
| “Story in development” is the single filmstrip, stored at `keeperStage.story` | Glossary key distinctions, landed 2026-08-02. Repeated in `AGENTS.md`. | **Clarified.** That record is Stage’s current sequence. It is not the Story. “Filmstrip” may name the mechanism. It is not a product the human has to learn. |
| A Slide is only one cell of that filmstrip after Forward | Same glossary row | **Clarified.** A Slide is how work is expressed, in Dialog and on Stage. On a Dialog Frame the storage field is named `beats`. That field name is not a second product object and was not a rename approved before this decision. |
| “Only the cell is a Slide” | Working note “one Slide map,” later the same evening, marked not a contract | **Superseded as product language.** The note stays as implementation history. |
| The filmstrip is not a Story | October 11 2026 section on the 9:47 PM layout | **Stands.** Consistent with this decision. |
| A Story is ordered references in `settings.stories` (`story.save`) | OT11, Partial | **Stands.** This is the Story. Saving one remains explicit. |
| Lead or human controls Frame promotion | OT10, Partial | **Stands.** Rendr still does not decide that a reply becomes a Slide. |
| `stage.story.layout` replaces `keeperStage.story` and does not save a Story | Implementation. October 11 section records the 9:47 PM effect. | **The “no Story” part stands.** The full replace conflicts with “changing Stage content does not erase earlier created material.” Repair is proposed below. Not done. |

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

October 10 later did import writing into Dialog `cmv04yrn50001otb8mwjrj0as`. That import is the exchange below. It is not approval of the requirements, and it is not a reconciled baseline.

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

## Exchange evidence — October 10 2026

This section records one live Dialog turn. It is not a new Operational Truth version. The authoritative source for that turn is the attached file `Keeper_Operational_Truth_v0.5.md`. Its body declares Version 0.5 • October 10 2026 and includes Section 0’s capability index and the S20–S21 update. The blob is 96,210 characters. Files whose names said v-4 and v-5 declared Version 0.3 • October 8 2026 in the body. Version was read from the body.

No Points or Sections were deleted. A snapshot of the manuscript, the three prior versions, the turns, the Gloss, the 80,000-character extract, and the full blob is in `tmp/ot-exchange-snapshot-2026-10-10/`. That folder is local evidence. It is not a commit and not a deploy.

### What reached Cloud and Kip

Dialog `cmv04yrn50001otb8mwjrj0as`. Manuscript `ccdf4735-391a-4226-841d-60a5a1b48150`.

| When (UTC) | Message | Attachment | Body actually stored | Who could read it on that pass |
|---|---|---|---|---|
| 2026-10-10 21:32 | `ed1da98e-9d6d-4206-806b-c5462e1c610f` | `Keeper_Operational_Truth v-4.md` | Version 0.3 • October 8 2026. 71,384 characters. No Section 0. | Lead present pass, after the file was saved on the message. |
| 2026-10-10 23:52 | `6da6281f-a5c2-4f39-aa32-4114bb1b343c` | `Keeper_Operational_Truth v-5.md` | Same Version 0.3 body. 71,384 characters. Filename said v-5. | Lead present pass. Cloud was not engaged on this turn. |
| 2026-10-11 00:03 | `e6985829-d682-42c4-8edb-b65230f43a4b` | `Keeper_Operational_Truth_v0.5.md` | Blob is Version 0.5, 96,210 characters, with Section 0, S20, S21, and sections 17–19. The text saved for later turns is the first 80,000 characters and stops mid-sentence in Section 16 C: “Human or Lead”. | Kip’s later present pass received the attachment and saw Version 0.5. Cloud’s contribution ran before that save and read the already stored v-5 / Version 0.3 file. |

Cloud’s stored direction was: inspect `Keeper_Operational_Truth v-5.md`, recover the previous human prompt, and determine the update. Cloud’s stored contribution begins “Inspecting v-5.md” and reports the previous prompt from the session action log. Kip’s stored reply names the v0.5 body, Section 0, and S20–S21. Those are two different sources on one turn.

### Why the update appended another import

`landAttachedDocumentOnTurn` (`3489df44`) treats “the document was updated” as a request to call `ingestExternalDocument`. That function still does `points: [...existingPoints, ...ingestPoints]` (`5bdc36143`, ancestry `beb557f08`). It does not compare an incoming heading with an existing Point.

`uniqueIngestSectionTitle` (`5bdc36143`) checks only the original heading. When that heading exists it appends “ · brought in” once. A later import of the same heading finds the original still present, appends the same suffix again, and `createDocumentSection` mints a new id. The Document now has two Sections titled “1 Purpose and governing conclusion · brought in”, and the same collision through Section 16.

The v0.5 read also stops at `MAX_FILE_CHARS` (`1fb06fc8`, 80,000). `INGEST_MAX_POINTS` (80) was not what cut this file. The extract ended inside Section 16 C, so the import wrote 52 Points and never saw sections 17–19 or acceptance items D–G. Those headings are in the blob and absent from the stored extract.

The spoken reply starts “Brought … 52 points” because the landing notice is prepended from a local variable. The persisted `actionResults` on message `71602f3f-8651-4136-9d27-3f8a769bf7ce` are `dialog.read` and `gloss.append` only. `actionResults = execution.results` (`0881a4f96`) replaces the array that had just received the `document.ingest` receipt. The import is visible in the manuscript versions and the spoken notice. It is absent from the session action log.

Manuscript versions, each saved before the next write:

| Version row | Saved (UTC) | Points | Declared body |
|---|---|---|---|
| 1 | 2026-10-10 21:32 | 0 | Empty manuscript before the first import. |
| 2 | 2026-10-10 23:52 | 55 | One Version 0.3 copy. |
| 3 | 2026-10-11 00:03 | 110 | Two Version 0.3 copies. This is the 110 Cloud reported. |
| Current | after 00:03 | 162 | Those 110, plus 52 Points from the truncated Version 0.5 extract. |

### Point and Section inventory

162 Points. 55 Sections. 3 Points sit in Open (the title Point of each import). Every Point is `accepted`, `proposedBy` the ingest path, created in one of three timestamps.

| Points | Created (UTC) | Provenance | Declared version in the body |
|---|---|---|---|
| 1–55 | 2026-10-10 21:32:11.559Z | First import of the v-4 file | 0.3 |
| 56–110 | 2026-10-10 23:52:40.880Z | Second import of the v-5 file | 0.3 |
| 111–162 | 2026-10-11 00:03:25.942Z | Third import of the truncated v0.5 extract | 0.5 where the new text survived |

Body hashes: 55 bodies in Points 1–55 each have exactly one match in Points 56–110. 35 of those bodies also appear once in Points 111–162. 20 appear only in the first two copies. 17 bodies appear only in the third copy. The 17 are Points 111–122, 125, 138, 142, 151, and 162. Point 162, “C Conversation and directed presentation”, is 124 characters and is the cut sentence. Sections 17, 18, and 19, and acceptance D–G, are in the blob and have no third-copy Points.

Section membership follows the three arrivals. The first 19 Sections keep the original titles and hold Points 1–55. The next 19 are the same titles plus “ · brought in” and hold Points 56–110. “0 Current operational state and capability index” holds the nine Section 0 Points from the third import (112–120). A further run of “ · brought in” titles, with new ids, holds the rest of Points 111–162 through a four-Point Section 16. Open holds the three title Points.

Cloud’s 110 was the manuscript before this import. It is version row 3. It is not an inventory of Version 0.5, and it is not a list of what to delete.

Full ids, preludes, section ids, and hashes are in `tmp/ot-exchange-snapshot-2026-10-10/inventory.json` and `manuscript-spec.json`.

### Why dialog.read was not enough

`dialog.read` on the 00:03 reply succeeded. The stored receipt lists 162 Points, and each stored summary has an id and a prelude. `summarizeDraftPointsForAgent` puts 160 characters of the body in `preview` (`draftPoints.ts`).

The text handed back to the model is `formatReadActionResultsForFollowUp`. For `dialog.read` it prints the first 24 previews and omits id, prelude, and number (`2dbc8e8c9`). Points 25–162, including the entire Version 0.5 arrival, are outside that excerpt. The system Document block is a separate cap: `hosts.slice(0, 80)` (`9fc6c4cb8`), and the block the client sent was loaded before this import.

`dialog.read`’s `limit` pages the Dialog list. It does not page Points. There is no Point offset. `draft.read` returns the whole spec, then `summarizeDraftSpec` shows eight Points and the follow-up does not also dump the spec. A second `dialog.read` of the same id returns the same shape. The existing reads cannot put Points 111–162’s identities and bodies into the model’s excerpt. The Lead present pass can still see the attachment, cut at 80,000 characters. That is how the reply could name Version 0.5 and also say the excerpts lacked the new Points.

### Why the specialist lost the earlier objective

The room runs before the Lead saves the current message (`useAgentDialog.ts` calls `runProgressiveCastRoom` first). The specialist call (`e6057cb00`, assignment block added in `cf16e1e8`) does not receive `attachments`. Its session load is ephemeral: it may read older messages, and it does not write this turn. `buildDialogDocumentPrompt` therefore offers previously saved files. The newest of those was v-5 / Version 0.3.

Kip’s aim is the specialist’s assignment (`buildSpecialistAssignmentBlock`, `cf16e1e8`). The stored aim names v-5 and asks Cloud to recover the previous human prompt. The current sentence is quoted in `buildCastDelegationPrompt`. The previous sentence — the 23:52 instruction to read Version 0.5, compare, reconcile, and continue the receipt investigation — is not in that assignment. `projectCastRoomTrail` keeps prior `contributed`, `acted`, and `resolved` events and drops prior `spoke` (`e6057cb00`). The session action log skips `sender === 'user'` (`51e816be6`) and clips receipt labels to 72 characters. Cloud’s stored words say the recovery looked at that log.

The unfinished repository objective remains the one named on the 21:32 reply and restated at 23:52: Cloud locates the receipt and evaluation path for OT16 and OT19–OT22, and Cursor owns any repair and tests. This turn’s contribution did not return a commit, a path, or a receipt-seam finding.

### Gloss

`gloss.append` succeeded. Thread `917a6626-eb9f-4e39-a4a6-b6ba965ee715` is on carrier message `23cba57e-614c-4b6c-8136-6c0c6d910571`, anchored to Point 33 (`64b7e0c3-7607-45c4-a595-64c5c256b883`, “Active evidence and development records”, first import, Section 14). The Gloss names Version 0.5, the 162-count, the excerpt gap, the truncated Section 16 C, owners, and the still-open OT16 / OT19–OT22 repository check. It states that a Gloss receipt preserves the record and does not finish the investigation. That is a sufficient unfinished-work record for this turn. It does not contain Cloud’s repository findings, because that contribution did not return them.

### Layers

| Layer | What this pass can say |
|---|---|
| Product intent | One baseline, existing identities, historical evidence kept, no second home and no wholesale duplicate import. Chuck still confirms meaning. |
| Committed code | Causes above are in ancestors of local HEAD `f59cb73480e114478f3e5f92bc59964e0c021d51` (`anotherr v`, 2026-10-10 19:27 -0400). The append, the 80,000-character cap, the 24-preview excerpt, the 80-Point Document block, the specialist assignment, and the receipt overwrite are the commits named in this section. |
| Local changes | No product diff was required to observe this. Inspection scripts and the snapshot are untracked under `tmp/`. |
| Tests | No suite was run for this exchange. The counts come from the stored manuscript and the blob. |
| Deployment | The deployed web and API SHAs were not read. The turn’s behavior matches the committed seams above. That match is not a production SHA. |
| Live behavior | The rows cited above. 162 Points remain. Nothing was deleted. |
| Ownership | Kip carries Document reconciliation and the Gloss. Cloud still owes the read-only repository investigation. Cursor owes any repair of attachment delivery, ingest comparison, read excerpts, and aim continuity inside the existing structures. Chuck decides when a reconciled Document is accepted. |

### Smallest repairs, and the acceptance they have to meet

Stay inside attachment read, ingest, Document review, `dialog.read` / `draft.read`, and the Cast Room. Do not add a reconciliation service.

1. Give the direction pass and the specialist the current turn’s attachments, the same way the Lead present pass already calls `resolveFileAttachmentContext`. Both participants then read one extracted body, and the aim can name the file that is actually on the turn.
2. When a Document already holds this writing, compare heading and body with existing Points. Keep the existing ids. Send real differences through `document.reorganize.propose`. Stop the blind append, and stop minting another “ · brought in” Section when that title already exists. If the extract is shorter than the blob, say so on the receipt and do not treat the import as the whole source.
3. Keep the `document.ingest` receipt in `actionResults` when later actions run.
4. Teach the existing follow-up to print Point number, id, and prelude, and to accept a continuation for Points past the first page. `dialog.read` can grow an offset for Points. `draft.read` already has the spec; its summary can expose the same page instead of eight anonymous lines.
5. When the human says to use the previous prompt, put that previous human sentence in the specialist assignment. Keep the aim as the task. The prior sentence has to be recoverable as itself, not as a 72-character receipt label.

Acceptance for the next live turn, in order:

- Kip and Cloud both read Version 0.5 from the body of the same attachment, including Section 0 and S20–S21.
- An update compares that body with Points 1–162 and preserves those ids. It does not create a fourth copy.
- Kip’s aim to Cloud is the receipt-forwarding repository investigation named in the Gloss, and the previous instruction is still available in the specialist context.
- Cloud’s findings come back as receipts and are preserved on the Dialog.
- A later message and a reload retrieve the same source, the same Point ids, and the same unfinished Gloss.

### Repair in the working tree — October 10 2026

The five repairs above are written in this working tree. They are not committed and not deployed. The 162 Points were not deleted.

- The direction pass and the specialist receive this turn’s attachments.
- A Document that already has Points is compared. Matching headings keep the earliest id. Differences are a Review proposal. Nothing is appended. A cut extract is labeled as not the whole source.
- The ingest receipt stays when later actions run.
- `dialog.read` and the follow-up name number, id, and title, and name the next offset.
- A sentence that refers to the previous prompt puts that earlier human text in the assignment.

Unit tests for the compare, the previous sentence, the assignment, the receipt, the Document page, and the follow-up page passed in that session (46 tests). The API and shared packages typecheck. Those five repairs were committed as `97048fc41c7cc44bc7330e0b51fa3453898e4443` (`consol`, 2026-10-10 20:41 -0400). That commit was not a deployment. The OT16 / OT19–OT22 repository check stayed Cloud’s unfinished job.

### Cast execution gap — October 10 2026

Human turn `320e4056-fb0f-4338-8468-53d5c5a28212` on Dialog `cmv04yrn50001otb8mwjrj0as`, session `45dc89eb-d9e6-46cc-94ce-49924fee6d6c`. Stored user message `a18def78-fde7-4df8-8bc8-bf3cc6429850`. Stored reply `953a0ddd-4978-4c43-b2d0-2f687b2f98ff`. The room presented Agency unfinished. Cloud reported repository `Clivecchi/keeper-platform`, branch `cloud`, HEAD `97048fc41c7cc44bc7330e0b51fa3453898e4443`. That HEAD matches this repository’s commit `consol`. It is an inspected source report from the turn, not a new deployment SHA.

| Boundary | What the stored turn shows |
|---|---|
| Tool execution | `dialog.read` pages 111–150, 151–162, and Point 33 succeeded. Each stored point has number, id, prelude, and a 160-character preview. The body field is absent. Point 33’s Gloss thread `917a6626-eb9f-4e39-a4a6-b6ba965ee715` is on carrier message `23cba57e-614c-4b6c-8136-6c0c6d910571` and was not on the read. `github_repo_read` errors name missing paths `apps/api/src/lib/castRoom` and `apps/api/src/hooks` and list nearby entries. |
| Specialist-visible result | Cloud is a system agent. A successful `mcp.call` opens `buildMcpFollowUpInput`. That formatter used `data.result ?? data`. An error stores `{ tool }` and puts the nearby-path text on `message`, so the follow-up saw a bare tool object. `dialog.read` results were not in that follow-up. |
| Specialist continuation | The first prose is written before the tools return. The follow-up is the reasoning step, and it did not receive Document bodies or the error messages. Follow-up actions were not executed. |
| Contribution to the Lead | The contribution label is 180 characters. Classified receipt messages were clipped. The Lead receipt list printed status and message, not Point bodies. Kip’s reply correctly said the pages succeeded and the identities and bodies were not in the contribution. |
| Who spoke | `consultedSlugs` is the list of engagements. Both were `cloud` because the room cap is 2 and both directions chose Cloud. Ceox and Rendr were named in the human sentence and did not receive a turn. |
| Source | The attachment extract still stops in Section 16. This pass does not raise that cap. |

The attachment truncation, the 162 Points, and the duplicate copies were left as they are.

### Repair after that turn

Written in this working tree after inspecting the turn. Not deployed. Points were not deleted or reimported.

- A Document page now carries prelude, body, and an explicit cut. A one-Point read returns a longer extract. The follow-up and the Lead receipt list print number, id, prelude, and body.
- `dialog.read` loads Gloss from the existing carrier (`glossThreads` on the gloss-carrier message). Point 33’s thread is that route. A Point with no thread says none is stored.
- A missing-path `mcp.call` follow-up prints the Message, including nearby entries, and tells the specialist to read one of those paths.
- After system-agent actions finish, one reasoning step sees reads and tool errors together. Empty prose forwards that digest. One further action round runs, and those receipts are appended for the Lead.
- When the human names Cloud, Ceox, or Rendr, the room keeps a turn for each named voice before it repeats one. The cap stays at most 4. The receipt investigation remains the assignment text on that reasoning step.

A read-only replay of the stored Point 33 and the missing-path error through these formatters returned the Gloss thread, a cut body, the point id, and the nearby-path message, and did not return a bare tool object. That replay did not call a model, did not write the Dialog, and is not reload acceptance.

Passing tests in this session: cast-room naming, the missing-path formatter, paged bodies and Gloss lines, empty-prose forwarding, and the Lead receipt list. API typecheck passed. No live Cast turn was run on this repair. Deployment was not changed.

Still open after that repair: a live turn in which Cloud’s commit-specific receipt-path findings reach Kip, an identity-preserving work-record update lands with a receipt, and a later reload retrieves the same records. The Section 16 cut on the attachment remains.

### Live turn after `2b3c3fd1` — commit pin missed

The next Dialog turn did retrieve Point 33 (`64b7e0c3-7607-45c4-a595-64c5c256b883`) and Gloss thread `917a6626-eb9f-4e39-a4a6-b6ba965ee715`. Both texts were cut. Kip left the investigation unfinished. No records were changed. Ceox and Rendr still did not contribute: the human named them in one sentence, and the room only reserved a name that began a line. Cloud was directed twice.

`github_repo_read` resolved `ref` only through `git/ref/heads`. Passing `2b3c3fd18d70a2d455f8bae5d03e78d411e24b08` produced “GitHub branch not found.” That lookup fails for any SHA, including one that is already on the branch. Cloud’s branch read in that turn reported HEAD `97048fc41c7cc44bc7330e0b51fa3453898e4443`. Current `origin/cloud` is `ca08935838fca42bf3d4f4470d3ad6f749277bfc`, which contains `2b3c3fd1`. The `useAgentDialog.ts` body was cut in the specialist result (`… result truncated`) before the receipt path.

### Repair for the commit pin

In this working tree, not pushed and not deployed:

- A 7–40 hex `ref` is resolved as a commit (`/commits/{sha}`), not as a branch. A missing commit says so, and says a local-only commit is not on GitHub yet.
- A file read returns one window and `nextOffset`. The specialist is told to call the same path again with that offset.
- A name in the middle of a sentence (`Ceox:`, `Rendr:`) counts as a requested voice.

Tests covering the commit-not-found path, the file window, the continuation line, and an inline Ceox/Rendr name passed. No live turn was run on this repair. Push and deployment were not done. OT16 and OT19–OT22 stay unfinished until a live read can name the receipt path at a commit GitHub actually has, and a reload retrieves the same Gloss and work record.

### Live turn — branch read, same bytes as `2b3c3fd1`

The following Dialog turn asked Cloud to read `castRoomTurn.ts` and `agents.ts` at `2b3c3fd18d70a2d455f8bae5d03e78d411e24b08` and to follow `nextOffset`. Ceox and Rendr both contributed. Kip left the objective unfinished. No import, deletion, deployment, or Document write occurred.

Cloud requested `ref` `cloud`. The tool echoed that. There is no new “branch not found” error in this turn. File windows worked: both reads returned offset `6000`, `nextOffset` `12000`, and the continuation line. `castRoomTurn.ts` came back as blob `04e1cae8ca09cb2558b4d3cb884a6c46bf90fd78`, size 13,377. `agents.ts` came back as blob `3a3025ca7f4f8ff49eae9a3709f5b88cb1912b8b`, size 501,368.

Local git, which contains that commit, has those same two blobs at `2b3c3fd1` and at current `HEAD` `a7677a92ab446454eb6e1313c99353eace115772`. Parent `97048fc4` has different blobs (`76dddab9` and `e728e5c5`). For these two paths, the branch-tip bytes and the pinned-commit bytes are the same. That identity is a local blob comparison. The GitHub receipt itself does not name the SHA, because the call asked for the branch.

The `castRoomTurn.ts` window at offset 6000 is the receipt seam in that blob. An empty reply still counts when receipts exist. The contribution and each acted event reference the direction. Evaluate runs when there is substance, the contribution matches that direction, and the call did not fail, and the evaluation assignment includes `receipts`. The consultation row keeps `actionResults` and `directionId`.

The `agents.ts` window at offset 6000 is still the import block. In the same blob, later, a completed specialist action (success or error) builds one continuation, runs at most one follow-up action round, and uses the action digest when the prose is empty. The Lead present prompt lists a receipt-only voice as the contribution and prints the action receipts. `useAgentDialog.ts` blob `a4285bf4f9fa90083a44c193a55aa560d335aa10` is also unchanged from `2b3c3fd1` to `a7677a92`. The client puts room consultations, including `actionResults`, on the Lead run, and keeps a voice card when the reply is empty and receipts exist.

`origin/cloud` is now `a7677a92`, which contains the commit-SHA reader. This turn did not call it.

Still open: a GitHub read whose receipt names `2b3c3fd1`, the unread remainder of `agents.ts` on the tool path, prohibition and assent, a live receipt-only turn, an identity-preserving work-record update, and reload. OT16 and OT19–OT22 stay unfinished.

### Live turn — pinned ref succeeded

The next Dialog turn asked Cloud to read `apps/api/src/api/kip/action-allowlist.ts` with `ref` set to `2b3c3fd18d70a2d455f8bae5d03e78d411e24b08`, and not to send the branch name. Cloud, Ceox, and Rendr each contributed. Kip presented Agency unfinished. No import, deletion, or deployment.

Cloud quoted the tool JSON: `ref` `2b3c3fd18d70a2d455f8bae5d03e78d411e24b08`, `sha` `d549cc86d328e892bc1dac28ab285f20e452e1c8`, `path` `apps/api/src/api/kip/action-allowlist.ts`, 1157 bytes, not truncated. Local git at that commit has the same blob and the same size. The earlier “branch not found” blocker for a commit pin is closed for this reader.

The file is the allowlist GET route. It calls `resolveKipActionAllowlistStatusForSession`. That service is not the receipt path. This read does not prove receipt-only results reach Lead evaluation, prohibition or assent, a work-record update, or reload. OT16 and OT19–OT22 stay unfinished.

### Live turn — the reply was the wall

The following user turn asked for less text and a visible change, and named Rendr. Message `9b1ddece-a38f-475b-8c49-11bb42428b9d`. Rendr’s stored contribution describes a Chronicle palette Treatment. The lead message’s action results are five `github_repo_read` calls. No `treatment.propose` receipt is stored on that message. Cloud’s contribution is “Reading it now” for `ActionReceiptCard.tsx`, with no file write. Kip’s reply says this Lead turn cannot write the repository.

Rendr’s Dialog voice proposes Chronicle Treatment (`treatment.propose`); a human Apply is what changes the look. A separate composer turns resolved meaning into Frame beats. Neither path edits the transcript renderer. Cloud’s seeded authority includes `github.file.write`. Kip’s environment sets `canWriteProduction` false. This turn Cloud only read.

The expanded text was the transcript: full Cast bubbles, an open trace, and one receipt card per tool call. `ActionReceiptCard` prints a short status line. The working tree now leads with a short outcome, keeps Cast and technical receipts closed until opened, keeps proposal cards visible, shows one progress line while Agency works, and returns from Cast Review to the Dialog Frame. Not committed. Not deployed.

## October 11 2026 — experience continuity

This section records Chuck’s Operational Truth Dialog and the repair that followed. It is not a new Operational Truth version. OT01–OT28 stand. PK01–PK14 stay parked. No Point was deleted or reimported. OT16 and OT19–OT22 stay open until a live turn shows receipt-only results, prohibition, assent, and a reload of the same Gloss and work record.

Governing intent for this repair: build through an unfolding experience, and keep what emerges within reach. Rendr’s responsibility is experience across Dialog Frame, Chronicle, Cast Review, Story, Stage, and Gloss. A palette Treatment does not satisfy that. The execution path already in the code is a Frame on the Lead message (`framePerformance`), cues on that Frame, and Stage as a placement of the same telling.

### What the Dialog showed

| Observation | Cause found in the code |
|---|---|
| Replies included directory listings, file bodies, and tool JSON. | That text was stored in the reply. Folding Cast and Receipts did not move it. |
| A two-slide Frame could not be opened again from its turn. “Full reply” did nothing for the slides. | The surface only presents the latest turn. Later talk dismisses it. “Full reply” expands leftover prose. It is not the Frame. |
| Slide Gloss was unavailable. | The Frame rendered outside the Gloss provider, and the beat had no anchor. |
| Add to Story, Take to Stage, and On Stage did not say what each one does. | They were labels without a consequence. |
| The header showed Operational Truth while On Stage highlighted Finding the Plot. Adding Operational Truth showed a Dialog entry and no slides. | Header used the selected Dialog. On Stage highlight used a different presence. A selected Dialog painted a title with an empty body, so the Frame never reached the canvas. |
| Rendr failed with “offstage — Stage is not the room for this turn.” | Stage composition runs only on Stage. The Dialog path is the Frame. The offstage receipt was what the turn showed. |

### Decisions

- The spoken reply stays short. Directory listings, file bodies, and tool JSON stay under Evidence. They are not deleted, and they are not spread across slides.
- A person can still speak while a Frame is up. The composer stays at the bottom.
- A simple question stays a conversation. A Frame is stamped only when the Lead sets `presentFrame` or the human asks for a Frame. A successful tool call does not promote itself.
- Each promoted Frame stays on its message. The turn shows the title and the slide count. Opening it restores those slides. “Back to this turn” returns to that message.
- Add to Story keeps the slide in the named Story and says so. The message remains the source. Take to Stage presents those slides and places the Dialog on Stage.
- On Stage is the list of sources. The highlighted row is the Dialog in hand. The header names that Dialog, and the slide count and title of the Frame the canvas is showing.
- Gloss on a slide uses the existing message anchor `beat-{index}` and the slide’s own text. The thread is added. The slide source is not rewritten.
- Stage composition is not proposed while the room is Dialog. A composed Frame stores a one-line `frame.performance` receipt.
- “New surface” remains a later, calmer Stage-and-Composer experience. This repair does not add a replacement UI.

### The 163rd Point

Read on the evening of October 11, 2026 from manuscript draft `ccdf4735-391a-4226-841d-60a5a1b48150` on Dialog `cmv04yrn50001otb8mwjrj0as`. Count 163. Draft `updated_at` `2026-10-11T23:45:46.317Z`. Nothing was deleted.

The new Point is `63a70b4f-6745-446b-8006-b02480cd6817`. Status `proposed`. `proposedBy` `kip`. Created `2026-10-11T23:45:46.267Z`. Path group `0-current-operational-state-and--yx6zw`. Prelude “Landing Restores the Work, Not Proof of Continuity.” 1,655 characters. Its body matches no earlier Point.

It is not a fourth import. The Points still timestamped `2026-10-11T00:03:25.943Z` belong to the third import. That includes `3a56d68b-29ac-4df3-bde2-124db10affea`, “C Conversation and directed presentation,” 124 characters, the cut sentence, with no duplicate body. Other third-import bodies still match the first two copies. Those copies remain.

### What this repair changed

- `separateReplyEvidence` pulls listings, fenced bodies, and tool JSON into Evidence.
- `dialogTurnSurface` reopens a named message’s Frame and leaves a promoted Frame to the Stage canvas.
- The transcript control is the Frame title and slide count. “Back to this turn” scrolls to that message.
- The selected Dialog’s canvas shows its Frame. An empty Dialog says it has no slides.
- Take to Stage writes the live cell, brings that Dialog onto Stage, and selects it. `performedStagePresenceId` keeps the highlight on that Dialog.
- Cue lines state the consequence. Add to Story reports the Story title.
- The beat is a Gloss surface on `beat-{index}`.
- `shouldProposeStageComposition` skips the offstage call. A successful Frame appends `frame.performance`.

### Layers

| Layer | What this pass can say |
|---|---|
| Product intent | The decisions above. Chuck still confirms meaning. |
| Implementation | The files in this commit. Not a new Stage subsystem. |
| Tests | Shared `keeperStage` and `framePerformance` passed (33). API `expressStageComposition` passed (4), including the Dialog guard. Web unit config passed reply evidence, Dialog Frame reopen, and performed-Frame selection (13). Web vitest’s jsdom setup is still missing in this workspace; those tests used `vitest.unit.config.ts`. |
| Deployment | Not deployed. Not pushed by this pass. |
| Live behavior | `http://127.0.0.1:5173/d/ke3p?board=domain&dialogId=cmv04yrn50001otb8mwjrj0as` loaded the guest Cover. This browser was signed out, so the member Dialog, the two-slide reopen, Gloss, Story, and Stage were not walked. |
| Reload | Not accepted on a signed-in session. The Frame remains `framePerformance` on the message. The Stage cell remains a live source id. The 163rd Point was read back at the id above. |

### Still open

- Chuck’s signed-in replay: present two slides, keep talking, reopen them, review Cast and return, Gloss the slide, add it to a Story, take it to Stage, return to the turn, reload, and find the same slides.
- Chronicle orientation across manuscript, Sections, Points, and discussion.
- OT16 and OT19–OT22, including a live receipt-only turn and reload of the same Gloss.
- The Section 16 cut, and the duplicate copies from the three imports. Compare before any merge. Do not delete.
- The 163rd Point stays `proposed` until a person accepts it. Acceptance would not verify the landing claim in its body.

## October 11 2026 — the filmstrip is not a Story

About 9:47 PM, Chuck asked Operational Truth to make a story from the material already given. This section records that turn. It is not a new Operational Truth version. OT01–OT28 stand. PK01–PK14 stay parked. OT16 and OT19–OT22 stay open. Chronicle orientation, Slide Gloss on a live signed-in pass, and the duplicate imported Points stay open. Nothing was reimported or deleted.

### The turn

| | |
|---|---|
| Dialog | `cmv04yrn50001otb8mwjrj0as` |
| Human message | `34e3cd7a-c697-4840-8df5-ba259005ad6e` at `2026-10-12T01:47:05.343Z` |
| Lead message | `210571b1-3995-4a83-b82f-8f9d79057589` at `2026-10-12T01:47:16.435Z` |
| Actor | Kip, Lead, agent `385689a0-d5e5-47a7-bf97-08d6597e1a33`. No Cast voices are stored. Rendr did not compose this turn. |
| Action | `stage.story.layout`, status success. No `story.save`. No `framePerformance`. |

Kip’s reply names “From Unfinished to Worth Keeping” and includes a keeper-card whose body says the visual result is not yet verified. That title is prose. It is not a Story id.

### What was saved

`stage.story.layout` replaced `Domain.settings.keeperStage.story` on domain `9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9`. Five beats, no source ids:

| Id | Title |
|---|---|
| `slide-1` | Bring Something Unfinished |
| `slide-2` | Speak. Find the Thread. |
| `slide-3` | “So Do It” Must Mean Something |
| `slide-4` | Same Work. A New Expression. |
| `slide-5` | Worth Keeping Means Worth Returning To |

The receipt stored “Laid out 5 Slides on Stage.” with those titles and a rationale. It did not store a Story id. A successful layout writes the filmstrip. It does not verify the screen.

### Why Stage showed the reply

The selected Dialog covers the canvas. This message has no promoted Frame, so Stage held the reply text in one slide. That slide printed the Markdown and the keeper-card fence as characters. The five beats were already stored. The filmstrip navigation is hidden while a Dialog title is set, and the work canvas did not read `keeperStage.story`.

### Already in Progress… is a different record

Stories navigation lists the domain Story set. The active Story is `already-in-progress`, title “Already in Progress...”, status `staged`. Its material is two captures:

- `5d93b026-2b42-4e5d-b8ab-227d22d6d596`, “Kept, and Still Opening”, Dialog `cmuj4x5u70007nr0115wle41p`
- `dec7d504-33c7-455e-a8fd-985d60e63283`, “What the test shows — and what it doesn't”, this Dialog

Neither source is message `210571b1-3995-4a83-b82f-8f9d79057589`. This turn did not create or update that Story.

On Stage lists presences. It is not the Story and it is not the filmstrip.

### What this repair changes

- The receipt sentence for a new layout says the filmstrip was written, no Story was saved, and the screen is not verified. The card also lists the slide titles. The sentence already stored on `210571b1` is shown that way too.
- When those titles still match the filmstrip, Stage shows the five slides, with navigation, and Back to this turn. A later reply does not cover them. The turn keeps a “Stage filmstrip · 5 slides” control.
- If a later layout replaces the titles, the old control says the filmstrip is no longer current.
- A reply slide renders a keeper-card as a card.
- Stories navigation says a Stage filmstrip is not listed there. The header names the filmstrip and the Story that was not changed.

### Layers

| Layer | What this pass can say |
|---|---|
| Product intent | A layout is the Stage filmstrip. “From Unfinished to Worth Keeping” was not saved as a Story. |
| Implementation | The files in this commit. No new Story system. |
| Tests | API layout receipt message passed. Web unit tests for the handoff, Dialog surface, and performed Frame passed (16, plus the API file’s 2). |
| Deployment | Not deployed. Not pushed. |
| Live behavior | The stored slides and the Story row were read from the database. This browser session was not a signed-in walk of the five slides. |
| Reload | The five slide ids and the Lead message id are already stored. Matching titles is how this turn finds them again. A signed-in reload is still Chuck’s to accept. |

### Still open, including the earlier list

- Signed-in walk: open the 9:47 turn, open the filmstrip, see the five slides, move among them, return to the turn, talk again, reopen, reload, and find `slide-1` through `slide-5` and message `210571b1-3995-4a83-b82f-8f9d79057589`.
- Chronicle orientation, Slide Gloss on a live pass, OT16, OT19–OT22, the Section 16 cut, and the duplicate imported Points. Do not delete them.
- The 163rd Point `63a70b4f-6745-446b-8006-b02480cd6817` stays `proposed`.
- “New surface” remains a later Stage-and-Composer experience. This repair does not build it.

## October 12 2026 — the slides can be read

The five beats from the 9:47 turn are still `slide-1` through `slide-5` on `keeperStage.story`. This note is about reading them. It does not say those sentences are enough to express Operational Truth.

### What was disconnected

The Slide Reading existed. It kept the title and dropped the body. `projectStoryPass` set each item’s text to the title. The agent prompt listed titles and said to replace the sequence in order to lay it out. The compact environment omitted the body. `dialog.read` and `story.truth.read` do not return this filmstrip.

The composition path also existed. Rendr cites Reading ids and Keeper stores an arrangement. That write does not replace `story.slides`. It ran only when the room was already Stage, and the filmstrip canvas did not use that Reading. A Dialog ask to arrange these slides never reached Rendr. The earlier “offstage” receipt was that gate.

### What this repair changes

- A slide’s Reading text is the stored title and the stored body.
- The filmstrip prompt and the compact environment include that body and the id `slide:{id}`.
- When Kip authorizes a composition in Dialog, Rendr arranges this filmstrip. On Stage, Rendr still arranges the pass that is up.
- The save is `arrangements.story`. The five slides stay. A proposal that writes a new sentence onto a cite is stripped.
- The filmstrip canvas cites those Reading ids and still plays the original slides.
- The Lead is told that dress does not make a thin slide sufficient, and to say so when the sentences are not enough.

### Layers

| Layer | What this pass can say |
|---|---|
| Product intent | Rendr can read this sequence and arrange it. The arrangement is not a new telling, and it is not proof the slides express Operational Truth. |
| Implementation | Reading text, prompt, compact environment, Dialog authorization, filmstrip canvas cite. No new Story. No slide rewrite. |
| Tests | Shared story-pass test for the five titles and bodies. API composition test sends the body and saves an arrangement only. |
| Deployment | Not deployed. Not pushed. |
| Live behavior | Rendr was not called against the live domain in this pass. The next authorized turn can. |
| Reload | `slide-1` through `slide-5` are unchanged by this repair. |

### Still open

- Whether these five bodies are sufficient. Typography, dress, and a cite do not answer that.
- Signed-in walk of the filmstrip, Chronicle orientation, Slide Gloss, OT16, OT19–OT22, the Section 16 cut, and the duplicate imported Points.
- The 163rd Point `63a70b4f-6745-446b-8006-b02480cd6817` stays `proposed`.
- “New surface” remains later. This repair does not build it.

## October 12 2026 — proposal only, not a contract

The section “one Slide map” and a glossary edit made the same evening are not approval. The glossary edit was withdrawn. Slide, beat, filmstrip, and the two uses of “story” stay unresolved. OT01–OT28 and PK01–PK14 are unchanged. No product data was written. No code was changed in this pass. The five-slide read-and-cite repair remains bounded evidence.

Proposal, for Chuck to accept or refuse: what a person sees is a Slide. The code field `beats` is not a product rename. `keeperStage.story` is the sequence now on the Stage screen. `settings.stories` is a Story of references. `stage.story.layout` may change the screen and must point each cell at its turn. It must not be the only copy, and it must not create a Story by itself. Rendr arranges and phrases through the existing Frame and arrangement paths. Cursor keeps those paths fed with the turn’s own slides. No new Slide type.

The October 12 repair above is bounded evidence. The map that follows is a working note from that evening. It is not a contract.

## October 12 2026 — one Slide map

Working note only. Product language is the decision recorded above, approved by Chuck the same evening. Where this note says only a Stage cell is a Slide, or that the glossary already settled the words, those sentences are superseded.

Meaning emerges in Dialog, stays within reach, can be shaped into Story, and is experienced on Stage. Three records already do that. They do not share one Slide type. They have diverged in what a “slide” is allowed to be. No new Slide type is added here.

### Three records

| | Dialog Frame | Stage filmstrip | Story |
|---|---|---|---|
| Meaning | What emerged on a turn | How a sequence is experienced on the Stage screen | What is being kept, in order |
| Identity | `framePerformance` on the Lead message. `title` is the subject. `beats[]` are the telling. At most four. | `Domain.settings.keeperStage.story`. Cells are `StageStorySlide`. Cap 24. Root is the domain Cover (`domain_cover`). Later cells are `text_slide` beats. | `Domain.settings.stories`. A `KeeperStory` has material slots. A slot id is not the source id. Cap 24 stories, 24 slots. |
| Source | Lead `resolvedMeaning`, plus selected Cast lines. Rendr phrases beats. Keeper stamps `promote` only when the Lead set `presentFrame` or the human asked for a Frame. | Optional `source`: `live`, `point`, `moment`, `path`, `keeper`, `journey`. The five Operational Truth cells have no source. That is allowed by the parser. The glossary now calls the missing source unfinished provenance. | A capture’s `sourceId` is the Lead message. Moment, Point, and message slots point at those objects. The excerpt is display. The source stays the authority. |
| Persistence | Message metadata. Reload reads the same message. | `keeperStage.story`, replaced as a whole by Lead `stage.story.layout`. An arrangement lives beside it on `keeperStage.arrangements` and does not replace the cells. | `story.save`. It does not call `stage.story.layout`. |
| Rendering | Dialog Frame when promoted. On Stage, a later filmstrip match covers the reply. Reopen uses the message. | Filmstrip screen and its navigation when the stored titles match a layout receipt. Otherwise the Stage composition walker. | Chronicle `StoryPresence`. Stories navigation. A filmstrip is not listed there. |
| Composition | Rendr writes beats. Rendr does not set `promote`. | Lead writes cells. Rendr, when authorized, cites a Reading of those cells and stores an arrangement. Dress is not new sentences. | The human or Lead orders references. Rendr does not own this record. |

### Where Rendr actually acts

| Control | What it changes | What it must not change |
|---|---|---|
| Frame composition | Phrases `framePerformance` on the Lead message from resolved meaning. May recommend presentation. | `promote`, the Document, `stage.story.layout`. |
| One Stage cell | When a Frame is stamped and the turn is already on Stage, one live-sourced filmstrip cell points at that Lead message. The beats stay on the message. | The rest of the filmstrip. A Dialog turn does not append that cell. |
| Stage arrangement | Cites Reading ids. Saves `arrangements`. From Dialog, the Reading is the stored filmstrip. On Stage, it is the pass that is up. | Slide sentences. A cite that invents a body is stripped. |
| `treatment.propose` | A look proposal: palette, type. A human Apply changes the domain Treatment. | Slide content, Story material, the filmstrip sequence. |

`stage.story.layout` is Lead-only. It is content of the filmstrip, not Rendr’s composition. The October 11 layout that wrote `slide-1` through `slide-5` was Kip. Rendr did not compose that turn.

### What authorized the filmstrip

The glossary and the Stage record authorize one sequence on the Stage screen, after the Cover, laid out by the Lead. Taking a Story to Stage is the other authorized write: `storyMaterialToStageSlides` copies titles and excerpts onto filmstrip cells and keeps a source when the slot is a capture, message, moment, or point. That is a projection of a Story. It is not a second Story system.

The October 12 read-and-arrange repair lets Rendr see those stored bodies and cite them. It does not make arrangement the way meaning becomes a Story, and it does not make an unsourced `text_slide` a kept object.

### Overlap

- A Frame beat and a filmstrip cell both have a title and a body. Only the cell is a Slide. The beat becomes reachable on Stage when a cell’s source is `live` and the id is the Lead message, or when someone lays the words into the filmstrip without a source.
- A Story capture and a live-sourced cell can point at the same message. The Story keeps the reference. The filmstrip keeps the sequence now on screen.
- “Story in development” in older glossary wording meant the filmstrip. A Story is `settings.stories`. The October 11 section already separated them. The glossary rows now say the same thing.

### Smallest corrections

Already in this working tree, and not a new subsystem:

- Reading text includes the stored slide body. The prompt names `slide:{id}`.
- An authorized Dialog composition arranges the filmstrip and does not replace it.
- The glossary names Story, the filmstrip, a Dialog Frame beat, and a Slide as different records. An unsourced `text_slide` stays a `text_slide`.

Not done, and not authorized by this map:

- Stamping `slide-1` through `slide-5` with sources they do not have.
- Treating the arrangement as proof the sentences express Operational Truth.
- A new Slide type, a new Story store, or a replacement of Frame, filmstrip, or Story.

### Still open, carried forward

- Signed-in walk of Frame reopen and of `slide-1` through `slide-5`.
- Chronicle orientation, Slide Gloss, OT16, OT19–OT22, the Section 16 cut, and the duplicate imported Points.
- Point `63a70b4f-6745-446b-8006-b02480cd6817` stays `proposed`.
- Whether the five bodies are sufficient.
- “New surface” remains later.

## October 12 2026 — where the five Slide bodies live

Read-only. Domain `9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9`. Lead message `210571b1-3995-4a83-b82f-8f9d79057589`. No Frame on that message. No arrangements on the Stage record.

| Place | Bodies |
|---|---|
| `keeperStage.story` cells `slide-1` … `slide-5` | Yes. Lengths 133, 122, 153, 154, 214. No source. |
| That message’s content | No exact body. |
| That message’s metadata | No. The layout receipt has titles, a rationale, and `slideCount`. Not the bodies. Not slide ids. |
| Story `already-in-progress` | No. |

The bodies have one durable home: the current Stage sequence. A later `stage.story.layout` would erase them. Pointing those cells at the message would not preserve them, because the message does not hold them. No Story was saved. No provenance was added.

### Correction plan — not implemented

Approved meaning stays as decided above. The choices below are technical. They wait for review.

1. Copy the five existing bodies, with their current ids and titles, onto the layout receipt of `210571b1`. That is the originating turn. It is not a Frame and not a Story.
2. After that copy exists, the Stage cells may record `source: { kind: "live", id: "210571b1-3995-4a83-b82f-8f9d79057589" }` plus the slide id. Not before.
3. Going forward, a successful `stage.story.layout` stores each slide’s id, title, and body on that turn’s receipt before it replaces `keeperStage.story`. The previous sequence’s bodies stay on the turn that wrote them.
4. `story.save` stays explicit. Do not create a Story for these five.
5. Rendr reads the turn’s Slides once they are on the message, and can already read the Stage sequence. Arrangement still cites and does not rewrite sentences. Frame promotion stays with the human or the Lead.
6. Gloss stays on a Dialog Frame Slide. These five have no Frame, so Gloss does not apply to them yet.

No new Slide type. No new product name. Filmstrip stays the internal name of the Stage sequence.

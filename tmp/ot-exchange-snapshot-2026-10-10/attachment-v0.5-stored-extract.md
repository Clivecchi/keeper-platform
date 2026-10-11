# Keeper Operational Truth

Current understanding and code verification baseline for completing the MVP

Version 0.5 • October 10 2026 • Prepared for Chuck Livecchi and Cursor

**Status:** Version 0.5 adds the October 10 Document-import and unfinished Agency-handoff evidence (S20–S21). Import is reported and visible in a pasted outline; exact source fidelity, version alignment, later retrieval/reload, and autonomous specialist completion remain unverified. Current coordination baseline incorporating the October 8 audit and development reports, October 8–9 human walkthrough, and Cursor’s October 9 revision/runtime reconciliation. Keeper code evidence is attributed to Cursor. The attachment repair has running-behavior evidence; exact deployed SHAs and end-to-end acceptance remain unverified. This document revision is not a Keeper software release.

## 0 Current operational state and capability index

### What this guide is and where it lives

Keeper Operational Truth is the maintained development baseline: approved meaning, architecture, requirements, implementation evidence, unfinished work and the path to MVP. Its intended working arrangement is this Dialog with a Document, addressable requirements, and proposed revisions or work records where existing Draft semantics support them. Dialog carries discussion; the Document carries maintained understanding; an attached file preserves a full version. This arrangement is product direction, not evidence that Keeper can already maintain the baseline.

Chuck reports that Documents and Points cannot currently express the operational status model adequately. Cursor must inspect their actual fields, actions, provenance, history and rendering before prescribing changes. Point acceptance, operational evidence and work progress are distinct dimensions. An accepted Point can describe unfinished or defective implementation. A blocked task can have passing unit tests. Do not collapse these into one status.

Keeper is intended to help develop the tools it needs. Use one existing Agency receipt requirement as the first bounded case: retrieve its meaning and evidence, preserve the unfinished action, propose the smallest capability change, hand technical execution to Cursor where needed, and prove retrieval after reload. No new top-level object or status engine is selected. The full versioned file remains the continuity anchor until maintained Document behavior is demonstrated.

The earlier private Library placement is conditional: Cursor reports a Keeper Library item lacks a private flag. That is a discovered integration limit, not permission to relax access. The seeded Dialog shell exists; eight proposed Points were written and removed after a content-access gap was found. The reported repair aligns Catalog and dialog.read with Dialog-list audience rules. The later manual creation/opening experience has not been tied to a distinct Dialog ID; acceptance must name the actual Dialog used and avoid duplicate homes.

ChatGPT is the coordination space, Cursor supplies code evidence, and Keeper is the intended working environment. Chuck is considering a new ChatGPT project named Keeper Operational Truth with Re-Center as historical context. Project creation or migration is not reported complete. Keep a single named baseline version across copies; this 0.5 update does not establish that the repository guide has also been updated.

### October 10 Document import and Agency continuity — S20–S21

Chuck reports that the Cast has put the guide's Points into the Dialog Document. The copied Keeper outline says “Writing added,” 55 Points brought in, 19 Sections, and shows imported Points as accepted. It also shows an Open group with one Point; whether that Point is included in the reported 55 is unknown. This is meaningful progress beyond an attachment-only exchange. It is human-supplied UI text, not an independent database or full-body read by this editor.

The supplied outline contains abbreviated Point previews (“More”), not all Point bodies. Tables appear as compressed Markdown previews; this does not prove their stored bodies are damaged. It does not expose object IDs, action receipts, a reload, or a fresh full-body retrieval. Importing 55 Points cannot by itself establish complete source preservation or end-to-end Document maintenance.

| Evidence dimension | October 10 finding | Required next proof |
| --- | --- | --- |
| Product intent | Maintain Operational Truth in this Dialog's Document using existing structures | Preserve architecture and stable OT/PK IDs |
| Import action | Chuck reports import; outline reports 55 Points across 19 Sections | Obtain action receipt and actual stored Document/Point references |
| Source/version fidelity | Upload named Keeper_Operational_Truth v-4.md; Kip declares v0.3, October 8 | Read source body version; compare imported body, not filename |
| Outline mismatch | Sections 1–19 shown; v0.4 Section 0 and capability index not shown; old heading “Active evidence and development records” shown | Determine stale uploaded body, parser omission, incomplete display, or another cause without guessing |
| Acceptance semantics | Imported Points appear accepted | Establish whether import auto-accepted them; distinguish content inclusion from human approval and technical verification |
| Specialist capability | Kip reports successful GitHub reads and one failed file lookup | Retrieve actual tool records, repository, branch, inspected commit and paths |
| Specialist work | No completed receipt/evaluation investigation supplied in this exchange | Cloud must return commit-specific findings or an exact blocker |
| Coordination | Kip asks Chuck to cue Cloud and says this Lead turn cannot invoke Cloud's tools | Inspect/test actual specialist dispatch and result-return path; do not require Chuck to relay an already assigned task |
| Persistence/access | No fresh reload or audience replay supplied | Retrieve source and preserved findings after reload; verify access boundary |
| Deployment | No new revision/deployment evidence supplied | Retain S18 as dated evidence; current deployed SHAs remain unknown |

Kip's October 10 17:32 reply claims a successful read and 55 imported Points, but identifies the baseline as v0.3. At 17:49 Kip reports no completed Cloud result and a failed file lookup among GitHub investigation. At 17:50 Kip acknowledges successful reads demonstrate investigative capability, while saying it cannot invoke Cloud's repository tools from this Lead turn. These are attributed Cast statements, not new code verification.

Separate four questions: does Cloud have repository tools; was Cloud actually invoked; did the investigation produce a result; was that result returned and kept in the same work context? A failed path lookup is not proof of missing repository capability. Kip lacking direct access to Cloud's tool handles does not establish that specialist dispatch is impossible. The limitation may be dispatch, tool discovery, path recovery, result forwarding, or another seam; its cause remains unverified.

This version replaces the supplied coordination baseline with v0.5 while retaining v0.4's current-state section, capability index and historical sources. It does not label the existing Keeper Document v0.5 until the actual source and imported content are reconciled. Do not delete or wholesale duplicate the existing 55 Points to make the counts look right. Recover missing material through the existing review/update path and preserve prior identities and history where supported.

The next Agency acceptance slice is source verification, existing Document reconciliation, Kip-directed Cloud investigation of OT16 and OT19–OT22, receipt-backed preservation of findings, and later retrieval. Start with one receipt-forwarding seam; broaden only where that seam's evaluation requires it. Cursor owns implementation repairs and tests when Keeper cannot execute them. No repository mutation, production deployment, public release, or new subsystem is authorized by this test. The full status and reload loop remains open.

### Latest repository and running evidence — S18

| Scope | Current reported evidence | Remaining limit |
| --- | --- | --- |
| Repository | HEAD = origin/cloud = 1ebba04659319aba821056b41511774c41df9655; clean working tree; commit dated October 8 20:41 EDT | At Cursor inspection time; no independent repository inspection here |
| Attachment source | Parent 1fb06fc84ae74ddeb81e2aae8b30c6082f47c721; only child change tmp/inspect-ot-attachments.ts | Web/API attachment source identical at both revisions |
| Production web | assets/index-h67xKa2A.js; HTML Last-Modified October 9 00:57:20 UTC; Word document and aim met markers | Compatible with repair source; Vercel access failed; exact deployed SHA unknown |
| Production API | Healthy Railway deployment fb6a156d-8fd6-4e45-a88f-cd420b1f7a99 at October 10 00:30 UTC, October 9 20:30 EDT | Uptime implies start near October 9 00:45 UTC; time and deployment ID are not a SHA |
| Stored attachment | At October 9 00:57 UTC saved 71,384 extracted characters; older 00:25 message gained the same text | Running API handled repair behavior; no exact SHA and no full acceptance |
| Previous API process | 3ab11ff3-8662-45f5-bb08-36aee80e9ce1 superseded by the reported process above | Retain only as historical evidence |

### Development evidence since the initial audit — S15 and S17

| Revision | Reported change | Verification boundary |
| --- | --- | --- |
| cf16e1e8f5806539aeaea2f7194295b98b837f84 | Receipt-only specialist results reach Lead; both prohibition phrases block create/update/treatment proposals; unrelated Point/Treatment does not complete investigation | Initially local, unpushed, undeployed; no completed live Agency replay supplied |
| abf1b7a4245be1c6c5881efc16eae4b63a8438e9 | Ceox core: catalog.read, dialog.read, draft.read, library.read, glossary.read; claim diagnostic checks kept ID/Domain and old anonymous key rejection | Reported shared core/claim tests 7 pass; signed-in live claim not completed |
| f195ac601b9b4cbc71c8195c5c8fdf2b1bb9a4dd | Catalog/dialog.read audience alignment; repository truth layer and recovered Present route contract | Reported audience test 1 pass; smoke not run before these commits; live access replay not supplied |
| 1fb06fc84ae74ddeb81e2aae8b30c6082f47c721 | Store extracted attachment text on originating message; supply later Lead/specialist context; accept DOCX paragraphs; failed-read reply cannot satisfy aim | Stored-document prompt, Word reader and failed-read rule tests reported passing; API typecheck pass; browser acceptance not run |

The latest HEAD/origin equality replaces the earlier ahead-of-origin report for the attachment branch. Request ancestry evidence for the earlier repair commits if required to close their current revision attribution. Do not assume all focused tests were rerun on current HEAD. Prior aggregate counts 29 and 12 remain scoped to the initial audit; they are not a new regression result. Exact deployment revision and per-capability live behavior remain separate.

S15 also reports a production anonymous Moment test: cmv04wg0l0006mr01u06qrove was created, updated, kept and found on the KE3P Feed. Unauthenticated claim returned 401. The object remained unclaimed and was deleted; it is test history, not a retained proof object. Signed-in claim and rejection of the old anonymous key remain open. Finding the Plot was not replayed because local web/API timed out. The recovered Present path is ?frame=present with optional journeyId for a public journey; without one, it renders the presentation board. No release controls were added.

### Attachment walkthrough and remaining proof — OT11, OT16, OT20–OT22, OT28

Cursor reconstructed four attempts in seeded Dialog cmv04yrn50001otb8mwjrj0as. DOCX was not accepted/stored; the first Markdown attempt also had no file reference. A later Markdown upload supplied its body for that turn, but stored only its address. The follow-up received previous summary prose without the original body. These were different failures: failed upload acceptance, missing reference, and unavailable later retrieval. The investigation did not attribute the follow-up failure to permission denial.

The successful upload turn had version 0.3 and OT01 within its input budget. The model identified title/date/version but called a status principle the first requirement, rather than OT01 Public Domain and navigation. That is a model-use failure despite available text. The older resolved traces came from a pre-cf16e1e8 web build counting heard voices, not completed objectives. Later presented — Agency — undirected means presentation only.

The latest reconciliation finds extracted text now persisted and written back on an earlier message. The last saved turn at 00:57 UTC reattached the file, identified 0.3, omitted OT01, and showed draft.update.propose — skipped. A skip is not a preserved proposal. No later follow-up, reload or kept addition was found. The attachment acceptance objective remains OPEN.

Required proof now uses the baseline actually attached: upload once; identify its version and OT01 from the body; read a distinct later section without reattaching; reload and repeat; read the actual Dialog Document; compare; preserve one useful proposed addition with object/action receipt; reload and retrieve it. Name actor, Dialog ID, web/API revisions or explicit unknowns, attachment/message IDs, test time and outcomes. Test DOCX tables as well as paragraphs because the register and index are tables. Excel remains unsupported in the supplied report. New attachments need clear accepted/rejected/uploaded/extracted states; a visible filename alone is insufficient proof.

### Consent and composition experience — OT09, OT13, OT19, OT22

Chuck’s October 9 exchange describes natural speech leading toward an appropriate composition surface while allowing an explicit surface choice when wanted. Ambiguous, lyrical or philosophical input should retain its meaning and offer likely paths. This refines the existing natural Composer and contextual composition intent. The Cast’s phrase smart intake layer is an interpretation, not approval for a new routing subsystem. Automatic switching, confidence thresholds and alternatives require reconciliation with existing Human/Lead promotion authority and stable Place/Work/mode.

The Cast offered to propose a Point; Chuck said yes. Two draft.update.propose attempts were skipped under the rule that a Point is proposed only when the human asked. The observable defect is that specific conversational assent was not honored. A latest-sentence-only gate is a hypothesis until Cursor examines the actual path. After the first skip, the Cast repeated Proposing instead of addressing the failed action.

Acceptance must distinguish proposal authorization from objective completion. A yes to a specific immediately preceding Point offer can authorize that proposal, without permitting unrelated artifact substitution or overriding a prohibition. Bind assent to the offered action and content; handle changed subject, ambiguous assent, withdrawal, duplicate retry and both prohibition phrases. Narration must reflect the actual receipt. A commentary statement about broken steps does not itself authorize a second proposal. No repair of this observed consent failure is supplied.

### Experience issues preserved from the human walkthrough — S16 and S19

These are reported observations and preferences, not independently inspected images or confirmed code causes. The supplied screenshot paths failed to load. Preserve them for replay; do not mark a redesign or fix complete.

| Area | Human observation or intent | Next evidence/action |
| --- | --- | --- |
| Opening/Domain | Opening is good, not great; missing expected background; Domain selector unsatisfactory | Replay expected background and selected Domain; clarify concrete selector behavior before changing |
| Header/Stage | Realm, Domain, Build, Design and Agency disappear when Stage is selected; meaning confusing | Map what each control represents and why visibility changes; preserve stable Place/Work and agreed mode control |
| Participants | Add Someone suggests human collaboration, but Chuck appeared to need adding himself; placement poor | Compare seeded and user-created Dialog membership/defaults; test invite/access separately from visual placement |
| Attachments | Attachment areas stack before necessary; upload does not reliably communicate acceptance | Replay narrow/wide layout and file acceptance states; identify existing attachment components |
| Visual identity | Dialog header should be more picturesque/colorful; expected background missing | Record design preference and available existing theming/Design Frame path |
| Vertical space | Chronicle banner duplicates Dialog title; Composer, headers and top bar consume too much space | Measure readable transcript area on desktop/mobile; propose compact treatment preserving essential controls |
| Document capability | Need proof Keeper can create and maintain Operational Truth as a Document | Run one-requirement maintenance slice before full import or claims of integration |

These observations map mainly to OT01, OT05, OT07–OT11 and OT28. They refine acceptance and legibility rather than create a parallel architecture program. New human participation capability is observed as a control, not yet verified as working collaboration.

### Capability and requirement index

This is a document navigation index connecting existing concepts to contracts, evidence and open work. It is not Keeper’s database Catalog and does not create a duplicate object inventory. Code paths/symbols are search clues until verified at the current revision. Requirement IDs remain OT01–OT28; parked IDs remain PK01–PK14.

| Capability / existing structure | Requirement and location | Current evidence / next proof |
| --- | --- | --- |
| Public Domain, Cover, Moment, Feed, auth, Diagnostics | OT01–OT06, OT27; sections 3 and 6 | Capture partly replayed; claim diagnostic committed; signed-in ownership/reload open |
| Design Frame, v0 grammar, themes | OT05; section 6 | Contract preserved; current implementation and expected background unverified |
| Board, Place, Work, Dialog/Stage controls | OT07–OT08; section 12 | Source corrections reported; browser mode/selection/mobile/reload proof open |
| Composer and contextual surfaces | OT09–OT10; section 11 | Existing Composer/promotion source; speech-led composition intent refined; surface/header behavior open |
| Attachments and source continuity | OT11, OT16, OT20, OT28; section 0 | Persisted-text repair behavior reported; follow-up/reload, DOCX tables and proposal proof open |
| Document manuscript, Points, Sections | OT13–OT14, OT28; sections 7 and 17 | Proposed Points/reorganize exist; full baseline maintenance and separate status dimensions unproven |
| Drafts and written work handoff | OT23, OT28; sections 8 and 15 | No true Draft assignee reported; durable written handoff interim; resumption not established |
| Jev Living Discovery | OT15; section 7 | One-Point gate/source and initial 12 tests; Frogmore subject discovery replay open |
| Agency Core and capability allowlists | OT17; section 8 | Ceox addition reported with five read capabilities; live role proof open |
| Catalog and selective body reads | OT18; section 8 | Paging and audience correction reported; counts/discovery/access/provider replay open |
| Cast Room, receipts, evaluation, prohibitions | OT16, OT19–OT22; section 9 | Repairs reported; explicit assent proposal fails in human exchange; full live evidence open |
| Trace, Trail, Gloss, SOLE | OT16, OT19–OT23; sections 4, 7 and 9 | Factual provenance contract; old resolved vs presented distinguished; no assumed work ledger |
| Model Config and provider routing | OT24; section 10 | Screen/source exist; effective assignment and configured provider replay open |
| Story references/save/handoff | OT11; section 11 | Save/source present; identity, refresh, continuity and reload proof open |
| Reading, Rendr bounded composition, Restore | OT12; section 13 | Source/grammar tests reported; live propose/apply/refusal/restore proof open |
| Present frame and release | OT26–OT27; sections 3 and 16 | ?frame=present, optional journeyId; no audience/destination/share/release control established |
| Keeper Operational Truth maintenance | OT28; sections 0, 17 and 18 | Shell/file/repair fragments; one requirement maintenance and retrieval is next proof |

### Next bounded sequence and closure rule

1. Reconcile current web/API revision evidence and test scope; retain unknown SHAs. Record whether required smoke/regression checks have since run. A healthy API, bundle marker or timestamp cannot close a release claim.
2. Finish attachment follow-up and reload acceptance on the named Operational Truth Dialog. Investigate model failure to identify OT01 despite available source. Verify the access boundary before preserving private content.
3. Inspect existing Document/Point/Draft actions and fields. Demonstrate one requirement with meaning, evidence, owner, blocker and next action, a reviewable proposal, durable receipt and retrieval after reload. Identify the smallest genuine capability gap instead of importing the whole baseline blindly.
4. Reconcile the observed yes-to-Point rejection without weakening prohibitions or proposal/completion separation. Attach this case to OT13/OT19/OT22 and preserve accurate narration.
5. Continue existing Agency, Stage continuity and signed-in claim acceptance; return the minimum Present release contract before extension. Address recorded layout/navigation gaps through existing surfaces and Design Frame where applicable.

Cursor owns technical investigation and execution evidence; Chuck owns product meaning and the human acceptance walkthrough. Keeper Cast coordination is intended behavior requiring proof. Every session ends with the changed requirement, revision, tests, running evidence, remaining gap and next action. This document update authorizes no new production deployment or public release. No requirement is closed by the act of updating this guide.

## 1 Purpose and governing conclusion

Keeper has a substantial product model, established architectural contracts, working fragments, reported implementations, and observable failures. The current problem is connecting those pieces into a dependable human experience while preserving their meaning. We must stop treating a missing connection as permission to invent a replacement system.

This document consolidates the two project source files, eight attached conversation summaries, two attached forensic reports, ten screenshots and mockups, Cursor’s audit response, and the development directive Chuck confirmed sending. Cursor’s full repository audit file was not supplied here; this revision incorporates the pasted response and does not claim to reproduce all of that file’s evidence. It records what Keeper means, what must remain true, what was reportedly built, what remains unproven, and the evidence needed to complete MVP. It is a control document for continuity, not another speculative architecture program.

The first reconciliation has returned: Cursor audited committed HEAD be18e65d and identified separate uncommitted work. Chuck then sent a bounded development directive: finish Agency receipts and evaluation, replay Stage continuity, repair claim diagnostics and run capture, and return a concrete Present release contract. The initial selected home was a restricted KE3P Dialog with full Library text. Subsequent access findings and discussion refine that arrangement in section 0: Dialog supports a maintained Document; integration and operational status capabilities must be proven. The initial development pass did not authorize production deployment. Later runtime observations are evidence of running behavior, not a reconstruction of release authorization.

**Main conclusion:** Preserve existing architecture and separate product intent, code, deployment, tests, live behavior and unfinished work. The initial uncommitted Agency candidate has been followed by reported commits. The latest supplied reconciliation places HEAD and origin/cloud at 1ebba046 with attachment-repair source unchanged from its parent 1fb06fc8. Running web markers and API text persistence show repair behavior, but do not establish deployed SHAs or complete acceptance. Section 0 governs current state; earlier dated findings remain historical evidence.

### How to use this document

Chuck owns product meaning and architectural decisions. Cursor establishes code truth and implements bounded changes. The Keeper Cast operates inside Keeper's actual capabilities and authority. Each new build must reference an existing requirement below, identify its current implementation, and state the smallest missing seam. A new noun, persistent object, control surface, or orchestrator needs an explicit explanation of why existing structures cannot serve the requirement.

Read section 0 for the current state and capability index, then sections 2–5 for the baseline and vocabulary; 6–14 for architecture and implementation state; 15–18 for reconciliation, MVP proof, integration, and operating discipline. The source register is in section 19. Stable OT identifiers are document tracking identifiers, not proposed database entities.

## 2 Evidence and status discipline

The editor of this guide did not independently inspect Keeper’s repository or runtime. Cursor’s supplied audit establishes source findings for be18e65d on cloud, with origin/cloud equal to HEAD. This is attributed code evidence. Runtime, deployment, and candidate-change claims retain the limits of that audit. Historical reports in later sections are preserved and explicitly reconciled where the newer audit changes their status.

| Evidence label | Meaning |
| --- | --- |
| Contract | Explicit product or architectural requirement in supplied sources |
| Reported build | Cursor or the Cast says implementation exists; current code and runtime still need verification |
| Reported forensic finding | Supplied code investigation identifies behavior and symbols; must be reconciled to current commit |
| Observed record | A supplied screenshot or conversation records a particular behavior at that time |
| Hypothesis | Plausible cause or interpretation requiring additional evidence |
| Parked | Preserved direction without a current implementation commitment |
| Unverified | Insufficient evidence to establish present behavior or completion |

### Operational status is a set of dimensions

“Partial” may remain a summary verdict, but it is insufficient operational truth. Every important claim must say what it refers to, which kind of evidence supports it, where it applies, and what remains open. Product approval, code existence, persistence, deployment, and successful use are different facts. They do not form one automatic ladder.

| Dimension | What we must record |
| --- | --- |
| Product intent and approval | Contract, decision authority, approved scope, provisional refinements, and explicit superseding decisions |
| Committed implementation | Existing, absent, or defective behavior at a named repository, branch and commit, with symbols and paths |
| Local candidate changes | Uncommitted scope, what is repaired, what remains incomplete, and tests applying to that candidate |
| Deployment | Environment, deployment identifier, deployed SHA if known, and unknown revision or access limits |
| Deterministic verification | Test names or groups, result, scope, and whether the tested source is HEAD or candidate work |
| Live verification | Actor, environment, revision, user flow, actual behavior, persistence/reload, and remaining limits |
| Work and accountability | Owner, status, blocker, dependency, next bounded action, and completion evidence |

These are required information fields in existing document or object structures, not a request for a new database status subsystem. Use Unknown when evidence is missing, Not run when a test was not attempted, Blocked with the actual cause when execution stopped, and Not applicable only with a reason. Do not allow a blank field to imply completion.

A unit test can pass on uncommitted code while production still has the defect. Source inspection can confirm that Stage continuity is present while its browser behavior remains unverified. An instruction can authorize Ceox’s core without establishing that the core exists. A Point may be accepted as an approved requirement while its implementation remains defective or unverified.

Keep action semantics explicit: proposed, executed, persisted, human-confirmed, applied, deployed, and verified. A successful proposal receipt establishes the proposal, not the requested implementation. Keep failure labels equally explicit: refused, failed, irrelevant, environment-blocked, or unresolved. A runtime presented event means Keeper spoke; it does not establish that the objective was accomplished or that the Present release contract exists.

### Historical revision and environment record — audit 0.2; current record in section 0

| Scope | Evidence reported by Cursor | Operational limit |
| --- | --- | --- |
| Repository | cloud branch at be18e65d; origin/cloud and HEAD match | Does not include uncommitted candidate behavior |
| Candidate repair | Uncommitted files contain direction correlation, proposal rejection as completion, and retry up to cap 2 | Incomplete receipt seam; no committed or deployed repair reported |
| Railway API | Healthy deployment 3ab11ff3-8662-45f5-bb08-36aee80e9ce1; Node 20; process start near 01:32 UTC October 8 | Start time aligns with commit timing but is not a git SHA; deployed API SHA is not established by the response |
| Production web | www.ke3p.com bundle index-DnW4ZOr-.js; Last-Modified 13:01 UTC | Later Vercel build; Vercel access unauthorized; web SHA unknown |
| Web tests | Not run in audited workspace | jsdom missing; no browser continuity replay |
| Guide location at audit | docs/keeper-operational-truth.md; short Gloss on ke3p Becoming Together | Full guide not imported; Gloss is not the guide |

No live screen may be treated as proof of be18e65d unless its deployed revision is established. The initial bounded development pass did not authorize deployment. Record later commit/deploy evidence when it arrives; do not infer it from health, timestamps, or bundle names.

### Evidence scope from the returned audit

Cursor reports 29 passing shared tests covering cast room, Agency Core, artifact authority and Stage composition, plus 12 passing Living Discovery gate tests. Candidate repair behavior and committed behavior must remain distinguished. The response does not provide individual test names or a fresh test transcript, so preserve the aggregate counts with attribution and request precise evidence as work proceeds. Stage grammar tests do not prove a live composition; Living Discovery gate tests do not reconstruct the Frogmore 10:09 turn.

The live Agency provider replay, Finding the Plot continuity replay, first-time visitor loop, and guide import remain unverified. No requirement was marked superseded by the audit. The authorized Config placement refinement below is a new explicit product decision, not an audit finding that erased the original Frame contract.

### Precedence and reconciliation

The Re-Center Blueprint remains the primary alignment document [S01]. Later explicit decisions refine its application; they do not silently erase its capture, public Domain, Design Frame, diagnostics, auth, and proof requirements. The latest explicit correction governs the point it corrects, while code evidence describes implementation rather than product authority.

Do not infer chronology from attachment ordering or filenames. The two pasted report timestamps identify exports, not necessarily the current code revision. When a repair is reported elsewhere but a forensic report still describes the defect, mark the repair pending commit comparison and replay. Do not declare either report current without that comparison.

## 3 Product purpose and public MVP

Keeper is for Stories in Progress. A human brings lived material: pictures, writing, sound, relationships, questions, work, and Moments worth keeping. Dialog helps encounter and develop meaning. Agency undertakes warranted work. Composer provides the human instrument and supports composition. Rendr composes expression. Stage gives selected work an experience. Chronicle reveals the understanding and consequences that become durable. The human remains Author [S02, S03, S07].

Be. Speak. Become. is the human-facing spine. Capture → Connect → Create → Build is the Blueprint progression. These describe purpose and development; neither grants permission to make every utterance durable or to turn every reply into a presentation.

**Original MVP completion contract:** a first-time visitor can land on a public Domain, understand the place, find Domain navigation and required Frames, create a Moment through draft and keep, see Domain-scoped proof it exists, return to Cover, and continue without confusion. The broader Blueprint requires fully managing and deploying an aesthetically pleasing public presentation through an easily navigated Domain Board and Frames [S01].

The current product progression adds Dialog → Stage → Present. Dialog develops work; Stage composes it; Present governs audience, access, destination, sharing, publishing, and release [S09]. This must converge with the public MVP, rather than replace it with an internal AI demonstration. One applied Treatment, filmstrip, or attractive panel can be a useful milestone without completing MVP.

Livecchi.biz and Sheyenne onboarding are named real-world acceptance contexts [S05]. Pool Keeper Moments and the smallest public Chronicle performance are candidate proofs discussed by the Cast [S04]. Frogmore is a creative and discovery laboratory [S02, S03]. Chuck’s sent directive now selects KE3P as the single acceptance Domain for Stage continuity and the public visitor loop. Frogmore remains the Living Discovery test case; Livecchi.biz and Sheyenne remain future real-world contexts rather than competing programs for this pass.

## 4 Vocabulary and boundaries

| Term | Operational meaning and boundary |
| --- | --- |
| Domain | Ownership, routing, data scope, permissions, and contextual public home |
| Realm and Home | Broader human continuity; Home may use an anchor Domain for data. Do not conflate shell place with data scope |
| Board | Coherent parent experience holding Place and Work while mode changes |
| Moment | Meaningful durable story material; has its own capture and keep lifecycle |
| Path and Journey | Paths connect Moments; Journeys carry a Story in Progress |
| Story | Meaningful selected narrative; existing stored Story representation must be respected without inventing a duplicate ontology |
| Dialog | Living conversation and work context; carries continuity beyond the latest sentence |
| Document and Point | Manuscript and shared durable understanding; acceptance and Section placement are separate |
| Draft | Existing work-in-progress structure; not interchangeable with every use of the word draft |
| Gloss | Perspective anchored to material; current implementation is narrower than per-agent ongoing perspective |
| SOLE | Existing durable meaning or memory surface; not implementation execution or an already proven agent Desk |
| Trace and Trail | Trace records facts; Trail supplies scoped context derived from existing records |
| Catalog or Desk | Database-backed Domain discovery shelves, counts, paging, search, and references; not a second memory map |
| Composer | Human input and direction instrument. Stage composition and Agency context assembly are distinct functions |
| Dialog Frame and Slide | Optional composed presentation inside Dialog; Slides are states within that Frame |
| Reading | Bounded sourced truth available to a Stage composition |
| Stage Composition | Arrangement and expression of a Reading; does not invent its truth |
| Stage | Composition and performance surface; neither an agent nor publication configuration |
| Present | Audience and delivery contract, distinct from composing and from a runtime event named presented |
| Cast and Agency | Participants and authorized consequence; hearing an offer is not actual specialist work |
| Jev | Several evaluation paths with different responsibilities; their contexts and permissions must remain distinguishable |
| Design Frame | First-class mechanism for structural grammar and themes; not synonymous with Stage Composition |

The Blueprint's navigable system Frames and later Dialog presentation Frames use the same word at different levels. They must not be collapsed. Likewise, the Trace event resolved differs from the resolvedMeaning object, and a runtime present pass differs from the future Present product mode. Cursor must show where each meaning lives before changing its behavior.

## 5 Nonnegotiable continuity rules

Preserve domain-scoped truth, one auth surface, discoverable primary Frames, v0 structural grammar with theming layered over it, public capture, and proof of keep. Keep Design Frame and diagnostics visible in the plan [S01].

Preserve one Board, a stable Place, and one Work in Hand across Dialog and Stage. Preserve the useful Dialog interface and the new Stage composition as starting points. A missing route is not evidence that the underlying composition should be rebuilt [S09].

Preserve human and Lead direction over presentation; Rendr owns expression within its granted boundaries. Preserve cheap offers, selective full contributions, factual Trace, current manuscripts, proposal and acceptance status, and existing object references [S05, S08, S12].

Do not substitute Slides, Treatments, Points, or SOLE for unrelated work. Do not treat generic success as objective completion. Do not make an unverified fallback appear to be a specialist investigation. Do not expose inaccessible Domain material merely because it seems relevant [S06, S10, S12].

Preserve ordinary conversation. Posture belongs to the human and Keeper; Realm and navigation provide context. Presence, Exploration, and Execution are illustrative ideas, not an approved new mode taxonomy. The singular Composer should allow natural speech without asking the human to choose an operational subsystem first [S10].

## 6 Domain capture navigation and design foundation

### Public Domain and Moment lifecycle

The Blueprint names /d/:domainSlug as public entry, with query-based Frame switching such as ?frame=moment. The original required discoverable Frames are Cover, Moment, Agent or Kip, Domain Config, and Diagnostics [S01]. Audit 0.2 finds guest Cover, Moment, Feed and Diagnostics; Config is on Chronicle rather than a Frame. Chuck’s sent directive explicitly keeps Domain Config in Board Chronicle provisionally. Its discoverability and permissions remain acceptance requirements. This is a recorded refinement of placement, not silent deletion of the Config requirement [S13, S14].

A Moment must support correct Domain draft creation, autosave, a successful keep response, a timestamped kept state, and a Feed or proof surface. The anonymous onboarding choice is explicitly locked: public draft creation requires domainSlug and a temporary public author/session identity such as anonKey or a claim token, with later authenticated claiming [S01]. Audit 0.2 supplies partial implementation evidence: the guest capture surfaces and claim API exist, but no visitor completed the loop. Diagnostics incorrectly expects ownerId in a claim response that returns a kept Moment without that field. The authorized repair must validate the actual claim/ownership contract and then replay capture, claim and Feed proof [S13, S14].

### Structural grammar and first class design

v0 supplies layout, spacing, typographic rhythm, calm surfaces, predictable controls, and navigation. Themes supply palette, texture, tone, and mood without changing that grammar. The Moment Frame is the original exemplar. The audit’s grouped OT01–OT06 verdict does not independently establish the Design Frame’s implementation. Design Frame must establish and enforce this structure and apply themes across cohesive Frames. It must not disappear into an unspecified later backlog [S01].

This requirement coexists with Rendr's bounded Stage Composition. A composition grammar does not automatically implement the Design Frame or Domain-wide theme management. Cursor must identify existing starts for both, including routes, schemas, and application points, before proposing a combined solution.

### Authentication and diagnostics

Old and new login flows must converge. The Blueprint identifies two UI designs and a legacy UI; legacy work should not consume endless debugging, while useful current surfaces are protected by later decisions. Rebuilding everything at once is not the smallest next step [S01, S09].

Diagnostics must be Domain-accessible and Frame-first, with copyable auth, Domain, network, and error snapshots; a draft/update/keep/anonymous-claim pipeline test; and room for later useful Kip debug operation. Diagnostics are part of shortening the evidence loop, not an optional developer convenience to forget during UI polish [S01].

## 7 Dialog documents keeping and discovery

### Living work and manuscript

Immediate Dialog and its primary Document or work take precedence over secondary Domain context. Short follow-ups such as So do it should inherit the active objective unless the human changes it. A latest-sentence classifier cannot alone establish Dialog intent [S06].

Document keeping and organization must remain distinct. A Point may be proposed and persisted, later accepted, and still remain in Open because it lacks a Section assignment. Acceptance does not mean placement. The observed repeated requests to preserve findings and explain Open reveal missing continuity and legibility, not a need to erase the manuscript model [S03, S05].

Review and Reorganize proposes changes to existing structure and requires a visible review/apply path. Intake through Bring in Writing is not the same function. Earlier visible project context mentions Current, Proposed, Changes, Apply and New, Refined, Moved, Merged, Retire; these are inherited search targets, not verified current controls. Reconcile them with existing document.reorganize.propose and manuscript authoring before adding new machinery.

### Agency keeping and human confirmation

The October summary clarifies that an agent can keep reviewable understanding on behalf of Agency with provenance and status. Current reported code persists proposed Points before acceptance and records proposedBy. Human acceptance strengthens status rather than creating the first existence of the Point [S03]. This does not authorize arbitrary retention of every sentence, bypass explicit prohibitions, or equate a proposed code change with executed code.

The discovery/recommender identity must survive a mechanical executor. If Jev recognized the meaning and Kip executed draft.update.propose, the user should not be misled about who discovered it. Receipts should name the actor, action, changed object, status, and location. Chronicle should make the consequence visible.

### Jev paths and Living Discovery

The supplied summary identifies three existing doors: System One for limited direction/reorganization signals; preserve-discovery@1 after the Lead reply; and jev.probe for agent-supplied evidence and questions [S03]. These are not one magical librarian. The optional Catalog relevance probe and a future posture recommendation are separate responsibilities.

Before the Living Discovery change, existing manuscript Points or durable drafts reportedly closed the preservation gate. The authorized slice reuses loadDialogDocumentForAgent, document_manuscript, draft.update.propose, createDraftPoint, proposed provenance, bumpDraftPresence, Chronicle rendering, and draft.point.accept. It compares the current exchange to existing understanding and preserves at most one newly earned Point per turn [S03]. It does not include multi-Point harvest, agent Gloss, sentence addressing, SOLE redesign, new Pending semantics, or Chronicle composition.

The Frogmore test remains an acceptance failure in the record. Expected subject discoveries included Soul Before Polish, Chronology Doesn't Apply, and Characters, Not Singers. The visible Jev Point instead described a three-point split proposal and action-log correction. The hypothesis is a semantic focus on agent process rather than Story meaning. Mutsy also acknowledged action claims without matching session receipts. Cursor must inspect the exact 10:09/10:10 turn, evidence, evaluation, survives value, executed proposes, and Chronicle result. Missing or truncated source text must not be invented [S03].

### Gloss SOLE and addressability

Current reported Gloss threads anchor to Document Points. Messages carry user/agent roles without independent agent identity. SOLE is shared Domain memory with author provenance and is not retrieved as a distinct agent-filtered perspective. Message IDs and Point UUIDs are addressable; sentences are not stable entities. GlossAnchor has optional selectionText and a later phrase-level intention [S03].

Preserve future agent perspectives, span/quote addressing, and a stronger Gloss model without declaring them built. Pending exists in a Point status union but reportedly has no ordinary live setter and is painted as an error by Chronicle. Giving Pending a becoming/dependency meaning is parked, not an approved status migration.

## 8 Agency identity context and Catalog

### Responsibility separate from voice and model

Agency Core is compact, durable, versioned, and machine-facing: identity, purpose, responsibilities, principles, Lead relationship, and actual capability names. Voice remains style; Domain policy remains policy. Model/provider supplies intelligence and must not define agent identity [S06].

Cursor reportedly implemented version-1 cores for Kip, Cloud, and Rendr, stored on the agent row with code defaults and stored version-1 precedence. Kip leads and advances objectives; Cloud investigates and executes technical work; Rendr owns design and expression. The October 8 diagnostic reported Ceox absent from PLATFORM_AGENCY_CORES and its offer as responsibility unset [S12]. Ceox's role is established; S15 subsequently reports its core added. Live role verification remains open (section 0).

### Working context and discovery

The intended order is Agency Core → immediate Dialog → primary Document/work → small Domain awareness → selectively read secondary bodies. Existing action allowlists remain authoritative; a capability named in a core does not grant permission.

The former Domain preload reportedly included capped recent slices of 20 Keepers, 20 Journeys, 20 Library items, 30 Dialog titles, 25 Drafts, up to 40 people, and up to 80 current Document Points. This hid what was omitted while appearing comprehensive. The reported repair replaces broad title preloads with shelf counts and catalog.read pages using search, offset, and limit [S06]. Audit 0.2 confirms Catalog paging exists on the named committed source; live discovery and provider replay remain unverified [S13].

Catalog queries current database truth. Keepers, Journeys, Paths, and Moments may have hierarchy, while Dialogs, Documents, Drafts, and Library also sit beside it with references. Do not force them into an invented tree or store a shadow Realm map. Catalog pages are titles and IDs, not bodies; intentional dialog.read, draft.read, keeper.read, journey.read, moment.read, and library.read load content. Specialized Library semantic retrieval stays specialized.

Jev may rank candidate titles when the secondary source is unclear. Clearly named work should skip unnecessary probing. Relevance is not truth or authorization. Cross-Domain discovery and protected relay are explicitly outside this slice [S06, S10]. People notes and Stage titles reportedly remain possible context leakage from the old preload approach; Cursor should show exactly what still enters prompts.

### Desk limits

Catalog supplies awareness, not a complete durable work ledger. The reported Draft model lacks a true assignee field, and ADVANCE names an owner in body text. Trail is scoped history, not a Desk. Audit 0.2 confirms Drafts have no assignee. The sent directive accepts a durable written handoff for this slice if it records objective, owner, status, blocker, next action and completion evidence and can be found after reload. This does not establish automated resumption. Reuse existing structures before adding a work or assignment model [S13, S14].

## 9 Agency runtime and completion truth

### Intended behavior

Conversation speaks, Cast enriches, Agency performs. Operational work follows understand → investigate → compose when relevant → decide → act → observe → continue. Kip directs, Cloud investigates or executes, Ceox challenges, Rendr composes, and Keeper verifies the consequence [S04, S08]. Natural conversation need not manufacture an operational objective [S10].

ACT genuinely performs the requested work. ADVANCE materially investigates, specifies, coordinates, prepares, or preserves the same unfinished work. STOP names the boundary when meaningful advancement is unavailable. A compliance Treatment, mobile Enter Slides, or SOLE memory replacing implementation is a failed objective even if its tool succeeded [S06].

### Historical failure mechanism — audit 0.2

The supplied October 8 export reports a one-pass Cast Room. useAgentDialog in apps/web/src/hooks/useAgentDialog.ts resolves hearing; two or more voices enter runProgressiveCastRoom, while single/pinned voices use an older consult path. Cheap castOffer calls run without tools. Kip directs once with an optional engage slug and aim. One specialist may run tools. castRoomTurn.ts retains its prose but drops actionResults. The room unconditionally appends resolved and presented. A later Lead present pass can execute actions [S12].

The report says CAST_ROOM_CONTRIBUTION_CAP is 2, but there is no evaluation and retry loop using that cap. Nonempty prose counts as ok. There is no verified match between aim, contribution, receipts, and objective. CastRoomEvent.refs exists but is not populated, and parseCastRoomEvents drops refs. Audit 0.2 confirms this committed false-resolution behavior at be18e65d, including dropped specialist actionResults and refs and unlabeled prior Cast history. It also identifies a separate uncommitted candidate repair; production at that audit was not reported to run that repair [S13].

The golden-path allowlist includes draft.update.propose, draft.create, and treatment.propose. buildPerformancePosturePrompt tells Agency to ADVANCE with a Point proposal when unable to execute. This makes writable artifacts stand in for reports or investigations. detectPointIntent considers the current visible sentence, misses not to create, does not cover treatment.propose, and does not preserve earlier prohibitions. A point-ask follow-up can bypass that prohibition [S12].

projectCastRoomTrail carries prior contributed, acted, and resolved lines while dropping the prior human line; an existing test reportedly requires this. Combined with session receipts, it can contaminate a new specialist aim with prior findings. The exact source of a repeated Railway sentence remains a hypothesis until its prompt is replayed. Pinned-agent empty/failure fallback and offers-without-engage are distinct paths; neither should silently certify investigated work.

### Preserve and repair within existing architecture

Preserve cheap offers, Kip direction, real specialist tool execution, nonexecuting direction passes, factual Trace, and proposed status. The single-voice path reportedly already forwards receipts and is a reference for fixing the multi-voice seam.

The smallest coherent correction proposed by the diagnostic is to correlate a contribution with its direction and turn, carry specialist receipts to the Lead, isolate the current specialist aim from unlabeled historical contributions, evaluate before resolving, use bounded retry or honest stop, and prevent unrelated proposal actions from completing investigations. Audit 0.2 finds part of this correction implemented only in uncommitted files: current-direction correlation, refusal to count Point/Treatment proposals as completed work, and retry up to cap 2. The remaining useAgentDialog seam keeps room results only when prose exists and does not supply specialist receipts to the Lead present pass. This is an incomplete candidate, not a completed repair [S12, S13].

The source discussing Posture says repair work had been requested [S10]. That does not establish that it shipped. The sent directive authorizes finishing that receipt seam, preserving receipt-bearing results even without prose, and testing evaluation, prohibitions, correlation and honest failure before live replay. Continuing open work across turns also remains unresolved in the evidence; a successful within-turn retry would not alone prove durable resumption.

## 10 Models providers capabilities and operations

The Agency Core/Catalog replay reportedly stopped before a model answered: the cheap offer required an OpenAI key that was rejected, while full Kip/Cloud/Rendr turns required Anthropic credentials unavailable in that environment. No Agency Trace resulted; the compliance replay did not run [S06]. An earlier Story example separately reports Kip using gpt-4o and Rendr using claude-sonnet-4-6 [S08]. These are historical assignment evidence, not current recommended models or prices.

Cursor must enumerate model assignments for Lead, offers, contributions, Jev paths, Dialog, Frame composition, Stage, and fallbacks. Identify hardcoded choices, stored configuration, environment-derived configuration, duplicate routers, and any previously built management surface. Separate routing from credentials. Record effective assignment and fallback without exposing secrets.

Audit 0.2 confirms a model Config screen exists. The open question is its actual coverage of effective assignments, provider credentials and fallbacks across execution paths, and whether configured live turns work. No provider replay was completed. Test and reconcile the existing screen before considering a new model manager; restoring one key alone does not establish routing coherence [S06, S13].

Cloud reported GitHub, Railway, and Vercel access and confirmation-gated writes, with commits triggering deployment [S04]. These claims need tool and deployed-revision evidence. Cursor remains the developer; direct Cloud-to-Cursor integration is a later option. A manual executor handoff can be bounded and resumable without making Chuck reassemble the reasoning every turn.

## 11 Dialog Frames presentation and Story references

Ordinary conversation is the default. A Dialog Frame is an intentional presentation container with one or more Slides, using the available Dialog width with readable measures and accessible controls. Having a performance or resolved meaning is insufficient to open a Frame [S05].

Cursor reported promote:true gating, preservation of transcript turns, conversational handling of old unpromoted performances, full-width promoted Frames, a Conversation return control, return on next send, and filmstrip insertion only for a promoted beat while already on Stage. Promotion tests reportedly passed; live API availability prevented runtime verification.

Cursor's explanation assigned Story-significant promotion to Rendr. The authoritative correction is Human or Lead directs whether to present; Rendr composes how and may recommend presentation. Audit 0.2 finds promotion authority in committed code; the supplied response does not detail its exact symbols. Do not reopen the authority design solely from the older report. Verify the actual Human/Lead authoring path and live behavior, retaining the original authority contract [S13]. Story significance, Point keeping, Frame display, Story Capture, and Stage insertion must remain separate decisions.

The Already in Progress Story reportedly existed in Domain.settings.stories with shaping status and activeStoryId, linked to Be.Speak.Become by a capture referencing a Lead message rather than direct dialogId. Stories navigation failed to refresh after story.save, and a repair was reported [S08]. Frame appearance, saved Story, Document change, and Stage filmstrip are not interchangeable evidence. Preserve reference identity and reload behavior.

Earlier visible project context mentions Add to Story, Take to Stage, Take Story to Stage, reorder/remove/Forward, and capture without copying. Treat these as inherited requirements requiring verification rather than current proven controls. The user-facing meaning of Story must be reconciled with its existing stored references, not replaced by a new Media Story database type merely because the experience has a new name.

## 12 One Board and Stage continuity

The recent locked semantic is Dialog → Stage → Present. One Board holds a stable Place and one Work in Hand. Composer remains available as the human instrument; Chronicle supports the same work. Selecting work changes the subject, not the mode [S09].

The older screen audit explains why orientation broke: Home shell, loaded KE3P anchor Domain, Realm Board, selected Be.Speak.Become, Where are we arrival reading, stored Finding the Plot and Kip presences, Cast, and Universal Nav were independently current. Chronicle selected its subject through a fixed priority of selected IDs, while Stage used a separate pass and storage. All could be technically truthful and still fail to give one understandable Place and Work [S11].

The screenshot set shows those alternate experiences, including a useful Dialog, a Story filmstrip, an arrival reading, persistent competing Story/Perform controls, and the later clearer Stage layout. The cinematic Composer image is a design mockup, not proof of runtime implementation [I01–I10]. Screenshots establish appearance at capture time, not today's behavior, permissions, or persistence.

### Existing code seams reported by Cursor

UniversalBoardContext resolves selected work. workspaceSurface switches dialog and stage. KeeperDialogFrame hosts the useful transcript and KeeperStageCanvas replaces the center for Stage. selectStageTruth separately chooses arrival versus stored Story/filmstrip. Perform/openStageRoom changes surface without arrival, often selecting the unrelated stored filmstrip; an adaptive/mobile effect can close non-arrival Stage [S09].

### The four agreed continuity corrections

Stop subject selection from invoking the leave-Stage logic. Remove the adaptive/mobile rule that closes Stage solely because it is non-arrival. In Stage, compose the current work; Where are we may remain a no-work arrival fallback. Use one Dialog | Stage Board control and retire competing Perform/Performance and Stage Cover/Story/Conversation peer navigation [S09].

Do not redesign Dialog, discard the new Stage composition, add a new parent Board, or add Present to navigation before its contract is implemented. Presentation/Workshop was an earlier relationship to one Stage; later navigation decisions remove it as competing chrome. Cursor must preserve its useful behavior where needed without reintroducing it as another Place or destination.

Audit 0.2 finds the four continuity corrections largely present at be18e65d: one Dialog | Stage control, selection does not leave Stage, and no non-arrival-only close rule found. This is source evidence, not browser proof. The authorized next action is replay, not another continuity redesign. The decisive replay is Finding the Plot → Dialog → Stage → Dialog → Stage, retaining KE3P and Finding the Plot throughout. Test selection while in Stage, mobile arrival, direct links, and reload. No-work orientation is a fallback; it must not displace selected work.

## 13 Rendr Stage composition and performed media

### Existing bounded composition

The source reports an existing StageComposition model and deterministic composeStagePass. The missing seam was that Rendr neither received the Reading nor emitted a model composition that Stage could apply. A subsequent build reportedly added stage.composition.propose, validation, storage, receipts, restore, and shared composition across Presentation and Workshop [S08]. Audit 0.2 confirms sourced Stage composition in code and passing grammar tests; live Cast-directed behavior was not verified.

Kip selects the existing truth/Reading and directs the brief. Rendr arranges only that Reading. Keeper validates and applies or retains the predecessor. Reported grammar: groups stack, row, split, hero; emphasis primary, support, trail; cite gesture place or text; dress title display/quiet/none, field paper/stage/clear, density open/close, motion still/arrive, and span center/room.

No arbitrary HTML/CSS, invented sentences, new Theatre sheets, or new Story Slides belong to that narrow slice. Missing Reading cites are dropped or rejected; unsupported tokens are refused; needs-grammar preserves the current arrangement. Restore clears the stored arrangement for the truth and returns to the deterministic pass. Cloud may extend the instrument after a justified grammar need, rather than hand-designing every screen.

Stage composition authority is not yet whole-product authority. Chronicle hierarchy/density/layout/motion, Composer, curtains, Domain surfaces, and Realm/product scope need explicit bounds if developed. The proposed surface/authority/scope dimensions are preserved directions, not a completed permission system [S03, S09].

### Media Story and Living Moments

A Media Story is an actual performed, navigable experience of an existing Story. Frames are narrative beats; motion, imagery, sound, typography, space, and interaction carry meaning. Story Path offers a complete sequence; optional side paths provide detail and provenance without breaking it. When asked for a Media Story, deliver the artifact rather than prose describing it [S07].

keeper_is_media_story.html was reportedly delivered as a self-contained nine-scene CSS/JavaScript prototype with buttons, keyboard, touch, transitions, and a drawer. Its original file is not attached here; this review read its summary, not the original implementation. The Trail We Leave is another described exemplar, not a reviewed source artifact in this packet.

Frogmore Living Moments preserves the source image and selectively gives meaningful objects identity, state, behavior, memory, and agency. The prototype uses lightweight browser techniques rather than a full Theatre.js/Three.js implementation [S02]. Three.js supplies space; Theatre.js supplies time/performance; Keeper supplies meaning, identity, relationships, permissions, and memory. They are optional instruments, not prerequisites to completing basic public capture.

Preserve progressive fidelity: begin with original media and one to three meaningful objects, subtle atmosphere, one state/behavior, and a meaningful link. A Moment may remain still; a Stage is an expression of it rather than a replacement. Full living worlds, advanced Realm performance, and broad natural-language choreography remain staged expansion unless the chosen MVP slice needs them.

## 14 Requirement register

Stable OT identifiers are preserved. The table combines retained audit findings with subsequent S15–S19 updates. Untouched findings retain the original audit scope; changed rows reference the current records in section 0. No row certifies production solely from source evidence. S14 authorizes the action but does not prove execution. Use the separate dimensions in section 2 and the active records below rather than treating every row as simply Partial.

| ID | Requirement | Current code evidence or limit | Next bounded action |
| --- | --- | --- | --- |
| OT01 | Public Domain and navigation | Guest Cover Moment Feed Diagnostics exist; full navigation untested | Walk KE3P visitor path |
| OT02 | Draft autosave keep and proof | Capture and Feed surfaces exist; no full visitor replay | Run draft autosave keep Feed reload |
| OT03 | Anonymous draft and claim | Anonymous capture/Feed tested then deleted; claim diagnostic committed; signed-in proof open | Verify ownership and old-key rejection with signed-in session |
| OT04 | Singular auth and convergence | Grouped Partial; detailed auth evidence absent from response | Retain requirement; verify login and claim continuity |
| OT05 | v0 themes and Design Frame | Grouped Partial does not establish Design Frame implementation | Recover exact existing starts before change |
| OT06 | Diagnostics pipeline | Claim diagnostic corrected in abf1b7a per report; full live pipeline open | Replay capture claim ownership and Feed/reload |
| OT07 | One Board stable Place Work modes | Four corrections largely present in source | Replay Finding the Plot sequence |
| OT08 | Current work Stage and mobile continuity | Selection does not leave Stage; no non-arrival close found | Test mobile selection deep link and reload |
| OT09 | Natural Composer | Composer exists in committed code | Verify natural contextual speech |
| OT10 | Lead Human Frame promotion | Promotion authority exists in code | Verify ordinary vs promoted live turn |
| OT11 | Story capture, attachments and handoff | Story save/source; attachment text persistence observed; follow-up/reload open | Verify source identity retrieval and Document handoff |
| OT12 | Sourced Rendr composition | Code and grammar tests present | Live propose apply refuse and Restore |
| OT13 | Point status and placement | Proposals exist; conversational yes rejected in supplied exchange | Inspect assent binding; preserve proposal with receipt/reload |
| OT14 | Review Reorganize vs intake | Reorganize path exists | Verify review apply and existing intake boundary |
| OT15 | Selective Jev Living Discovery | One-Point gate code; 12 tests passed; Frogmore turn absent | Recover or faithfully reproduce case; do not invent historical logs |
| OT16 | Provenance and receipt visibility | Receipt seam committed per report; historical false resolution identified | Live receipt/evaluation proof and truthful narration |
| OT17 | Agency Core roles | Ceox core added in abf1b7a; five read capabilities reported | Verify current ancestry permissions and live role |
| OT18 | Honest Catalog | Paging exists in committed code | Verify counts discovery and actual body reads |
| OT19 | Objective and Cast direction | Committed room resolves without evaluation | Complete existing bounded room repair |
| OT20 | Receipt and direction correlation | cf16e1e8 forwards receipt-only contributions per report | Run integrated correlation and receipt cases |
| OT21 | Evaluate retry and honest stop | Repair commits and failed-read rule reported; live closure open | Verify evaluation cap retry refusal failure on running paths |
| OT22 | Prohibitions and relevant actions | Both phrases protected per report; specific assent proposal skipped | Fix context-bound consent without weakening prohibitions |
| OT23 | Unfinished ownership and resumption | No Draft assignee; written handoff approved temporarily | Persist discoverable handoff and verify reload |
| OT24 | Model assignment operations | Model Config screen exists; no provider replay | Inspect effective routing and run real configured turn |
| OT25 | Completion deployment verification truth | HEAD/origin 1ebba046; running repair markers/text; deployed SHAs unknown | Record precise revision evidence and acceptance separately |
| OT26 | Present release contract | ?frame=present, optional journeyId; release controls absent | Return minimum audience/access/destination/share/release contract |
| OT27 | Public MVP | Not run; unverified | After preceding repairs run full KE3P visitor loop |
| OT28 | Operational Truth in Keeper | Seeded shell; Points removed; source attached; maintenance unproven | Verify private access and one requirement Document slice |

### Historical development records — October 8 directive; updated evidence in section 0

**Agency receipt and evaluation repair — OT16 and OT19 through OT22.** Product contract is established and finishing the existing seam is authorized. Committed implementation at be18e65d has the defect. Uncommitted candidate code covers direction correlation, proposal rejection as completion and retry up to cap 2; useAgentDialog still drops empty-prose results and does not forward specialist receipts into the Lead present pass. Shared tests report 29 passes across several groups, not a certified full Agency replay. Candidate is not deployed; production source SHA remains unestablished in the response. Live replay has not been reported. Cursor owns the code correction and evidence. Next action: complete the seam, run deterministic tests and live prohibition/objective cases, then report the named commit and environment. No production deployment in this pass.

**Stage continuity — OT07 and OT08.** Stable Place/Work/mode is approved. Source at be18e65d largely matches the four corrections. No additional continuity candidate repair is established by the audit. Web tests did not run because jsdom is missing; browser replay did not occur. Production web revision is unknown. Cursor owns the replay and any narrowly evidenced fix. Next action: Finding the Plot Dialog → Stage → Dialog → Stage, selection while staying on Stage, mobile behavior and reload. Passing source inspection does not close browser acceptance.

**Anonymous claim diagnostics — OT03 and OT06.** The claim and ownership objective remains approved. The audit finds a checker/API mismatch: successful claim returns a kept Moment without ownerId, but diagnostics requires ownerId. No repair or replay is reported. Cursor owns correcting the diagnostic against the actual API contract and verifying ownership using appropriate evidence, followed by anonymous draft/autosave/keep/claim/Feed/reload. Removing an assertion without establishing ownership is insufficient.

**Ceox core — OT17.** The advisory/challenge role and use of the existing versioned core shape are authorized. Ceox has no platform core in audited HEAD; Kip, Cloud and Rendr do. No added core, commit or role replay is reported. Cursor owns the bounded implementation and role/capability checks. Do not expand permissions for parity.

**Present — OT26.** Audience/access/destination/share/release semantics remain established. A Present frame exists; audience, sharing and release capability are absent in the audit. No new release implementation is authorized solely by this finding. Cursor’s next deliverable is the concrete minimum release contract, reusing existing paths where possible, before extending it. Product release and deployment remain pending.

**Operational Truth guide — OT28.** Chuck chose the dedicated Keeper Operational Truth Dialog in KE3P, full text in Library, linked OT records as proposed Points, initially restricted to Chuck and not public. At audit time only the repo file and a short Becoming Together Gloss existed. No subsequent import or permissions result is reported. Cursor must verify the access boundary before importing, retain full source and IDs, and verify human/Cast retrieval and reload. Importing proposed Points must not mark implementation Verified; accepting product meaning must not certify runtime behavior.

**Unfinished work ownership — OT23.** A durable written handoff is authorized for the present slice. It must record objective, owner, status, blocker, next action and completion evidence, be discoverable, and survive reload. Drafts currently lack a true assignee. No assignee migration is authorized; automated resumption remains unverified. Cursor must show the existing structure used and test retrieval before treating ownership as operationally complete.

**Model operations — OT24.** A model Config screen exists. Its presence resolves the earlier possibility that no surface existed, but does not establish assignment coverage, provider readiness or fallback behavior. No provider replay is reported. Cursor must inspect the existing screen and effective routing rather than invent a replacement manager.

### Parked work register

| ID | Preserved direction | Boundary or trigger |
| --- | --- | --- |
| PK01 | Multi Point discovery and Dialog harvest | After selective one Point discovery is trustworthy |
| PK02 | Per agent running Gloss and perspective | Current Gloss and SOLE do not supply it |
| PK03 | Sentence or span addressability | Prefer existing message anchors before new entities |
| PK04 | Pending as recognized but not yet become | Requires explicit semantics and rendering decision |
| PK05 | Rendr Chronicle composition | Bounded controls after preserving existing Stage grammar |
| PK06 | Rendr authority across surfaces and scopes | Requires specific permission and truth boundaries |
| PK07 | Dynamic Jev posture recommendation | No new posture engine or mandatory taxonomy implied |
| PK08 | Cross Domain relay and relayed provenance | Deferred permissions and disclosure design |
| PK09 | Full Theatre Three spatial performance and Living Worlds | Use only where a chosen experience justifies it |
| PK10 | Emergent chatter relationships and object promotion | Recognition does not authorize durable mutation |
| PK11 | Composer suggestion reference chips | Discussed not reported built |
| PK12 | Direct Cloud Cursor integration | Executor handoff can remain manual and resumable |
| PK13 | Expanded Board and Props authoring | Earlier memory only requires source recovery |
| PK14 | Keep as Trace and richer provenance modes | Earlier context only reconcile before commitment |

Parked is not rejected and not current sprint scope. Each return must identify the existing contract, evidence, dependency, and intended acceptance result.

## 15 Authorized development and verification handoff

Audit 0.2 has been returned and Chuck confirmed sending the response recorded as S14. This section replaces the initial read-only reconciliation request with the bounded execution instructions now authorized. It does not claim that Cursor has completed them.

### Scope and authority

Use KE3P as the single acceptance Domain and Frogmore as the Living Discovery case. Preserve useful Dialog/Stage surfaces and existing architecture. Keep Config in Chronicle provisionally, with discoverability and permissions tested. Add Ceox’s core in the existing versioned shape without permission expansion. Use a durable written handoff for temporary ownership. Prepare the chosen restricted guide home and proposed OT records only after verifying access.

Keep changes reviewable in bounded commits. No production deployment is authorized in this pass. If a local test or browser run needs unavailable dependencies, credentials or environment access, report the actual blocker and preserve its scope. Do not fake a live replay using unit-test success or infer a production SHA from a process timestamp.

### Execution sequence sent to Cursor

1. Finish specialist receipts through useAgentDialog into the Lead present pass, including receipt-bearing results without prose. Verify current turn/direction correlation, evaluation before resolution, retry within cap 2, honest failure and both do not create and not to create prohibitions. Unrelated Point/Treatment proposals must not satisfy an investigation.
2. Replay Finding the Plot in KE3P across Dialog → Stage → Dialog → Stage; select another work while remaining on Stage; reload; include relevant mobile behavior. Fix only evidence-backed continuity defects rather than redesigning implemented mode behavior.
3. Correct claim diagnostics against the actual API success contract. Verify ownership using appropriate evidence, then run anonymous draft → autosave → keep → claim → Feed proof and reload.
4. Reconcile the existing Present frame with minimum audience/access/share/release requirements and return a concrete release contract before extending it.

Ceox core and guide assembly are also authorized bounded work, but must not distract from the primary sequence or mix unrelated changes into its commits. Required completion evidence remains separate for each requirement.

### Required response and continuity record

For each changed OT ID return product intent/approval, committed implementation and revision, local candidate changes, deployment evidence, deterministic tests, live behavior/reload, remaining gap, owner, blocker, dependency, next action and evidence references. Retain Unknown and Not run rather than replacing them with optimistic summaries. If Partial is used, expand it into these dimensions.

Locate existing implementations before changing them. Names to reconcile include useAgentDialog, runProgressiveCastRoom, castRoomTurn.ts, CastRoomEvent.refs, parseCastRoomEvents, projectCastRoomTrail, CAST_ROOM_CONTRIBUTION_CAP, detectPointIntent, shouldRunPointAskFollowUp, PLATFORM_AGENCY_CORES, loadDialogDocumentForAgent, preserve-discovery@1, UniversalBoardContext, workspaceSurface, selectStageTruth, openStageRoom, composeStagePass, stage.composition.propose and resolvedMeaning.ts. Use current equivalents where symbols have changed.

A completed correction requires its own exact evidence. Mocked tests prove a rule within their fixture. A source inspection establishes code presence or absence at its commit. A live replay establishes the particular environment/user flow tested. A production release requires named deployed revision and visitor evidence. None automatically establishes the others.

### Boundary against scope drift

No requirement disappears without an explicit superseding decision. PK01–PK14 remain parked. A code mismatch cannot by itself amend product authority. A new noun, durable subsystem or parent surface requires analysis of why existing structures cannot serve the agreed work. Update this guide as evidence arrives rather than keeping the outcome only in chat prose.

## 16 Acceptance evidence for MVP closure

Every test needs an environment, commit, actor, starting state, expected consequence, actual outcome, durable object/receipt IDs where relevant, screenshot or log evidence, and reload result. Mark environment failures Blocked rather than passing or failing product behavior.

### A Public arrival capture keep and claim

A first-time visitor opens /d/:domainSlug, understands the Domain, finds Cover/Moment/Kip/allowed Config/Diagnostics, creates an anonymous draft, changes it, waits for autosave, keeps it, and sees scoped proof. Reload and return to Cover preserve the kept material. Authenticate and claim through the intended path without duplicate identity, lost content, or cross-Domain association. Repeat a relevant failure case and inspect useful diagnostics [OT01–OT06, OT27].

### B Stable Place Work and mode

The audit found these corrections in source; the browser replay is still required. Select Finding the Plot in KE3P, switch Dialog → Stage → Dialog → Stage, then select another work while remaining in Stage. Place and selected work remain coherent across center and Chronicle. Repeat desktop, adaptive mobile, deep link, and reload. With no work selected, Where are we is permitted; with work selected it does not replace that work [OT07–OT08].

### C Conversation and directed presentation

Ask a simple question: it stays conversation. Develop a meaningful insight or explicitly ask for presentation: Human or Lead
Cursor · Universal UX code-truth diagnostic (2026-08-31)

Gloss-only. Not a build lock. Diagnostic of what Keeper already has — no implementation, no new object.

The hypothesis under exploration:

Stage — Presence: What is here?
Frame — Perspective + Action: How am I experiencing or working with this?
Dialog — Conversation: What are we thinking and saying about this?
Chronicle — Continuity: What happened, changed, and became?
Composer — Direction / Reach: What do I want to bring into or do with this?

Findings from the live tree (shared types, Prisma, Universal Board, Stage, Chronicle, Composer, Present):

1. Do not invent a new object to fill Stage→Frames.

The coherent experience already presented on Stage is StageStory (`Domain.settings.keeperStage.story`, `packages/shared/src/keeperStage.ts`). It is not a Prisma table. It sequences Slides (`domain_cover` Root + `text_slide` beats), not V0 Frames. One story per named Stage. Lead writes it with `stage.story.layout`.

If “Frame” in the hypothesis means an actionable view of a canonical Keeper object, that role currently lives in Chronicle Focus (`KeeperPresence` → `*FocusPresence`), not on Stage. Stage slides may carry `source: { kind, id }` metadata (live | point | moment | path | keeper | journey) but still render as text. Re-Center path: extend StageStory / SlideType before inventing a container.

2. “Frame” currently names four production layers that were never merged.

- V0FrameKey + `Domain.frame_json` — URL-routed experience surfaces (cover, journeys, present, …).
- Prisma FrameInstance + FrameConfig — Design Board / studio cells with `entityType` + `entityId` + `orderIndex`.
- Stage slides / SlideTypes — filmstrip cells (`domain_cover`, `text_slide`; Cover also uses `journey_invitation`, `companion`).
- Legacy FrameRenderer + Board Studio — Agent/Journey/People boards; declining.

A 2026-08-30 lock in the composer README said Frame = the room (Stage / Present) and Slide = one filmstrip cell. The hypothesis wants Frame = perspective + action. Those two uses cannot both stand without a vocabulary decision.

3. Stage is a room on the current Board, not a Prisma Stage, not `?board=stage`.

Composition persists as `KeeperStageComposition` on `Domain.settings.keeperStage`. Presence is a reference (`StagePresence`: id, kind, objectId, title, x/y unused in UI, contextualRole/direction for agents). Kinds: agent | dialog | draft | journey | keeper | moment | library. Reach UI can actually bring dialog, draft, keeper, library, agent. Journey and moment are schema-legal but not in nav-index. Path is a story source kind, not a presence kind.

The screen shows the filmstrip, not the objects. Objects live in Reach / Chronicle. Talking in / Working on already split conversation from work subject (`packages/shared/src/talkingInWorkingOn.ts`). Selecting a Stage presence sets Working on and keeps Talking in, except Dialog select *is* the conversation. `useBindStageDialog` auto-binds Talking in when a Dialog is already on Stage.

4. Journey and Path are the narrative hierarchy, not the Stage composer.

Prisma: Domain → Keeper → Journey → Path → Moment. Journey.`forward` is intro prose, not Stage Forward (filmstrip advance), not Dialog `forward_title` (Document North Star). Present (`PresentFrame`) flattens a public Journey into one synthetic canvas Frame (`mapPublicJourneyToNarrative`) — it does not play StageStory. Document `drafts → kept → presented` is Dialog status, not a Story table.

5. Dialog is not required to be a separate workspace mode.

`workspaceSurface: 'dialog' | 'stage'` only swaps the center panel. Composer and session persist. Dialog.context is `{ board, frame, subject }`. Contextual Dialog around another object is schema-possible (`subject`) and Talking in / Working on already express the split; there is no first-class “spawn a Dialog for this Journey” UI.

6. Chronicle is not continuity-first today.

It is the right-panel body of the selected subject: inspection, Config, Acts, Document authoring, overlay tools (Reach, Theme), plus a Dialog History tab. Canonical history is split: `ChronicleEvent` (Dialog-scoped), `RealmFeedEvent` (person-scoped arrivals), `kip_draft_versions`. `Activity`, `keeper_activity_log`, `keeper_revisions` exist in Prisma and are unused. There is no scoped continuity model at Realm / Domain / Stage / Agent.

7. Composer Reach already overlaps a subset of Nav.

Reach discovers dialog, draft, keeper, library (nav-index) and agents (cast fetch). Nav additionally owns: three-pane taxonomy, board switching, create Acts, sessions, Config entities (keys, capabilities, integrations, glossary, board defs), Journey/Path/Moment hierarchy, Chatter vs named Dialog. Open Stage is Realm-nav gated. Nav select currently leaves Stage (`platform-nav`).

8. Domain / Realm / Agent are structurally different from content objects.

Domain is the tenant shell — owns `frame_json` and `settings.keeperStage`. Realm is a Board lens (`REALM_BOARD_DEF`), not a Prisma model. Agent (`kip_agents`) is cast/capability; on Stage it carries contextual agency without redefining Base Agency.

9. Rendr does not render Stage. Theatre does not own the story.

Rendr is an agent slug plus `presenceTreatment` copy on board defs. Theatre.js plays motion sheets (`cover | slide | media | journey | moment`) — Stage filmstrip uses `slide`. Guest experience today: Cover Forward → PresentFrame → flattened Journey, not StageStory replay. Composer README already notes: Present does not yet play the Stage story.

Product questions before any contract work (not recommendations):

- Which of the four Frame meanings is the hypothesis using?
- Is StageStory the experience, or should object-view Frames inhabit its cells?
- Does Chronicle keep inspection, or become history, with Frames taking perspective + action?
- One StageStory per Domain forever, or many stories on one Stage?
- Does public Present play StageStory, or remain Journey-flatten?

Re-Center: current truth (this diagnostic) → gap analysis → contract design → reuse/extend StageStory / SlideType / Talking in–Working on / ChronicleEvent before inventing.

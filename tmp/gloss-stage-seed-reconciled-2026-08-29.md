Cursor · Stage seed reconciled with code truth (2026-08-29)

Gloss-only. Not a build lock. Chuck brought a Stage seed for Keeper, Cloud, and Cursor. This is Cursor’s reconciliation of that seed against the repository — current truth, not a new Stage architecture.

Keeper Principle held: Stage owns presence. Keeper owns truth.

What we locked as the working contract
Chuck’s Stage seed is now the conversation’s product/architecture intent. Workspace modes are Dialog and Stage — Stage is not Board 2.0, not a fourth shell panel, not a duplicate object store. Composer directs reach and creation. Rendr may later express Stage as interactive story. Theatre.js stays presentation, not semantic truth. More Keeper, Less Code: build capabilities in code; build experiences increasingly in Keeper.

Code truth — what already exists
The Keeper Stage vertical slice is real and start-from-here, not greenfield.

Composition lives as Domain.settings.keeperStage: version, slug `keeper`, title, selectedPresenceId, presences[]. Each presence is kind + objectId + title + canvas position, plus Stage-owned contextualRole and direction for agents. No clone of the underlying object.

Workspace: Nav · Workspace · Chronicle. Switching Dialog ↔ Stage replaces the center message zone with KeeperStageCanvas. Composer reach is KeeperComposerSheet (Here / Cast / Recent / search). The Dialog input floor remains AgentComposer. A Turn can be sent while Stage is open. Stage composition is injected into the agent prompt when presences exist.

Talking in / Working on exist as a separate coordinate type. Selected is selectedPresenceId. The product split (Talking in = context, Working on = target, Selected = inspection) is named in code but not fully enforced — selecting a presence still drives board/work targeting, and an agent-as-Working-on may not reach the server prompt.

First proof (Kip + Finding the Plot) can be done by hand today if those objects exist in the Domain. Nothing auto-seeds them.

What is not built yet — do not invent ahead of review
Domain Stage as a distinct experience. Only slug `keeper` exists, inside Universal Board.
Permanent inviting-Domain / originating-Domain relationship. Invitation tables exist for membership; provenance of “who first brought this person to Keeper” does not.
Composer as creation director (WHO / WHAT / WITH / DIRECTION / OUTPUT). Reach exists; directing native Keeper outputs beyond chat is not yet a Composer contract.
Rendr building/deploying Stage as full media. Theatre.js is Present/Chronicle motion only.
Stage Contract and Cast Assignment as new primitives. AgentContract, DomainAgentPolicy, DialogCastMember, kipMode, and Stage contextual role already exist as parallel systems and are not wired together.

Guardrail from the seed, restated: Current truth → gap analysis → contract design → reuse or extend → implement. Do not create new Stage/Cast governance until Cloud reviews existing Agent governance and Cloud and Cursor reconcile that review.

Recommended next work (options, not a lock)
1. Live the existing Keeper Stage proof: Dialog ↔ Stage, Composer bring Kip + Finding the Plot, inspect Agency, send a Turn, confirm the agent sees the composition. Learn from the lived surface before Domain Stage.
2. Close the coordinate gap: selecting a presence must not silently retarget work. Talking in / Working on / Selected / Present need to behave as the seed states.
3. Cloud review of Agent governance (persistence, resolution, capabilities, kipMode, role/direction, prompts, enforcement) before any Stage Contract or Cast Contract work.
4. Only after that: first meaningful Domain Stage — calmer than current Boards, composing from Domain Board where useful, not mirroring it. Invitation + permanent inviting-Domain is a related journey (Chuck → Sheyenne via Chuck’s Domain into livecchi.biz), not the Stage surface itself.

Cursor will implement from this seed and from reconciled code truth. Domain Stage is an active direction, not a HOLD — and not a greenfield rewrite.

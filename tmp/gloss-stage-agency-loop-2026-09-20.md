Cursor · Stage agency test — why the loop stopped at Summary (2026-09-20)

Gloss-only. Not a build lock. Code-truth after the first Stage agency test. No Stage redesign.

Intended loop: Chuck directs Keeper → Kip directs Cast → Cast works → Kip decides/acts → Stage changes.

What ran: Direction → Cast Performance → Summary. No Stage mutation.

Two consult mechanisms exist and must not be conflated.

Mechanism A — Composer Cast chips (client). useAgentDialog runs cued slugs in parallel, then Lead synthesizes. Empty chips means Lead only. When directorConfig is live, every run (Cast and Lead) gets agentContext.skipDelegateConsult = true. runAgent then adds delegate.consult to skipActionTypes. The skip message is always “delegate.consult blocked in nested cast run (loop prevention)” — including when this is not a nested Cast.

Mechanism B — Lead emits delegate.consult. Nested Cast run with skipActionTypes: delegate.consult only. Follow-up after all-read-only actions can then emit writes. On directed Universal Board this path is currently dead because skipDelegateConsult is always true whenever directorConfig exists.

First attempt: Cast did not run. Kip tried Mechanism B. skipDelegateConsult skipped the action. Cast never started. The nested-cast copy is the skip label, not proof of a nested Cast.

Second attempt: chips were on (Rendr, Ceox, Cloud). Mechanism A ran. Distinct replies. Cloud asked for the attachment. Kip synthesized and recommended next. No stage.story.layout.

What Cast receives (Mechanism A): same runOpts as Lead — domain, dialog, attachments, agentContext (workspaceSurface: stage, skipDelegateConsult), ephemeral (no session). Environment: that member’s resolveAgentEnvironment + keeperStage from Domain.settings. User prompt is the human message relayed, not a Kip-directed task. Actor is cast → stage.story.layout skipped (advise only).

What Cast would receive (Mechanism B, if unblocked): fresh environment for that member, dialog/stage objects from domain, no frontend agentContext, no attachments. Kip’s question, not the raw human turn.

What Kip receives after Mechanism A: human direction stays the user turn. Orchestration context lists real replies, cards, and action receipts. On Stage, resolvePerformanceMeaning = true, which injects: emit resolvedMeaning; “Do not emit stage.story.layout for this. Expression is not your job this turn.” Lead Judgment says do not summarize — find the plot — as spoken response, not as filmstrip write. Card renderer: after Cast, prose-only unless a write receipt exists.

There is no intermediate-vs-complete Turn flag. One human send = Cast (if cued) + one Lead model call. Follow-up exists only if that Lead envelope is all read-only actions (or draft-deferral). Mechanism A Lead typically emits no actions, so the Turn ends.

Could Kip have had Rendr draft the opening and applied stage.story.layout this Turn? The action exists (Lead-only, golden path, writes keeperStage.story). On Mechanism A Stage it is explicitly forbidden. Kip cannot re-delegate (skipDelegateConsult). Rendr cannot emit layout. Stage prompt also says presence does not require mutation. Document review has an “emit this turn” obligation. Stage layout does not.

Why it stopped: combination. Architecture (chips vs Kip-direct; one Lead pass; skipDelegateConsult). Prompt/Lead contract (resolvedMeaning instead of layout; mutation optional; Judgment as speech). Not a missing handler.

Smallest test of the intended loop (Kip directs Cast, then acts):
1. Set skipDelegateConsult only when chips actually ran this Turn — restore Mechanism B when chips are empty.
2. Pass attachments (+ workspaceSurface) into Mechanism B nested runs so Cloud sees the file.
3. Do not add a Stage redesign. If testing via chips (Mechanism A), also lift the after-Cast “do not emit stage.story.layout” line and add a layout-this-turn obligation when the human asked to compose the opening — same pattern as documentDirection / castPromisedPointWrite.

Decision for the cast: which mechanism is the Stage agency test — Kip-directs-Cast (B), or Composer chips then Lead (A)? The first attempt assumed B. Current directed board only completes A, and A forbids the Stage write.

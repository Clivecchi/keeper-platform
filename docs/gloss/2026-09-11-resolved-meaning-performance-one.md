Cursor · Resolved Meaning Performance One (2026-09-11)

Gloss-only / not a build lock until Chuck reviews. Does not create Points. Does not implement.

Chuck locked: Composer directs Life. Kip resolves what the performance meant. Rendr resolves how it should be experienced. Keeper renders. Stage is the Set. The Frame is derived expression, not a clone of Keeper truth.

Minimum Performance One contract (reuse → connect → minimally extend):

`resolvedMeaning` is a new optional sibling on the existing Lead `agent_output` envelope — same family as `card` and `keepingChoices`, not a SemanticOutput system. Smallest useful shape: `claim`, optional `because`, `about[]` (refs, not copies), `performedBy[]` (slugs that delivered). Spoken prose, Cast transcript, advisory card, keeping offers, actions, and Stage state stay outside it.

Kip emits it on the Stage + Cast-consult Lead turn, in the same envelope as `response`. Do not parse `message.content` back into meaning. If Lead does not emit it, skip Rendr. Honest miss.

After Lead persist, a server-side ephemeral Rendr handoff receives only Resolved Meaning + compact Set (`keeperStage` + talking/working). Not `castVoices`. Not the transcript. Not `message.content` as a source of meaning. Rendr returns 1–3 `text_slide` beats (`stage_expression`). It does not call `stage.story.layout` (Lead-only, replaces the story, would let Rendr decide meaning).

Keeper appends those beats onto `Domain.settings.keeperStage.story` with `source: { kind: 'live', id: leadMessageId }`. Existing Stage filmstrip already prefers persisted story over Now-prose. After send, Stage already reloads.

Persist with the turn: `metadata.resolvedMeaning` and a small `metadata.stageExpression` stamp (`slideIds`). The Frame is the appended slides. Rendr’s run stays ephemeral. Composer’s directing act remains a future seam.

Proof: Finding the Plot on Stage. Cue Cast. Lead resolves. Rendr expresses. Filmstrip gains a beat. We watched them perform, and the Stage changed because they did.

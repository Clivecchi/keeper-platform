Cursor · Keeping Choice contract (2026-09-02)

Gloss-only / not a build lock. Design only. Does not create Points.

Chuck accepted the code-truth report. This is the proposed contract for the smallest envelope extension.

Locked distinction

Action — authorized capability executed this turn.
Proposal — concrete future-state change waiting for Accept/Apply.
Keeping Choice — recognized keep-worthy meaning, nothing created or staged. Selection starts a new Lead turn against current Keeper truth.

Contract (smallest)

Envelope sibling, not an action type and not a card:

`keepingChoices?: [{ id?, label, direction, meaning?, about?, refs? }]`

Keeper fills source after persist (`messageId`, `sessionId`, `dialogId`, actor). The model must not invent those ids. No required `kind` field. “Keep as X” is label language, not a platform type.

Runtime never executes `keepingChoices`. Actions still run. Choices only persist.

Click reuses Composer `sendMessage` + `agentContext.keepingChoice` (same pattern as `draftDiscuss` / `glossAnchor`). Visible line is the label. Model input is the direction plus source. Current Working on / Talking in / allowlists / Cast-Lead gates apply to the new turn. No new engine.

Learn from selections, not offers. Stamp the choice on the originating message and on the new user message metadata. Do not `sole.save` automatically.

Story-builder coexistence (semantic, not phrases)

If the human already directed a known keep act, emit action/proposal. The card is consent.
If Agency recognized undirected keep-worthy meanings, emit keepingChoices and create nothing for those meanings.
A turn may contain both. Do not keyword-route.

Still open for Chuck

Re-select the same chip later? Cast-offered chips in v1? Max per turn? Whether the selected line appears as a user bubble or a quieter stamp.

Recommended first slice after approval: persist + render Lead chips + click → existing Lead turn. No SOLE. No Dynamic Kinds. No Cast emit required.

Cursor · Agency — UI cards, trace, behavior knobs (2026-08-22)

Gloss-only. Not a build lock. Does not create Points or mutate the Document.

Chuck’s “Finding the plot” turn (review / reorganize the Document) shows Agency as the right frame — not Agent covers, not an Agent Board rebuild.

Observed: Cloud’s voice card painted the raw agent_output JSON envelope. Kip synthesized and used a keeper-card (Look / Open / Next Step). Rendr’s habit is markdown/prose. Chuck notes agents may not actually be able to reorganize the Document — and still the responses are bad. He wants: (1) Agency, (2) a trace of what caused the reply, (3) easier behavior updates than Agent Board, (4) UI responses as the frequent form.

Code-backed causes:

- Keeper requires models to emit a JSON envelope internally, then unwrap response + optional card. The sanitizer that hides leaked action JSON explicitly allows agent_output through. If unwrap fails or the envelope is nested inside response, Dialog shows machine JSON.
- Cast voice cards are text-only (extractAgentReplyFromRunResult → castVoices.content). A Cast card, if emitted, is discarded. Lead metadata.card is what Kip’s UI box uses. That is why Kip looks like the only one “using UI.”
- Rendr’s voice prompt says speak in prose; never paste the envelope. Prose without a required card becomes markdown essays.
- “Reorganize the Document” has no first-class apply action. draft.update can patch structure; there is no accept-able reorganize proposal. Agents essay because the capability is missing and nothing requires a card that says so.
- Thinking Space traces completed actions. It does not trace: envelope parsed, card present, document in focus, cue/consult fired, which behavior source applied. Chuck cannot see the cause, so he cannot tune the cause.

Recommended Agency sequence (not a new framework):

1. Defect — never paint agent_output in Dialog; unwrap nested envelopes; attach Cast cards to voice cards the same as Lead.
2. Obligation — operational Document turns (review, reorganize, propose structure) must emit a keeper-card. If the agent cannot apply the change, the card says that and holds the proposal. Essays without a card are replaced.
3. Agency Trace — one per-turn receipt Chuck can open: focus, cue, envelope, card, allowed/fired/forbidden actions, behavior source. Built from existing receipts + parse metadata.
4. Behavior knobs — 3–5 Agency fields on Agent Chronicle (response shape, document authority, consult honesty) that the pipeline enforces. Do not rebuild Agent Board. Training stays for voice; Agency fields are the update surface.

Product lock candidate: UI card is required for operational turns, including Cast. Prose is for relational turns only.

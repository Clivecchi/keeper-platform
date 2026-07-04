# Gloss Interaction Pattern

## Purpose
Gloss is Keeper's universal gesture for interacting with content at its most precise level. On desktop, hovering over a discrete piece of content reveals a quiet affordance (✦). On mobile, a long-press on that item does the same. Either way, the result is a focused Dialog exchange anchored directly to that specific content — not to the page or board in general.

## Anchoring
Every glossable node carries a stable `GlossAnchor`:
- `entityKind` — draft, moment, library, message, journey, etc.
- `entityId` — UUID or message id
- `nodeId` — sub-part: `image`, `caption`, `card`, `body`, draft point id
- `messageId` — parent chat message when in Dialog stream
- `receiptIndex` — index in `actionResults` for receipt cards

DOM: `data-gloss-anchor` JSON attribute via `buildGlossAnchorDataAttribute()`.

## Inline thread
Gloss conversations persist on the **parent message** in `kip_messages.metadata.glossThreads[]`. They render inside the message bubble via `GlossThreadPanel` — context stays in context.

Gloss runs set `agentContext.glossMode: true` so sub-turns are not appended to the main session transcript.

## Surfaces (MVP)
- Generated image receipts (`ImageReceiptCard`) — card, image, caption
- Moment receipts (`MomentReceiptCard`) — card
- Agent / user message body — whole bubble

## Future
- Phrase-level gloss (`selectionText`)
- Chronicle draft points via GlossSurface (replace floor-composer Discuss stub)
- Journey / Path / LinkedCard nodes

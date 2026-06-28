# Kip Components

## Purpose
Shared components for Kip/agent action receipts and draft proposals. Used by DialogueMessageList and AgentBoardFrame.

## Key Files
- `ActionReceiptCard.tsx` — Renders action execution receipts (success/error/skipped). Draft and moment entity names are clickable when onOpenDraft/onOpenMoment provided.
- `DraftUpdateProposeCard.tsx` — Inline proposal card for draft updates with confirm/reject actions.
- `DraftPointProposeCard.tsx` — Receipt card for `draft.update.propose` Draft Points with Accept affordance.

## Data and Behavior
- `ActionReceiptCard` receives `ActionReceipt` (type, status, message, data). For `moment.create`, `data.moment` contains `{ id, title, journeyId }`; for `draft.create`, `data.draft` contains `{ id, title, kind, key }`. Entity names render as links when handlers are passed. `image.generate` success renders `ImageReceiptCard` with optional **Keep as Moment →** when `onKeepAsMoment` is provided (uses surrounding agent message as narrative body).
- `DraftUpdateProposeCard` receives draftId, proposedPayload, and onConfirm/onReject callbacks (legacy whole-draft propose).
- `DraftPointProposeCard` receives `draftId`, `point` (`DraftPoint` from `@keeper/shared`), and optional `onAccept(draftId, pointId)`.

## Update Log
- 2026-06-28: `image.generate` receipts — `ImageReceiptCard` with **Keep as Moment →**; `onKeepAsMoment` + `contextNarrative` props; Domain Board wires draft+keep via `v0Moments` and opens Chronicle.
- 2026-05-27: Added `DraftPointProposeCard` for point-based `draft.update.propose` receipts (content + type + Accept). Wired in `DialogueMessageList`.
- 2026-04-25: ActionReceiptCard: major uplift. Journey creation (`journey.create/update`) renders as a rich `JourneyReceiptCard` with name, forward, and "Open Journey →" tap target. Path creation (`path.create/update`) renders as `PathReceiptCard` with name and prelude. Moment creation (`moment.create/keep/capture`) renders as `MomentReceiptCard` with title, narrative, and "Open Moment →" tap target. Added `onOpenJourney` prop. All entity cards follow the same styled header chip + body pattern. Generic compact receipt is retained as fallback for other action types.
- 2026-02-18: ActionReceiptCard: added onOpenMoment prop; moment title and draft title render as clickable EntityLink when handlers provided. Added moment.create to getActionLabel.

# Kip Components

## Purpose
Shared components for Kip/agent action receipts and draft proposals. Used by DialogueMessageList and AgentBoardFrame.

## Key Files
- `ActionReceiptCard.tsx` — Renders action execution receipts (success/error/skipped). Draft and moment entity names are clickable when onOpenDraft/onOpenMoment provided.
- `DraftUpdateProposeCard.tsx` — Inline proposal card for draft updates with confirm/reject actions.

## Data and Behavior
- `ActionReceiptCard` receives `ActionReceipt` (type, status, message, data). For `moment.create`, `data.moment` contains `{ id, title, journeyId }`; for `draft.create`, `data.draft` contains `{ id, title, kind, key }`. Entity names render as links when handlers are passed.
- `DraftUpdateProposeCard` receives draftId, proposedPayload, and onConfirm/onReject callbacks.

## Notes and ToDo
- [ ] Consider making sole.save memory card / reflection entity names clickable when IDs are available

## Update Log
- 2026-02-18: ActionReceiptCard: added onOpenMoment prop; moment title and draft title render as clickable EntityLink when handlers provided. Added moment.create to getActionLabel.

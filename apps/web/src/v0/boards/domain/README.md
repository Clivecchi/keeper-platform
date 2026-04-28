# Domain Board

## 📌 Purpose
The public-facing domain overview board. Shows the domain's Feed (kept moments/activity) as the primary content, with Kip available via the Composer at the bottom. Three-column layout: left board/frame nav, center dialog shell, right domain context panel.

## 🧱 Key Files
- `DomainBoard.tsx` — Root board component. Owns Kip conversation state (messages, input, isSending), domain metadata (wordmark, journeyCount, momentCount), and UI state (leftCollapsed, briefOpen, switcherOpen, selectedMoment).

## 🔄 Data & Behavior
- **Left panel**: Collapsible board switcher (Domain / Design / Agent) and frame list.
- **Center panel**: `DomainBanner` at top, then `KeeperDialogFrame` filling the remaining space. `FeedFrame` is passed as `dialogContent` to `KeeperDialogFrame` so it renders inside Zone 2 (the scrollable surface). The Kip `AgentComposer` remains in Zone 3 at the bottom.
- **Right panel**: Domain metadata (name, tagline, journey count) or `MomentDetailPanel` when a moment is selected from the Feed.
- Kip messages route to `POST /api/domains/:domainId/kip/designer`.
- Board atmosphere image set via `pageBackground` on the outermost div. Center panel has no solid background — atmosphere is visible around and behind the `KeeperDialogFrame` (which has `margin: 12px; border-radius: 8px`).

## ⚠️ Notes & ToDo
- [ ] Kip conversation messages (adaptedMessages) are tracked but not displayed visually — they exist for conversation history sent to the API. Consider a dedicated Kip chat overlay or toast for domain Kip responses.
- [ ] MOCK_DOMAINS list is hardcoded — should come from user's domain list API.
- [ ] TODO: Verify with Kip that Feed-as-dialogContent scroll behavior works correctly (no double scroll bars).

## 📆 Update Log
- 2026-04-27 (Prompt 4): Added `centerMode: 'feed' | 'dialog'` state (default: `'feed'`). Domain Board now launches in Feed Mode (The Commons — FeedFrame in Zone 2, no Banner). Sending a message triggers a transition to Dialog Mode (The Workshop — DialogueMessageList in Zone 2, Banner with ← Commons affordance). `onReturnToFeed` prop on `KeeperDialogFrame` wires the back button to return to Feed Mode. Trigger B (Keeper selection) is pending — no `activeKeeper` state exists in DomainBoard yet.
- 2026-04-27 (Prompt 3): `DomainBoard` restructured. Removed separate `FeedFrame` block and fixed-height (300px) `KeeperDialogFrame`. Now uses a single `KeeperDialogFrame` with `dialogContent={<FeedFrame .../>}` filling the full remaining height below `DomainBanner`. Removed `background: "#fefdfb"` from center panel so Board atmosphere is visible. Feed scrolls inside `.dialog-message-surface` with 85% gradient dissolve.

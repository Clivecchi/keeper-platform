# Build Handoff — realm-home-chronicle-routing (queued)

**Goal:** Make the real Document/Chronicle renderer (`DomainRealmStory`) reachable on the personal `/home` route when a Dialog is genuinely selected, instead of `RealmHomeChronicle`'s `isUserHome` branch always short-circuiting to an empty `aria-hidden` div.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-22T00:00:00Z by cloud
**Status:** queued — becomes `current` after `stop-eager-dialog-creation` ships and is verified.

## Why this exists

Chuck's own screenshot of `ke3p.com/home` shows only two panels with real width — Nav and Dialog — no third Chronicle/Document panel, even though the Universal Board pattern calls for Nav · Dialog · Chronicle on every preset. Traced to the actual code, not assumed:

- `apps/web/src/v0/boards/panels/UniversalViewPanel.tsx:314-337` routes `boardId === "realm"` selections to `RealmHomeChronicle`, passing `isUserHome={shell?.shellMode === "home"}`.
- `apps/web/src/v0/realm/RealmHomeChronicle.tsx:77` — `if (!useUserFeed && treatment && domainSlug) return <DomainRealmStory .../>` — the real per-Dialog Document renderer is **only reachable when `isUserHome` is false**.
- `RealmHomeChronicle.tsx:88-90` — when `isUserHome` is true (as on `/home`) and there are no feed events, it falls straight through to `return <div className="realm-home-chronicle min-h-0 flex-1" aria-hidden />` — genuinely empty.
- `apps/web/src/v0/shell/V0Shell.tsx:838,840` sets `shellMode: "home"` for the `/home` route independent of the `?board=realm` query param — so `/home?board=realm` always hits the empty branch, regardless of what's selected.
- Confirmed **not** a CSS/width bug: `KeeperBoardPanelGroup.tsx:21-24,146-182` gives the Chronicle slot a real `flex: 0 0 35%` — the panel occupies real space, its *content* is just an empty node.
- Confirmed **not** the hardcoded-dialog theory either: `DomainRealmStory.tsx:81-123` already derives scope generically from `selection.selectedDialogId` — it isn't tied to one specific dialog ID. It was built correctly; it's just never been wired for `/home`.

## Done when

- On `/home?board=realm`, selecting a real Dialog in Nav renders that Dialog's actual Document (cover, Forward/Step, Points grouped into Paths) via `DomainRealmStory` — the same component already correct on `/d/:slug?board=realm`
- When `isUserHome` is true and no Dialog is selected (browsing the general feed), Chronicle shows a deliberate, visible empty/feed state — not today's silent `aria-hidden` div
- The domain-scoped route is unchanged
- `pnpm run quick:web` passes
- Manual check: `/home?board=realm`, click "Becoming Together" in Nav, confirm a real Document renders with real width

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md
- @docs/universal-board-dialog-orchestration.md
- @docs/becoming-together-cast-strip-proposal.md

## Scope

**Touch:** `RealmHomeChronicle.tsx` (the `isUserHome` branch), `UniversalViewPanel.tsx`'s `showRealmDocument` gate only if the routing condition itself needs to change.

**Do not touch:** `DomainRealmStory.tsx` (already correct); `KeeperBoardPanelGroup.tsx` (panel width is already correct); which visual treatment (Strip / Cast Reel / Original) the real Document adopts — that's a separate Rendr decision downstream of this handoff, not part of it.

## Pattern

`DomainRealmStory.tsx:81-123` already resolves scope generically from `selection.selectedDialogId` with fallback through draft/moment/library selection — reuse as-is. The fix is narrowing `RealmHomeChronicle`'s branch condition: render `DomainRealmStory` whenever a real Dialog is selected, regardless of `isUserHome`; fall back to the feed/empty treatment only when `isUserHome` is true **and** nothing is selected.

## Rendr treatment

N/A for this handoff's mechanical scope — but flag to Rendr once this ships: `docs/becoming-together-cast-strip-proposal.md` has three candidate visual treatments (Strip, Cast Reel, Original) ready for review, live comparison in the artifact referenced there.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/home?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.

## Context

Second of three follow-on handoffs from today's live testing. Depends on nothing technically, but sequenced after `stop-eager-dialog-creation` so Cursor isn't fixing Chronicle routing against a Nav that's still accumulating junk dialogs. This is why "Chronicle does not look like Document" in Chuck's screenshot — not broken machinery, just never wired for `/home`. Third handoff in the sequence is `kip-roster-dialog-cast-sync`.

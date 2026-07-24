# Build Handoff — stop-eager-dialog-creation

**Goal:** Stop persisting a Dialog and kip_agent_session the instant a board mounts. Create both lazily, on the first real message a user actually sends, across every board preset that shares the resumeOrCreateBoardSession / findOrCreateKipDialog path.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-22T00:00:00Z by cloud

## Why this exists

Chuck visited the IDE board — nothing more, no message sent — and it created a real, persisted Dialog titled "Ide · conversation · Jul 23," which then showed up in Realm's Nav "Dialogs" group alongside "Becoming Together." Confirmed by code review, not assumed:

- `apps/web/src/v0/boards/UniversalConversation.tsx:1720` — an effect literally commented *"IDE Board owns Kip session lifecycle"* fires as soon as `kipMode === "ide" && agentId && !activeSessionId` — mount, not message-send.
- It calls `resumeOrCreateBoardSession` (`apps/web/src/lib/kipDialogSession.ts:111-163`), which falls back to `KipApi.createSession(...)` whenever `resolveActiveDialogSessions` finds nothing.
- That POST reaches `apps/api/src/api/kip/agents.ts:3602`, which calls `findOrCreateKipDialog` (`apps/api/src/services/kipDialogLifecycle.ts:36-93`) — and that function unconditionally `prisma.dialog.create(...)`s (lines 77-90) if no matching Dialog exists yet.
- The literal title template lives at `kipDialogLifecycle.ts:72-75`: `` `${boardLabel} · ${frameName} · ${dateLabel}` ``.
- The same pattern is shared by **four** call sites, not just IDE: `UniversalConversation.tsx:1720` (IDE), `UniversalConversation.tsx:1774` (Designer), `useAgentDialog.ts:482-551` (Agent/Domain/Realm), and a second, possibly-dead parallel path at `useAgentDialog.ts:553-620`. One root cause, one fix, four places it currently fires.

## Done when

- Visiting any board (ide, agent, domain, realm, designer) and sending zero messages creates zero new Dialog rows and zero new kip_agent_session rows — confirmed by direct query before/after, not assumed
- Sending the first real message in a fresh board still creates exactly one Dialog + one kip_agent_session, same as today's behavior, just deferred to send-time instead of mount-time
- Revisiting a board that already has an active session still resumes it correctly via the existing read-only `resolveActiveDialogSessions` path — unchanged
- All four call sites are covered, including confirming whether `useAgentDialog.ts:553-620` is genuinely dead code or a second live path
- `pnpm run quick:web` and `pnpm run quick:api` pass
- Manual check: open the IDE board fresh, confirm no new Dialog appears in Realm's Nav until a message is actually sent; then send one message and confirm exactly one Dialog appears

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md
- @docs/universal-board-dialog-orchestration.md

## Scope

**Touch:** `UniversalConversation.tsx` (both board-session effects), `useAgentDialog.ts` (both create-session paths), `kipDialogSession.ts` (`resumeOrCreateBoardSession`), `kipDialogLifecycle.ts` (`findOrCreateKipDialog`), `agents.ts` (`createSession` action).

**Do not touch:** `resolveActiveDialogSessions` (correct as-is); `DialogCastMember`/cast-membership work (shipped, unrelated); real per-agent delegation (Phase 2, still not in scope).

## Pattern

Timing fix, not a new pattern: move the existing `findOrCreateKipDialog` + session-create call from the board-mount effect to the `sendMessage` callback (`useAgentDialog.ts` ~line 649), gated the same way it is today ("no active session yet") — just triggered by the user's first send instead of the effect's mount.

## Rendr treatment

N/A — not a presence job.

## Verification

**Commands:** `pnpm run quick:web`, `pnpm run quick:api`
**Browser:** `/home?board=ide`, `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Small, focused diff — this is a timing change, not a rewrite.
- Codebase wins over docs when they conflict.

## Context

First of three follow-on handoffs from today's live testing (full punch list and priority order in `docs/chronicle-document-architecture.md`, 2026-07-22 section). First in line because it's the most bounded and mechanical, and because it's actively creating garbage in production right now — every board visit until this ships writes another empty Dialog. A related Nav-side symptom (the same dialog's name rendering twice — once in the new "Dialogs" group, once again as its own "0 items" stage-group card) was fixed directly by Cloud in `RealmStagedNav.tsx` (skip a per-dialog stage section entirely when it has zero items in every stage) rather than scoped here — small, well-understood, no architectural judgment call involved.

**Next in line after this ships:** `realm-home-chronicle-routing` and `kip-roster-dialog-cast-sync` (both fully scoped and queued in `docs/build-handoffs/archive/`, ready to become `current` in turn).

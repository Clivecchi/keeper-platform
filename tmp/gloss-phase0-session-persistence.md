Cursor · Phase 0 — un-Dialoged session persistence (2026-08-10)

Gloss-only / diagnostic finding — not a build lock.

## Verdict

For Universal Board member chat with **no Dialog selected in Nav**: this is **not (b) silent discard**. It is closer to **(a) persisted but easy to miss in the UI**, with a precise mechanism:

- “No Dialog selected” is UI state. It does **not** mean `kip_sessions.dialog_id = null`.
- On first real send, the board find-or-creates an auto Chatter Dialog (`title_source: auto_generated`, keyed by board + frame + scope) and links the session immediately.
- Messages (including persisted `castVoices` for Cloud/Rendr) land in `kip_messages` under that session.
- On reopen, Domain/IDE resume via `resolve/active` + `resumeBoardSession` and should reload the transcript without selecting a Dialog.
- Nav surfaces that container under **Chatter**, not under named Dialogs.
- Chronicle Document stays blank (`Select a Dialog to see its Document`) whenever `selectedDialogId` is null — even while the conversation panel has (or should resume) the live thread. That blank Chronicle is the strongest “it vanished” signal and is a surface gate, not proof of data loss.

SOLE (`sole.save`) is independent of Dialog selection and can survive even when the conversation feels missing.

## True unrecoverable / orphan paths (different from “no Dialog selected”)

These *can* leave work hard or impossible to find in Nav:

1. Cast consult sub-runs with `ephemeral: true` — no own session (by design); text survives only via Lead session metadata / synthesis.
2. Guest companion — intentional `dialog_id: null`.
3. Legacy Echo bug (pre-2026-07-23 wrong `board`/`frame` keys) — null-dialog orphans; archive script exists.
4. `createSession` without `dialogBoard` + `dialogFrame` + `dialogScope` — null `dialog_id`; domain-scoped recent-session queries exclude them.
5. Dialog hard-delete — sessions remain with `dialog_id` SetNull.

## Implication for Item 4 (Chronicle storyboard)

Phase 0 says the storyboard is mostly a **visibility / promotion** problem for the common case, not a first-write persistence trigger. The board already saves into Chatter; Chronicle currently refuses to show anything without a selected Dialog.

## Phase 1+ gate

Phase 0 is answered for the reported path. Phases 1–3 may proceed on that basis. Live DB spot-check of the specific Aug 10 session (Chatter row + message count) would still be useful as human confirmation, but code path is not “request-cycle only.”

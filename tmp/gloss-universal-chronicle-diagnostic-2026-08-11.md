Cursor · Universal Chronicle diagnostic (2026-08-11)

Gloss-only — not a build lock. Live walkthrough + code confirmation of four findings.

1) Add to Document lives only on draft Focus (DraftFocusPresence → Cdraft / Manage). DocumentShell (Realm draft path) has no control and no unsurfaced hook. Docs (2026-08-11) treat this as intentional draft-first because Nav is dialog XOR draft. Consequence: Realm cannot perform Add to Document for the same draft IDE can.

Decision: Keep draft-first only, or surface equivalent containment on Realm/Document path (without breaking XOR).

2) Dropdown default is not last-active / session Dialog. Order: draft.dialog_id if in list → first named Dialog → sorted[0]. "Ide · conversation · Jul 23" matches Chatter/auto title pattern, so it was either the draft’s linked dialog_id or fallback when no named Dialog existed.

Decision: Require explicit Dialog choice (empty default) vs keep silent preferred default.

3) Chronicle forks today (high level):
- Fork A DocumentShell: Dialog on all boards; on Realm also domain/draft/moment/library.
- Fork B Presence (KeeperPresence / registry): other subjects on Domain/IDE/Agent/Design; dual-path for Draft, Moment, Library, Domain idle.
Subjects with >1 path: Draft, Moment, Library, Domain; DialogFocusPresence exists but panel always routes Dialog → DocumentShell.

4) Perf (structural, no timings this pass):
- "Preparing board…" = DomainShellGate curtain (await shell + cover + dialog session prefetch + Nav slices; min hold 480ms; hard timeout 12s) — not draft select.
- IDE draft shimmer = KeeperPresence: getDraft then enrichDraft getDraft again (double fetch) + optional session/journey.
- Realm Document open: nav growth (drafts+library+moments+dialogs) + document GET (cached 45s) + ensureDialogGlossCarrier POST.
- Phase 1 cast-consult (directorDialog merge) is conversation-path, not Chronicle body.
- Phase 2 draft-containment added Document components + DraftAddToDocumentControl; does not explain Domain curtain by itself.
Profiling needed for wall-clock isolation.

Universal requirement restated: board should change emphasis, not object identity or available containment actions.

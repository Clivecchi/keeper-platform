# Build Handoff — realm-becoming-together-parity

**Superseded by:** `ke3p-becoming-together-consolidation` — the real data gap this handoff's fixes were rendering on top of.

**Goal:** Bring Realm's real board into parity with the Becoming Together reference Document — Chronicle scoped per-Dialog with real Path grouping and no text duplication, the cast bar correctly placed and populated.

## Shipped

Commits: `65dc9885` (Chronicle Dialog-scoping), `d432877b` (Path wiring + text dedup), `1d0e2cbd` (cast bar to header), `df1fb6ee` (Ceox chip; confirmed Kip's lead binding was already correct).

Verified directly against the commits, not just the messages: Chronicle dialog-scoping is real (scope derives from `selectedDialogId` or a resolved selection, with a gated empty state). The cast bar genuinely moved to the header. Kip's lead binding was already correct in ke3p's DB — Cursor's own investigation caught that this handoff's own assumption (that it pointed at Cloud) was wrong, rather than blindly "fixing" something that wasn't broken.

## Gap found after shipping

The Ceox/Chuck merge chip never renders for Chuck specifically: `DialogCastBar`'s person-chip loop only fires for rows from `GET /api/domains/:id/members`, which reads the `domainPermission` table only — granted collaborators, not `Domain.ownerId`. Chuck owns ke3p directly, so he never appears in that list. The merge logic itself is correct; it has nothing to attach to.

## Deeper gap found after shipping

None of this mattered for Chuck's actual goal, because **"Becoming Together" was never a real Dialog row.** Confirmed by a direct, read-only query against ke3p's production data: 17 real Dialog rows exist, every one auto-titled by board+date ("Ide · conversation · Apr 23," "Domain · conversation · Jul 4," etc.) — none named Becoming Together. 86 total drafts, only 8 carry a `dialog_id`; 78 are orphaned.

Every fix in this handoff is real and working — it was all rendering machinery for data that never matched the end state Chuck was waiting for. Chuck's own words on seeing the shipped result: *"I still have forty two thousand drafts and zero dialogs"* — accurate in spirit. Superseded by `ke3p-becoming-together-consolidation`, which creates the real Dialog and consolidates the orphaned data instead of continuing to polish its rendering.

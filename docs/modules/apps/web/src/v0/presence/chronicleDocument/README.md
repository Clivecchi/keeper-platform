# chronicleDocument

## ?? Purpose
Point read shell + Document container helpers for Chronicle Focus ? shared consumer for real LibraryItem records, synthetic content, and Realm Document sequences.

## ?? Key Files
- `PointView.tsx` ? clamped body, status, optional Gloss action (atomic Point)
- `DocumentShell.tsx` ? cover + Points sequence (universal container; Realm adapter consumes this)
- `DocumentHeader.tsx` / `documentHeader.ts` — Document identity header (same Chronicle header job as Cdraft)
- `DocumentPointGloss.tsx` — inline polish panel on a Document Point (Dialog carrier + Kip chat)
- `ChronicleHistoryPanel.tsx` — Dialog-scoped History quick review (session chapters + Document keeps) with parent/child disclosure
- `chronicleMobile.ts` ? viewed-state, deep-link scroll, and History grouping helpers
- `libraryItemDocumentAdapter.ts` ? LibraryItem ? Point
- `libraryRoadmapDocument.ts` ? synthetic roadmap Point
- `LibrarySharedContextRoadmapPanel.tsx` ? domain-idle synthetic pilot

## ?? Data & Behavior
- Adapters produce `Point` from `@keeper/shared`
- `Document` (shared) is the Dialog-scoped container shape; Realm mounts `DocumentHeader` + `DocumentShell`
- `DocumentShell` accepts optional Path groups (`pointIds` as indexes into `points`)
- Identity header is always present for a named Dialog Document (title, Document kind, point count) — including empty Documents. Authored `forward` + `step` are destination content below the header, not a substitute for it.
- Gloss: library items use `buildLibraryGlossAnchor`; manuscript Points use draft+nodeId anchors + body snapshot. With `glossContext` (Dialog scope), Gloss opens `DocumentPointGloss` inline on the Point — not Dialog sprawl.

## ?? Notes & ToDo
- [ ] Confirm synthetic panel placement with Kip (below domain ChronicleRecordView)
- [ ] Wire real Step from self-organizing lineage (not faked) ? Back/Forward stay disabled until then

## 📆 Update Log
### 2026-08-19 — Document identity header (Universal Render)
- Named Dialog Documents always render `DocumentHeader` — same Chronicle header job as Draft (`Cdraft`): title, Document kind, status pill, point count, Manage.
- Empty Documents say **No Points yet.** Realm idle copy ("Realm is breathing") is gone.
- Authored Forward/Step stay as Document content, not a replacement for the header.

### 2026-08-17 — Bring in writing
- `DocumentShell` optional `onBringInWriting` — attach external markdown to the focused Dialog.

### 2026-08-11 — Document Chronicle cleanup pass
- Composition: Forward → Points → **Also in this Document** (drafts appendix at bottom).
- Points: hairline list (no stacked cards); quiet text Accept / More / Gloss.
- Search: **Find…** disclosure unless ≥8 Points.
- Path groups: no paper panels.

### 2026-08-11 — DocumentShell Point Accept (Phase 3)
- `PointView` / `DocumentShell` — human **Accept** on manuscript Points via `onAcceptPoint` → same `POST …/points/:pointId/accept` as Cdraft (`useDraftPointAccept`). Stays on Document (no Nav switch). Agents already invoke `draft.point.accept` via chat — this surface is human Chronicle only.

### 2026-08-11 — Quieter Document drafts strip
- `DocumentShell` component list: light rows (no bordered cards), label **Drafts in this Document**.

### 2026-08-11 — Document component list only (add is draft-first)
- `DocumentShell` lists registered Document drafts; **Add to Document** lives on draft Chronicle (`DraftAddToDocumentControl`) because Nav selection is replace-only (dialog XOR draft).

### 2026-08-09 — Chronicle Gloss open reliability
- Point card: open Gloss scrolls the Point into view; `overflow: visible` while Glossing so the roomy panel is not clipped.

### 2026-08-06 — Document UX ship (Gloss + Point cards + search + media slots)
- `DocumentPointGloss.tsx` + gloss-carrier; roomy Chronicle Gloss; rewrite honesty; Document reload; `Updated · …` / **Glossed** badges; prefetch carrier for thread presence.
- Point card: author/voice meta, title expands, More/Less + Voices + Gloss pill (no Open+Gloss text pair).
- Document search field; cinematic Forward; Forward/Path `imageUrl` slots; shared `--theme-font-display` / body scale with Dialog.

### 2026-08-05 — Document density + parity
- Path groups collapse by default (Progress expands); click header to expand. Softened path panel paper. Removed disabled Back/Forward lineage chrome until Layer 3.
- `PointView` tighter type scale (title ~20 / body ~15); Gloss demoted to quiet text link (long-press still works on mobile).

### 2026-08-03 — History as quick review
- `ChronicleHistoryPanel` tightened for scan: shorter type, 2-line summary clamp, date (not timestamp-to-the-second).
- Empty copy: named sessions and Document keeps — not every Dialog turn.

### 2026-08-02 — History empty-state honesty
- `ChronicleHistoryPanel` surfaces fetch errors instead of looking like an empty timeline.
- Empty copy updated again on 2026-08-03 (per-turn History retired).

- **2026-07-26** ? **Cast Notes:** PointView `Cast ? N` link opens voice cards for notes on that Point (`Point.cast.notes`). Sourced from `DraftPoint.castNotes` + sibling Points with `referencesPointId`. Same `dialog-voice-card` chrome as Dialog.
- **2026-07-26** ? Readability pass 2: larger type (title ~24px, body ~18px); single Open/Close control (chevron removed). Document manuscript Lead rewrite + castVoices session persistence noted in orchestration docs.
- **2026-07-26** ? Readability: larger type (title ~22px, body ~17px); Points default collapsed to title + 1?2 sentence blurb with Open/Close.
- **2026-07-25** ? Path hierarchy: accent dots + counts, path panel grouping, Point cards with left rail; Forward labeled + brass border; Step labeled "Now". Keeper theme tokens (Cormorant, brass/success accents).
- **2026-07-19** ? Forward block (collapsible description) + glassy Step + disabled Back/Forward row; theme tokens only (`--theme-status-success` for Step accent).

- **2026-07-17** ? Added `DocumentShell`; `DomainRealmStory` is a thin Realm data adapter. Point is atomic primary; Document is container type.

- **2026-07-16** ? Rename: ChronicleDocument ? Document/Point, ChronicleDocumentView ? PointView.
- **2026-07-15** ? Gloss wired into Dialog via `requestDiscussDraftPoint`.
- **2026-07-13** ? Initial pilot: view, library adapter, roadmap synthetic panel.

### 2026-07-28 ? Chronicle Gloss long-press
- `PointView`: 480ms touch long-press invokes `onGloss` (same timing as Dialog GlossSurface); button retained.

### 2026-07-30 ? Mobile Chronicle Document + History
- Document points receive durable anchors from Realm entries; `DocumentShell` scrolls deep-links into view and shows their breadcrumb.
- `ChronicleHistoryPanel` consumes only Dialog-scoped Chronicle events; `chronicleMobile` records viewed timestamps in localStorage.


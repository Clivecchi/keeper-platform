# chronicleDocument

## ?? Purpose
Point read shell + Document container helpers for Chronicle Focus ? shared consumer for real LibraryItem records, synthetic content, and Realm Document sequences.

## ?? Key Files
- `PointView.tsx` ? clamped body, status, optional Gloss action (atomic Point)
- `DocumentShell.tsx` ? cover + Points sequence (universal container; Realm adapter consumes this)
- `ChronicleHistoryPanel.tsx` ? Dialog-scoped event timeline with parent/child disclosure
- `chronicleMobile.ts` ? viewed-state, deep-link scroll, and History grouping helpers
- `libraryItemDocumentAdapter.ts` ? LibraryItem ? Point
- `libraryRoadmapDocument.ts` ? synthetic roadmap Point
- `LibrarySharedContextRoadmapPanel.tsx` ? domain-idle synthetic pilot

## ?? Data & Behavior
- Adapters produce `Point` from `@keeper/shared`
- `Document` (shared) is the Dialog-scoped container shape; Realm mounts `DocumentShell`
- `DocumentShell` accepts optional Path groups (`pointIds` as indexes into `points`)
- Optional `forward` + `step` replace the plain title/subtitle header; Back/Forward lineage nav stays disabled until Layer 3
- Gloss: library items use `buildLibraryGlossAnchor`; synthetic uses ephemeral message anchor when wired

## ?? Notes & ToDo
- [ ] Confirm synthetic panel placement with Kip (below domain ChronicleRecordView)
- [ ] Wire real Step from self-organizing lineage (not faked) ? Back/Forward stay disabled until then

## ?? Update Log
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


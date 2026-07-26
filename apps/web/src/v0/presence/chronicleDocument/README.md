# chronicleDocument

## 📌 Purpose
Point read shell + Document container helpers for Chronicle Focus — shared consumer for real LibraryItem records, synthetic content, and Realm Document sequences.

## 🧱 Key Files
- `PointView.tsx` — clamped body, status, optional Gloss action (atomic Point)
- `DocumentShell.tsx` — cover + Points sequence (universal container; Realm adapter consumes this)
- `libraryItemDocumentAdapter.ts` — LibraryItem → Point
- `libraryRoadmapDocument.ts` — synthetic roadmap Point
- `LibrarySharedContextRoadmapPanel.tsx` — domain-idle synthetic pilot

## 🔄 Data & Behavior
- Adapters produce `Point` from `@keeper/shared`
- `Document` (shared) is the Dialog-scoped container shape; Realm mounts `DocumentShell`
- `DocumentShell` accepts optional Path groups (`pointIds` as indexes into `points`)
- Optional `forward` + `step` replace the plain title/subtitle header; Back/Forward lineage nav stays disabled until Layer 3
- Gloss: library items use `buildLibraryGlossAnchor`; synthetic uses ephemeral message anchor when wired

## ⚠️ Notes & ToDo
- [ ] Confirm synthetic panel placement with Kip (below domain ChronicleRecordView)
- [ ] Wire real Step from self-organizing lineage (not faked) — Back/Forward stay disabled until then

## 📆 Update Log
- **2026-07-25** — Path hierarchy: accent dots + counts, path panel grouping, Point cards with left rail; Forward labeled + brass border; Step labeled "Now". Keeper theme tokens (Cormorant, brass/success accents).
- **2026-07-19** — Forward block (collapsible description) + glassy Step + disabled Back/Forward row; theme tokens only (`--theme-status-success` for Step accent).

- **2026-07-17** — Added `DocumentShell`; `DomainRealmStory` is a thin Realm data adapter. Point is atomic primary; Document is container type.

- **2026-07-16** — Rename: ChronicleDocument → Document/Point, ChronicleDocumentView → PointView.
- **2026-07-15** — Gloss wired into Dialog via `requestDiscussDraftPoint`.
- **2026-07-13** — Initial pilot: view, library adapter, roadmap synthetic panel.

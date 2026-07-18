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
- Gloss: library items use `buildLibraryGlossAnchor`; synthetic uses ephemeral message anchor when wired

## ⚠️ Notes & ToDo
- [ ] Confirm synthetic panel placement with Kip (below domain ChronicleRecordView)

## 📆 Update Log
- **2026-07-17** — Point is atomic primary; Document is container type. `PointView` takes `point`. RealmNavEntry.point.
- **2026-07-16** — Rename: ChronicleDocument → Document/Point, ChronicleDocumentView → PointView.
- **2026-07-15** — Gloss wired into Dialog via `requestDiscussDraftPoint`.
- **2026-07-13** — Initial pilot: view, library adapter, roadmap synthetic panel.

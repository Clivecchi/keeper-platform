# chronicleDocument

## 📌 Purpose
Document (Point) read/presentation shell for Chronicle Focus mode — shared consumer for real LibraryItem records and synthetic content (roadmap status, diagnostics).

## 🧱 Key Files
- `PointView.tsx` — clamped body, status, optional Gloss action (atomic-card renderer)
- `libraryItemDocumentAdapter.ts` — LibraryItem → Document + pointer subtitle
- `libraryRoadmapDocument.ts` — synthetic roadmap provider
- `LibrarySharedContextRoadmapPanel.tsx` — domain-idle synthetic pilot on Universal Board

## 🔄 Data & Behavior
- Entity adapters produce `Document` (`Point` alias) from `@keeper/shared`
- Gloss: library items use `buildLibraryGlossAnchor`; synthetic uses ephemeral message anchor when wired
- Rendered inside `LibraryItemFocusPresence` (entity) and `UniversalViewPanel` domain idle (synthetic)

## ⚠️ Notes & ToDo
- [ ] Confirm synthetic panel placement with Kip (below domain ChronicleRecordView)

## 📆 Update Log
- **2026-07-16** — Rename: `ChronicleDocument` → `Document` (+ `Point` alias), `ChronicleDocumentView` → `PointView`, `libraryItemToChronicleDocument` → `libraryItemToDocument`. Shared module file: `packages/shared/src/document.ts`. Naming-only; no visual change.
- **2026-07-15** — Gloss wired from view into Dialog via `requestDiscussDraftPoint` / `requestGloss`; library items pass `buildLibraryGlossAnchor` + snapshot; first Dialog exchange seeds gloss carrier thread on user message for MCP `gloss_write_turn`.
- **2026-07-13** — Initial ChronicleDocument pilot: view, library adapter, roadmap synthetic panel.

# chronicleDocument

## 📌 Purpose
ChronicleDocument read/presentation shell for Chronicle Focus mode — shared consumer for real LibraryItem records and synthetic content (roadmap status, diagnostics).

## 🧱 Key Files
- `ChronicleDocumentView.tsx` — clamped body, status, optional Discuss
- `libraryItemDocumentAdapter.ts` — LibraryItem → ChronicleDocument + pointer subtitle
- `libraryRoadmapDocument.ts` — synthetic roadmap provider
- `LibrarySharedContextRoadmapPanel.tsx` — domain-idle synthetic pilot on Universal Board

## 🔄 Data & Behavior
- Entity adapters produce `ChronicleDocument` from `@keeper/shared/chronicleDocument`
- Gloss: library items use `buildLibraryGlossAnchor`; synthetic uses ephemeral message anchor when wired
- Rendered inside `LibraryItemFocusPresence` (entity) and `UniversalViewPanel` domain idle (synthetic)

## ⚠️ Notes & ToDo
- [ ] Confirm synthetic panel placement with Kip (below domain ChronicleRecordView)

## 📆 Update Log
- **2026-07-15** — Discuss wired from `ChronicleDocumentView` into Dialog via `requestDiscussDraftPoint`; library items pass `buildLibraryGlossAnchor` + snapshot; first Dialog exchange seeds gloss carrier thread on user message for MCP `gloss_write_turn`.
- **2026-07-13** — Initial ChronicleDocument pilot: view, library adapter, roadmap synthetic panel.

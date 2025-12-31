# Domain Components

## 📌 Purpose
Frame-level renderers and helpers that power legacy/domain boards, mapping stored props to the correct React components (text, heading, linked card, manifesto, etc.) and handling inline editing states.

## 🧱 Key Files
- `PropRenderer.tsx` – Maps `prop.type` fields to visual components (heading, text, image, linked_card, etc.)
- `EditableProp.tsx` – Wrapper that provides inline edit mode controls for individual prop blocks.
- `DomainBoardRenderer.tsx` – Orchestrates frame layouts and renders prop collections via `PropRenderer`.

## 🔄 Data & Behavior
- Props arrive from `FrameInstance.props` and are rendered in order; each prop carries `{ id, type, config, value }`.
- `PropRenderer` centralizes prop-type logic so new prop types (like `linked_card`) can be introduced once and reused across boards.
- `EditableProp` handles edit-mode UX, invoking callbacks when prop values are updated inline.
- Domain board frames hydrate via `DomainBoardRenderer`, which loops frames + props and injects domain context for engagement actions when necessary.

## ⚠️ Notes & ToDo
- [ ] Expand prop docs to cover every supported `prop.type`.
- [ ] Add regression tests for `linked_card` + future prop types to prevent regressions.
- [ ] Plumb live data into LinkedCard props once journeys/keepers endpoints are wired.

## 📆 Update Log
- 2025-12-09: Added README + documented LinkedCard prop rendering support inside `PropRenderer`.


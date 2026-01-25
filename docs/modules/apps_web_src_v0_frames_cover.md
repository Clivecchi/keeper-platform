# Cover Frame

## 📌 Purpose
Renders the V0 cover lens that launches the Moment editor and links to other domain surfaces.

## 🧱 Key Files
- `CoverBody.tsx`

## 🔄 Data & Behavior
Creates a draft moment on "Write a Moment" and navigates to the Moment frame. Falls back to direct navigation if draft creation fails.

## ⚠️ Notes & ToDo
- [ ] Confirm draft bootstrap error handling for unauthenticated visitors.

## 📆 Update Log
- 2026-01-19: Simplified closed cover to identity-only content in the main well.
- 2026-01-19: Added coverState open/closed handling with First Page threshold actions.
- 2026-01-19: Added Index CTA entrypoint to guide users into the table of contents.
- 2026-01-18: Routed cover navigation through v0 shell frame helpers.
- 2026-01-17: Documented cover lens behavior and draft launch flow.

# Frames

## 📌 Purpose
Document the frames layer: registry, required AHB frames, fetch standardization, and Studio deep-link behavior.

## 🧱 Key Files
- `apps/web/src/components/frames/*`
- `apps/web/src/components/frames/registry.ts`
- `apps/web/src/lib/api.ts` (apiFetch)

## 🔄 Data & Behavior
- AHB requires these frames by role/order:
  1) dialog (conversation)
  2) preview (agent overview)
  3) topics (topic manager)
  4) draft (config drafts)
  5) config_panel (settings)
- Fetch standard: prefer `apiFetch()` over raw `fetch()`; include empty/error states.
- Studio deep-link: `/studio/board-studio?boardId=<UUID>` auto-loads the specified board.

## ⚠️ Notes & ToDo
- [ ] Confirm any frame exceptions that must call raw fetch
- [ ] Validate AHB frames ordering on ensure path
- [ ] // TODO: Verify and describe assumptions

## 📆 Update Log
- [2025-09-08] Added frames docs and standardization notes

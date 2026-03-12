# Boards

## 📌 Purpose
V0 Boards are full-viewport surfaces accessed via the `?board=` URL parameter. A Board owns its layout, chrome (top banner, InteractionBar), and context entirely — V0Shell mounts a Board and steps back.

## 🧱 Key Files
- `boardRegistry.ts` — Registry of all V0 Boards; parallel to `FRAME_REGISTRY` for Frames
- `designer/` — The Design Board (Platform Admin tool for editing domain frame JSON with Kip)

## 🔄 Data & Behavior
- Boards are accessed via `?board=<key>` on any `/d/:slug/board` URL
- `BOARD_REGISTRY` maps each key to a component, display name, and auth flags (`isPrivate`, `isAdminOnly`)
- V0Shell reads `?board=` and renders the matching Board component inside V0ShellProvider context
- Boards call `useV0Shell()` to access `domainSlug`, `domainFrame`, `resolvedAudience`, etc.
- `?board=` takes precedence over `?frame=` when both are present in the URL

## ⚠️ Notes & ToDo
- [ ] Boards do not currently have their own URL namespace — they share `/d/:slug/board`
- [ ] `V0BoardKey` type lives in `boardRegistry.ts`; if more boards are added, consider splitting

## 📆 Update Log
### 2026-03-11
- Created `boards/` directory and `boardRegistry.ts` (Step 3 of designer-to-board migration)
- Moved designer files from `frames/designer/` to `boards/designer/` (Step 2)

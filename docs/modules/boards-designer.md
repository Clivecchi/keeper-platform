# Design Board

## 📌 Purpose
Platform Admin–only surface for visually designing and editing V0 domain Frame JSON with Kip. Accessed via `?board=designer` on any `/d/:slug/board` URL.

## 🧱 Key Files
- `DesignBoard.tsx` — Root component; three-panel layout with lifted state; also exports `DesignBoard` alias used by `boardRegistry.ts`
- `DesignBoardNav.tsx` — Left panel; lists V0 Frames with live/draft status dots; frame selection triggers Kip conversation
- `DesignBoardKip.tsx` — Center panel; Kip conversation interface; approve-to-draft flow; publish handler
- `DesignBoardCanvas.tsx` — Right panel; live/draft frame preview with audience switcher and raw JSON toggle

## 🔄 Data & Behavior
- Parent component (`DesignBoard.tsx`) owns all state: `activeFrameKey`, `messages`, `draftSpecJson`, `draftId`, `liveDomainFrame`
- `DesignBoardNav` reads `CORE_FRAME_MAP` for the frame list; does not include the board itself
- `DesignBoardKip` posts to `POST /api/domains/:domainId/kip/designer` and calls `KipApi.createDraft` on approve
- `DesignBoardCanvas` imports `CORE_FRAME_MAP` directly (no circular risk since board is no longer in FRAME_REGISTRY)
- `DesignBoardCanvas` wraps previewed frames in a `V0ShellProvider` override so draft JSON is visible

## ⚠️ Notes & ToDo
- [ ] Component internals still use `DesignerFrame` / `DesignerFrameKip` etc. as internal names — rename in a future step
- [ ] The admin guard is duplicated: once in `DesignBoard.tsx` (component level) and once in `V0Shell.tsx` (routing level)

## 📆 Update Log
### 2026-03-11
- Moved from `v0/frames/designer/` to `v0/boards/designer/` as part of Board system extraction
- Updated sibling imports to use new file names (DesignBoardNav, DesignBoardKip, DesignBoardCanvas)
- Added `DesignBoard` named export alias for use by `boardRegistry.ts`
- Removed from `FRAME_REGISTRY`, `V0FrameKey`, `privateFrames`, `FRAME_DISPLAY_NAMES`, `FRAME_TO_JSON_KEY`

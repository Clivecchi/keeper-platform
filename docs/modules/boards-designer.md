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

## 🐛 Debug Mode
Design Board debug logging traces draft propagation from Kip → preview. Enable via:
- **Runtime** (browser console): `window.__keeperDebug = window.__keeperDebug || {}; window.__keeperDebug.designer = true`
- **Build-time**: `VITE_DESIGNER_DEBUG=1` in `.env` or `VITE_DESIGNER_DEBUG=1 npm run dev`

When enabled, `[DesignBoard:debug]` logs appear for `setDraftSpecJson` and `previewDomainFrame updated`.

## ⚠️ Notes & ToDo
- [ ] Component internals still use `DesignerFrame` / `DesignerFrameKip` etc. as internal names — rename in a future step
- [ ] The admin guard is duplicated: once in `DesignBoard.tsx` (component level) and once in `V0Shell.tsx` (routing level)
- [ ] `Margin` (interaction bar) renders as a `fixed` overlay over the whole board when any frame is previewed — intentional leakage from `DesignFrame`. May want to suppress it in the preview context in a future pass.

## 📆 Update Log
### 2026-03-25 — Preview, publish staleness, click-to-edit
- See `apps/web/src/v0/boards/designer/README.md` (same date entry) for `DesignBoard.tsx`, `DesignBoardFrameDetail.tsx`, and cover preview wiring.
### 2026-03-16 — Board Chrome hard boundary + auth wiring
- **Auth**: Default audience to `keeper` when designer is logged in; sync when auth loads. Interaction bar (Sign In) now reflects actual auth state instead of always showing guest view.
- **Hard boundary**: Three-panel layout now has `paddingBottom: V0_MARGIN_HEIGHT` so content cannot extend behind the interaction bar. Board Chrome (top banner + interaction bar) enforces a hard boundary; background image can continue to scroll.
### 2026-03-15 — Debug logging
- Added `[DesignBoard:debug]` logging in `DesignBoardKip` and `DesignBoardCanvas` for draft → preview propagation. Gated by `VITE_DESIGNER_DEBUG=1` or `window.__keeperDebug.designer`.
### 2026-03-12 — Pre-existing error fixes
- `DesignBoardCanvas.tsx` line 68: `experienceMode="standard"` → `experienceMode={parentShell.experienceMode}`. `"standard"` was never a valid `ExperienceMode` member; now inherits the board's actual experience mode from shell context.
- `DesignBoardKip.tsx` line 120: `{msg.draftProposal && ...}` → `{!!msg.draftProposal && ...}`. `draftProposal` is typed `unknown`; `!!` narrows to `boolean` making the JSX short-circuit valid as `ReactNode`. Net error count: 45 → 43 (2 fixed, 0 introduced).
### 2026-03-12 — Banner + AgentFrame kip wiring
- Added `DesignBoardBanner` component to `DesignBoard.tsx`: domain wordmark + "Back" navigation chrome at the top of the board. Reads `liveDomainFrame?.theme?.wordmark ?? domainSlug` as the wordmark. Back button navigates to `/d/:slug/board`.
- Refactored root layout from `flex` to `flex flex-col`; three-panel layout moved into a `flex flex-1 min-h-0 overflow-hidden` inner container so banner height is correctly consumed.
- `AgentFrame.tsx`: annotated all five `DomainFrameKip` fields with no render surface (`agent_id`, `model`, `visibility`, `image_style`, `image_model`); `greeting` remains wired to `DesignFrame` `subtitle` prop.
### 2026-03-11
- Moved from `v0/frames/designer/` to `v0/boards/designer/` as part of Board system extraction
- Updated sibling imports to use new file names (DesignBoardNav, DesignBoardKip, DesignBoardCanvas)
- Added `DesignBoard` named export alias for use by `boardRegistry.ts`
- Removed from `FRAME_REGISTRY`, `V0FrameKey`, `privateFrames`, `FRAME_DISPLAY_NAMES`, `FRAME_TO_JSON_KEY`

# Design Board

## 📌 Purpose
Platform Admin–only surface for visually designing and editing V0 domain Frame JSON with Kip. Accessed via `?board=designer` on any `/d/:slug/board` URL.

## 🧱 Key Files
- `DesignBoard.tsx` — Root component; three-panel layout with lifted state (`activeBoardId`, `activeFrameKey`, `leftCollapsed`, draft/publish); exports `DesignBoard` alias for `boardRegistry.ts`
- `DesignBoardList.tsx` — Left panel; collapsible Board & Template list; auto-collapses when a Frame is selected
- `DesignBoardFrameList.tsx` — Center panel; Frame rows with color dots & role badges, three view toggle icons, Kip chat box footer, draft/publish status bar; contains Kip send logic
- `DesignBoardFrameDetail.tsx` — Right panel; tabbed Frame detail (Preview, Config, Props, JSON); preserves `FramePreviewShell` and direct-edit overlay
- `DesignBoardNav.tsx` — (Legacy) Original left panel; superseded by `DesignBoardList.tsx`
- `DesignBoardKip.tsx` — (Legacy) Original center panel; superseded by `DesignBoardFrameList.tsx`
- `DesignBoardCanvas.tsx` — (Legacy) Original right panel; superseded by `DesignBoardFrameDetail.tsx`

## 🔄 Data & Behavior
- Parent component (`DesignBoard.tsx`) owns all state: `activeBoardId`, `activeFrameKey`, `leftCollapsed`, `messages`, `draftSpecJson`, `draftId`, `liveDomainFrame`, `audience`
- `DesignBoardList` renders hard-coded Board items (Domain Board, Design Board, Keeper Starter template); collapses to 36px
- `DesignBoardFrameList` renders Frame rows from hard-coded `BOARD_FRAMES` data; posts to `POST /api/domains/:domainId/kip/designer` and calls `KipApi.createDraft` on Kip proposal
- `DesignBoardFrameDetail` imports `CORE_FRAME_MAP` directly; wraps previewed frames in a `V0ShellProvider` override so draft JSON is visible; four tabs: Preview (live frame preview + audience switcher + direct edit), Config (frame props + labels), Props (prop library display), JSON (syntax-highlighted read-only)

## 🐛 Debug Mode
Design Board debug logging traces draft propagation from Kip → preview. Enable via:

- **Runtime** (browser console): `window.__keeperDebug = window.__keeperDebug || {}; window.__keeperDebug.designer = true`
- **Build-time**: `VITE_DESIGNER_DEBUG=1` in `.env` or `VITE_DESIGNER_DEBUG=1 npm run dev`

When enabled, `[DesignBoard:debug]` logs appear:
- `setDraftSpecJson` — when Kip returns a draft (frameKey, fullSpecKeys, frameBlockKeys)
- `previewDomainFrame updated` — when Canvas receives new draft/live data (activeFrameKey, hasDraftSpec, blockKeys)

## ⚠️ Notes & ToDo
- [x] Component internals renamed: `DesignerFrameNav` → `DesignBoardList`, `DesignerFrameKip` → `DesignBoardFrameList`, `DesignerFramePreview` → `DesignBoardFrameDetail`
- [ ] The admin guard is duplicated: once in `DesignBoard.tsx` (component level) and once in `V0Shell.tsx` (routing level)
- [ ] `Margin` (interaction bar) renders as a `fixed` overlay over the whole board when any frame is previewed — intentional leakage from `DesignFrame`. May want to suppress it in the preview context in a future pass.

## 📆 Update Log
### 2026-03-16 — Three-panel layout upgrade (Board-first authoring surface)
- **Left panel**: Replaced `DesignBoardNav` with `DesignBoardList` — collapsible Board & Template list with chevron toggle; auto-collapses on Frame select; 36px collapsed width.
- **Center panel**: Replaced `DesignBoardKip` with `DesignBoardFrameList` — Frame rows with color dots and role badges, three icon-only view toggles (Frames/Dialog/Preview), Add Frame placeholder, draft/publish status bar, Kip chat box footer with arrow send button.
- **Right panel**: Replaced `DesignBoardCanvas` with `DesignBoardFrameDetail` — four tabs (Preview, Config, Props, JSON); Preview preserves `FramePreviewShell` + audience switcher + direct-edit overlay; Config shows Frame Props + Labels; Props shows categorized prop library; JSON shows syntax-highlighted read-only output.
- **DesignBoard.tsx**: Added `activeBoardId`, `leftCollapsed` state; `onFrameSelect` auto-collapses left; all existing state and handlers preserved.
- **boardRegistry.ts**: Added `domain` entry with stub `DomainBoard` component; updated `V0BoardKey` union.
### 2026-03-16 — Board Chrome hard boundary + auth wiring
- **Auth**: Default audience to `keeper` when designer is logged in; sync when auth loads. Interaction bar (Sign In) now reflects actual auth state instead of always showing guest view.
- **Hard boundary**: Three-panel layout now has `paddingBottom: V0_MARGIN_HEIGHT` so content cannot extend behind the interaction bar. Board Chrome (top banner + interaction bar) enforces a hard boundary; background image can continue to scroll.
### 2026-03-15 — Debug logging
- Added `[DesignBoard:debug]` logging in `DesignBoardKip` and `DesignBoardCanvas` for draft → preview propagation. Gated by `VITE_DESIGNER_DEBUG=1` or `window.__keeperDebug.designer`.
### 2026-03-15 — Full end-to-end loop fix
- **`DesignBoardKip.tsx`**: Removed the two-step "Approve & create draft" flow. `handleSend()` now auto-creates the draft immediately when the backend returns `draft.spec_json`. The draft `spec` is built as the **full** `DomainFrameJson` (live frame merged with the proposed frame block at the correct JSON key via `buildFullSpec()`), not just the frame-level block. This prevents publish from overwriting unrelated frame data. `draftId` and `draftSpecJson` are both set before the API round-trip completes so the Canvas and Publish bar update immediately. `MessageBubble` no longer handles approve logic — it is now a pure display component.
- **`DesignBoardCanvas.tsx`**: Comment update — `draftSpecJson` is now always the full `DomainFrameJson`; the spread merge is correct as-is.
- **`kip-designer.ts`**: (1) `wantsJsonProposal()` replaced: now returns `true` for any authoring intent, `false` only for pure informational questions (starts with what/why/how/when/who/which/where/is/are/do/does/did etc.). (2) `needsJson` no longer requires `togetherKey` — Anthropic JSON fallback (`callAnthropicJsonFallback()`) is used when Together AI is unavailable or fails. This eliminates the `TOGETHER_API_KEY` hard dependency. (3) Kip system prompt rewritten: "confirm what you changed in 1-2 sentences, do not ask clarifying questions before acting."
- **`domain-frame.types.ts`**: Added `FeedFrameJson`, `KeepersFrameJson`, `ProfileFrameJson`; added `feed`, `keepers`, `profile` to `DomainFrameJson`.
- **`frameRegistryMap.ts`**: `FRAME_TO_JSON_KEY` updated: `feed: "feed"`, `keepers: "keepers"`, `profile: "profile"` (was `null`).
- **`frame-schemas.ts`**: Added `feedFrameSchema`, `keepersFrameSchema`, `profileFrameSchema`; added all three to `FRAME_SCHEMA_MAP`.
- **`FeedFrame.tsx`, `KeepersFrame.tsx`, `ProfileFrame.tsx`**: Now read `frame_title`, `frame_subtitle`, `coming_soon_heading`, `coming_soon_body`, `cta_back_to_commons` from `domainFrame.feed/keepers/profile`; fall back to hardcoded defaults if JSON block absent.
- **`seed-default-domain-frames.ts`**: Added `DEFAULT_FEED`, `DEFAULT_KEEPERS`, `DEFAULT_PROFILE`; ran seed — all three blocks confirmed in database (`default` domain).
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

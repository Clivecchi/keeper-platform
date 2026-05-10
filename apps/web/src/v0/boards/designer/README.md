# Design Board

## 📌 Purpose
Platform Admin–only surface for visually designing and editing V0 domain Frame JSON with Kip. Accessed via `?board=designer` on any `/d/:slug/board` URL.

## 🧱 Key Files
- `DesignBoard.tsx` — Root component; `<UniversalBoard def={DESIGNER_BOARD_DEF} />` with left + right overrides; owns board nav state (`activeBoardId`, `selectedBoardDefId`, `audience`, `density`); exports `DesignBoard` alias for `boardRegistry.ts`; syncs `data-density` on `document.documentElement` and `keeper-density` in `localStorage`
- `DesignBoardFrameList.tsx` — Exports `BOARD_FRAMES`, `BOARD_NAMES`, `FrameItem`; used by `UniversalSwitcherPanel` (left panel frame list)
- `DesignBoardFrameDetail.tsx` — Right panel; tabbed Frame detail (Preview, Config, Props, JSON, Brief, Code); `FramePreviewShell` + direct-edit overlay; reads `draftSpecJson`, `liveDomainFrame`, and `onDirectEdit` from `DesignerDraftContext`; Brief tab shows `DomainBrief`; Code tab shows full domain JSON; shown when a frame is selected
- `DesignBoardList.tsx` — (Superseded) Original left panel; replaced by `UniversalSwitcherPanel` from `../panels/`
- `DesignBoardNav.tsx` — (Legacy) Original left panel; superseded
- `DesignBoardKip.tsx` — (Legacy) Original center panel; superseded
- `DesignBoardCanvas.tsx` — (Legacy) Original right panel; superseded by `DesignBoardFrameDetail.tsx`

## 🔄 Data & Behavior
- **Center panel**: `UniversalConversation` (no override). Handles all Kip conversation, draft creation (`KipApi.createDraft`), publish, and dialog restore for `kipMode === "designer"`. Writes to `DesignerDraftContext`. Reads `selectedFrameKey` from `UniversalBoardContext`.
- **Left panel**: `DesignBoardLeftPanel` → `UniversalSwitcherPanel`. Frame key selection and draft status dots come from `UniversalBoardContext` + `DesignerDraftContext` inside the panel.
- **Right panel**: `DesignBoardRightPanel` — loads board-data (frameEntryMap), renders `DesignBoardFrameDetail` when a frame is selected. Reads `activeFrameKey` from `UniversalBoardContext`.
- Right panel (conditional): Frame selected → `DesignBoardFrameDetail`; Board def selected → `BoardDefPanel`; Nothing → `null` → Chronicle renders
- **State distribution**: `activeBoardId`, `selectedBoardDefId`, `audience` stay in `DesignBoard.tsx`. `activeFrameKey`, `messages`, `dialogId` live in `UniversalBoardContext` + `useAgentDialog`. `draftSpecJson`, `draftId`, `isPublishing`, `publishSuccess`, `liveDomainFrame` live in `DesignerDraftContext` (provided at `UniversalBoard` level).
- `DesignBoardFrameDetail` imports `CORE_FRAME_MAP` directly; wraps previewed frames in a `V0ShellProvider` override so draft JSON is visible; six tabs total: Preview (live frame preview + eye icon audience menu + direct edit), Config (frame props + labels), Props (prop library display), JSON (frame-block JSON), Brief (full `DomainBrief`), Code (full domain JSON)

## 🐛 Debug Mode
Design Board debug logging traces draft propagation from Kip → preview. Enable via:

- **Runtime** (browser console): `window.__keeperDebug = window.__keeperDebug || {}; window.__keeperDebug.designer = true`
- **Build-time**: `VITE_DESIGNER_DEBUG=1` in `.env` or `VITE_DESIGNER_DEBUG=1 npm run dev`

When enabled, `[DesignBoard:debug]` logs appear:
- `setDraftSpecJson` — when Kip returns a draft (frameKey, fullSpecKeys, frameBlockKeys)
- `previewDomainFrame updated` — when Canvas receives new draft/live data (activeFrameKey, hasDraftSpec, blockKeys)

## ⚠️ Notes & ToDo
- [x] Component internals renamed: `DesignerFrameNav` → `DesignBoardList`, `DesignerFrameKip` → `DesignBoardFrameList`, `DesignerFramePreview` → `DesignBoardFrameDetail`
- [x] Moment 2.7: Migrated to `UniversalBoard` shell; left panel replaced with `UniversalSwitcherPanel`; center panel refactored to use `KeeperDialogFrame` with `agentName="Design"`; right panel now conditional (frame detail / board def JSON / Chronicle)
- [ ] The admin guard is duplicated: once in `DesignBoard.tsx` (component level) and once in `V0Shell.tsx` (routing level)
- [ ] `Margin` (interaction bar) renders as a `fixed` overlay over the whole board when any frame is previewed — intentional leakage from `DesignFrame`. May want to suppress it in the preview context in a future pass.
- [ ] `DesignBoardList.tsx`, `DesignBoardKip.tsx`, `DesignBoardCanvas.tsx`, `DesignBoardNav.tsx` are now legacy files — safe to delete in a future cleanup pass once no other consumers remain

## 📆 Update Log
### 2026-05-09 — Gap 1: Remove DesignBoardCenter; UniversalConversation handles designer mode
- **`DesignBoardCenter.tsx`**: Deleted. All center-panel concerns now belong to the universal layer.
- **`DesignBoard.tsx`**: Rewritten. Drops center override — `UniversalConversation` handles designer center natively. Drops: `activeFrameKey`, `messages`, `dialogId`, `draftSpecJson`, `draftId`, `isPublishing`, `publishSuccess`, `liveDomainFrame` state — all moved to `UniversalBoardContext` + `DesignerDraftContext`. Adds `DesignBoardLeftPanel` and `DesignBoardRightPanel` sub-components (proper React components so they can call context hooks). `DesignBoardRightPanel` owns `frameEntryMap` loading internally.
- **`DesignBoardFrameDetail.tsx`**: Removed `draftSpecJson`, `onDirectEdit`, `liveDomainFrame` from props. Reads all three from `useDesignerDraft()` (DesignerDraftContext). `onDirectEdit` now calls context setters directly.
- **`UniversalConversation.tsx`** (universal layer): Added `"designer"` branch. Reads `selectedFrameKey` from `UniversalBoardContext`. Reads/writes `DesignerDraftContext` for draft state. Adds `DraftBar` component above `KeeperDialogFrame`. Adds dialog restore effect on `selectedFrameKey`/`domainId` change. Syncs `liveDomainFrame` from V0Shell to context. Owns `handleDesignerDraft` and `handlePublish`. Disables composer when no frame is selected.
- **`../panels/UniversalSwitcherPanel.tsx`** (universal layer): Removed `activeFrameKey`, `draftSpecJson`, `liveDomainFrame`, `onSelectFrame` props. Now reads all four from `useUniversalBoardOptional()` and `useDesignerDraftOptional()` internally.
- **`../UniversalBoardContext.tsx`** (universal layer): Added `selectedFrameKey: string | null` to `UniversalBoardSelection`. Added `onFrameSelect: (key: string) => void` to `UniversalBoardActions`.
- **`../DesignerDraftContext.tsx`** (new, universal layer): Thin state bus providing `draftSpecJson`, `draftId`, `isPublishing`, `publishSuccess`, `liveDomainFrame` + setters. Provided by `UniversalBoard` above all three panels.
- **`../UniversalBoard.tsx`** (universal layer): Wraps with `DesignerDraftProvider` (alongside existing `UniversalBoardProvider`).
- **`../../hooks/useAgentDialog.ts`**: Added `clearDesignerDialog()` and `setDesignerDialogId()` to result — used by `UniversalConversation` for dialog restore on frame change.

### 2026-05-08 — Live Props Library wired to FrameInstance
- **`DesignBoard.tsx`**: Exported `FrameProp` type (`{ id, type, config }`). Added `FrameEntry` internal type. Added `frameEntryMap` state loaded from `GET /api/domains/:domainId/board-data` when `domainId` resolves — maps `frame.name.toLowerCase()` → `{ boardId, frameInstanceId, props }`. Added `activeFrameEntry` memo derived from `activeFrameInfo`. Added `handleAddProp` callback: builds new `FrameProp`, optimistically updates `frameEntryMap`, persists via `PATCH /api/boards/:boardId/frames/:frameId`. Threads `frameInstanceProps` and `onAddProp` into `DesignBoardFrameDetail`.
- **`DesignBoardFrameDetail.tsx`**: Imported `FrameProp` from `./DesignBoard`. Replaced static `PropEntry` type with `CatalogItem` (adds `propType` and `propConfig` fields). Added add configs to all 10 catalog items (extracted from `board-studio-page.tsx` prop handlers). Replaced static `PropsTabContent` with live version: shows "Added (N)" section at top with current props, shows catalog below with `+` add buttons and loading indicator, disables gracefully with "Connecting to frame…" when `onAddProp` is null. Added `frameInstanceProps: FrameProp[]` and `onAddProp` to props interface. Added "Frame Components" section to Preview tab — appears below the direct-edit hint when props exist, max-height 180px with scroll, reflects immediately on add via optimistic update.

### 2026-05-08 — Color compliance pass
- **`DesignBoardFrameDetail.tsx`**: Replaced hardcoded hex colors in `JsonTabContent` syntax highlighting with `hsl(var(--theme-*))` variables, matching the `CodeTabContent` pattern exactly. Replaced hardcoded hex colors in `PROP_SECTIONS` by changing `PropSection.color: string` to `PropSection.colorVar: string` (holds a CSS custom property name); rendering updated to `hsl(var(${section.colorVar}))` and `hsl(var(${section.colorVar}) / 0.08)` for tinted backgrounds.
- **`DesignBoardCenter.tsx`**: Replaced raw HSL values in `DraftBar` (success green / warning amber) and error display (error red) with `hsl(var(--theme-status-{success|warning|error}, <fallback>))` — forwards to CSS variable when defined, falls back to the original HSL values.
- **`DesignBoard.tsx`**: Replaced raw HSL values in `BoardDefPanel` "admin only" badge with `hsl(var(--theme-status-warning, <fallback>))` using the same pattern.

### 2026-05-06 — True Migration: center panel cleanup + Brief/Code tabs to right panel
- **`DesignBoardCenter.tsx`**: Full rewrite. Removed `CenterPanelMode` type, `ModeTabBar` component (frames/brief/code switcher), `FrameRail` component (horizontal pill chips), `FrameListContent` component, all `dialogContent` prop branching, duplicate `DraftBar` instances. `KeeperDialogFrame` now renders natively — composer is anchored at bottom, identical to IDE/Agent/Domain boards. Single `DraftBar` placed above the conversation banner. Removed props: `onSelectFrame`, `onClearFrameSelection`, `domainSlug`, `density`, `onDensityChange`. Zero hardcoded colors.
- **`DesignBoardFrameDetail.tsx`**: Added `"brief"` and `"code"` to `TabKey` union; added both to `TABS` array (six tabs total). Added `BriefTabContent` (renders `DomainBrief` for domain-wide context) and `CodeTabContent` (renders full domain JSON with theme-variable syntax highlighting, using `previewDomainFrame` so draft is visible). Imported `DomainBrief`. Converted all inline hardcoded colors to `hsl(var(--theme-*))` tokens throughout: header, tab bar, Config labels/badges, Props labels, JSON background, JSON empty-state, Preview audience bar, direct-edit hint, EditPopup chrome, no-frame-selected idle state.
- **`DesignBoard.tsx`**: Removed `onSelectFrame`, `onClearFrameSelection`, `domainSlug`, `density`, `onDensityChange` from `DesignBoardCenter` call site. `density` state retained (read-only from localStorage) to keep `data-density` attribute applied to `<html>`.

### 2026-05-06 — Moment 2.7: Migration to UniversalBoard
- **`DesignBoard.tsx`**: Rewritten. Removed custom StyleScope / KeeperTopBar / DomainBriefSlideOver / panel layout — all owned by `UniversalBoard` now. Wraps `UniversalBoard` with `left` / `center` / `right` render props. Added `selectedBoardDefId` state (drives right panel board-def view). Admin guard preserved. Density state preserved; surfaced via switcher in `DesignBoardCenter` header instead of separate sub-bar.
- **`DesignBoardCenter.tsx`** (new): Center panel. `KeeperDialogFrame` shell with `agentName="Design"`. Mode switcher (frames / brief / code) + density control at top. Frame rail (horizontal pill chips) in banner zone when frame active. Full `handleSend` logic with `dialog_board: "designer"` preserved. `dialogContent` prop controls Zone 2 across all three modes. Zero hardcoded colors.
- **`../panels/UniversalSwitcherPanel.tsx`** (new): Left panel. Two static sections — Frames (from `BOARD_FRAMES[activeBoardId]` with live/draft status dots) and Board Definitions (all four defs from `UniversalBoardDefinition.ts`). No fetching. Zero hardcoded colors.
- **Right panel**: Now a conditional render prop. Frame selected → `DesignBoardFrameDetail` (unchanged). Board def selected → inline `BoardDefPanel` (JSON + structure). Nothing selected → `null` → Chronicle (`UniversalViewPanel`) renders automatically.
- **Composer label**: Always "Design" — via `agentName="Design"` on `KeeperDialogFrame`.
- **API**: `POST /api/domains/:domainId/kip/designer` — unchanged.

### 2026-04-01 — Studio vs stage: Designing label, live/draft dots, Dialog context
- **`DesignBoardFrameList.tsx`**: "Designing" label above the frame list; 6px green/amber status dot per row (draft vs `liveDomainFrame` via `draftSpecJson`); designer Kip requests send `dialog_board: "designer"`.
- **`DesignBoard.tsx`**: Passes `draftSpecJson`; dialog resolve uses `board=designer` (was `domain`).

### 2026-03-31 — Brief mode: replace placeholder with DomainBrief
- **`DesignBoardFrameList.tsx`**: Brief mode now renders `<DomainBrief domainFrame={liveDomainFrame} />` (same component as DomainBoard). The old placeholder ("Editable domain configuration. Coming soon.") is removed. Kip draft bar remains below the Brief component.

### 2026-03-30 — Design Board center panel modes (frames / brief / code)
- **`DesignBoardFrameList.tsx`**: Replaced non-functional dialog/preview toggles with `centerPanelMode`: `frames` (existing navigator + Kip), `brief` (Domain Brief placeholder), `code` (formatted read-only domain JSON from `liveDomainFrame`). Kip composer stays at bottom in all modes; designer API uses `activeFrameKey ?? "cover"` when no frame is focused.
### 2026-03-25 — Preview, publish staleness, click-to-edit
- **`DesignBoard.tsx`**: Temporary `[publish]` `console.log` diagnostics in `handlePublish`. Before `publishDraft`, always `KipApi.updateDraft(..., { spec: draftSpecJson })` so the DB draft matches the latest in-session JSON after multiple Kip turns.
- **`DesignBoardFrameDetail.tsx`**: Preview wrapper `pointerEvents: "auto"` (overlay still captures clicks at `z-index: 10`). Loose text matching in `handleOverlayClick`. Direct-edit string leaves for Board Cover also walk `theme` (tagline lives there); `EditPopup` / `handleEditSave` support optional `blockKey` for patches outside the frame block.
- **`cover-frame.tsx` / `CoverBody.tsx`**: Designer Board preview detected via `buildFrameUrl("cover") === "#"` (matches `FramePreviewShell` stub). Skip cover-image `apiFetch` fallback in that context; prefer `domainFrame.theme` for closed/open header copy so Kip tagline updates show without reload.
### 2026-03-25 — Designer contrast + density (paper palette, chat legibility)
- **Contrast**: Warm off-white surfaces (`#fdfbf7` / `#f5f2eb` / `#fefdfb`), stone-800/900 body text (`#44403c`–`#1c1917`), stronger borders (`#e7e5e4` / `#d6d3d1`). Kip thread bubbles and chat chrome no longer rely on theme CSS variables that could read as low-contrast. Removed `opacity: 0.45` from the “no frame selected” chat footer (was washing out placeholder and labels). `.design-board-chat-input::placeholder` in `index.css` uses `#78716c` at full opacity.
- **Density**: `index.css` now applies `zoom: var(--density-scale)` on `.keeper-design-board-scope .density-content` so Compact/Default/Comfortable visibly rescale px-based Tailwind sizes (previous `font-size` on the wrapper did not affect `text-[13px]` etc.). Scales: compact `0.86`, default `1`, comfortable `1.15`.
### 2026-03-25 — Designer UX pass (density, left panel, center focus, audience menu)
- **Density**: Banner segmented control (Compact / Default / Comfortable); persists `keeper-density` in `localStorage`; `data-density` on `<html>`; global CSS in `apps/web/src/index.css` (`--density-scale` + `zoom` on `.density-content`); early read in `apps/web/index.html` to reduce flash.
- **Left panel**: Frame selection no longer sets `leftCollapsed`; chevron toggle unchanged.
- **Center**: When a frame is selected — horizontal frame rail, context banner (name, role badge, Live/Draft, title from domain JSON when present), full-height Kip thread + active input; "← All Frames" clears selection; when none selected — full list + subdued disabled chat with placeholder "Select a frame to begin".
- **Right Preview**: "Viewing as" segment control replaced by eye icon + Radix dropdown (Guest / Keeper / Admin) with checkmark; audience dot on icon; `setAudience` behavior unchanged.
- **Types**: `buildFullSpec` / draft spec casts use `unknown` intermediates where required by strict TS.
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

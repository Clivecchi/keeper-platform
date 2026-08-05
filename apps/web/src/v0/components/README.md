# V0 Components

## 📌 Purpose
View components for the V0 surface: cover frame and moment diary frame, with no backend wiring.

## 🧱 Key Files
- `DomainSwitcher.tsx` – Domain travel list popover (top-left Playbill slot; `/home` and domain boards).
- `LocationStrip.tsx` – Read-only Playbill-style location strip (legacy; superseded by `PlaybillHeaderCard` on `/home`).
- `PlaybillHeaderCard.tsx` – Top-bar anchor card (opens domain switcher on all boards including `/home`).
- `PlaybillCard.tsx` – Playbill travel card in The Playbill dropdown.
- `playbillVisual.tsx` – Shared ambient blur + agent portrait layers.
- `DomainFeed.tsx` – Domain activity feed (kept moments, journey summaries); empty copy from `commons.messaging.feed` when set.
- `StoryScroll.tsx` / `StoryScroll.types.ts` – Schema-driven inline narrative editor (edit buffer + `onChange`); optional Kip bar (`sendPrompt` / `onKipMessage`). See `StoryScroll.example.tsx` for usage (documentation-only).
- `DomainBrief.tsx` – Domain Board Brief mode: human-readable form for core domain frame JSON (identity, theme, audience, Kip, cover chat); local draft with Publish via `PATCH /api/domains/:slug/frame` and `reloadDomainFrame`.
- `cover-frame.tsx` – Album/storybook-inspired cover with imprint, title, liner notes, and setlist routes.
- `moment-frame.tsx` – Moment diary preview frame with close loop back to the cover.
- `kept-moments-frame.tsx` – Minimal list view for recently kept moments.
- `FooterTrail.tsx` – Frame footer trail showing recent actions and navigation.
- `Margin.tsx` – Persistent bottom bar split into `BottomBarLeft` (Forward) and `BottomBarRight` (Sign In, Kip), with a `ScrollUpHint` chevron decoration above the bar border.
- `SidebarCard.tsx` – Pure data-driven context card for sidebar panels. Items are `SidebarCardItem[]` (static bullets or clickable links). Supports `onAdd` affordance ("+" button next to title) for entity creation. No custom children.
- `WorkspaceHeader.tsx` – Consistent header for workspace mode panels (eyebrow, title, description, divider).
- `SidebarWorkspaceLayout.tsx` – Responsive two-column layout shell: sidebar + workspace grid.
- `PromptedActionCard.tsx` – State-driven action nudge card for sidebar panels. Distinct visual treatment (left accent border, compact layout, inline action links, "?" help affordance). Surfaces unfinished work, pending reviews, and agent insights.
- `PanelErrorBoundary.tsx` – Per-panel error isolation on Universal Board (Nav · Dialog · Chronicle); theme-token fallback with Try again / Refresh.

## 🔄 Data & Behavior
- Cover uses local mock routes and constants for spacing/type scale; mobile-first with a two-column desktop “spread.”
- Routes are keyboard-focusable buttons with hover/focus affordances and optional description lines.
- Moment frame keeps the existing close-to-cover behavior via `?frame=cover`; content is local state only.

## ⚠️ Notes & ToDo
- [ ] Swap mock routes for real record data when available.
- [ ] Add light motion or texture tokens shared with the moment frame.
- [ ] Consider a selected-route state once navigation is wired.

## 📆 Update Log
- 2026-08-04: **Mobile Top Bar Chronicle icon** — Adaptive mobile right slot is Chronicle (`BookOpen` → `onOpenChronicle`); avatar relocated to Nav drawer. Desktop Top Bar avatar unchanged.
- 2026-08-03: **Treatment title mark** — `SidebarCard` section titles use `.keeper-treatment-title` so Nav accent shell can apply Treatment font to headers only.
- 2026-07-28: **Playbill name flash** — cards/header use `starName` from `resolvePlaybillStarName` (no second `…` gate); name paints from `leadAgentName` while portrait loads.
- 2026-07-28: **Restore Realm/Boards on `/home`** — `KeeperTopBar` again shows workspace board links (Realm · Domain · Agent, etc.) and Brief on the home shell; Jul 3 blanking had left an empty nav row and blocked domain/agent config jumps.
- 2026-07-28: **Playbill Path A — name-only chip** — Mobile top bar is a compact domain-name chip (optional LIVE dot + chevron); full Playbill travel list stays the existing light overlay. Density-pass desktop card unchanged.
- 2026-07-28: **One identity bar + Nav drawer** — Adaptive mobile: Playbill shows LIVE; Dialog identity banners suppressed; hamburger opens Nav drawer; top board-link row hidden. Density-pass Playbill card sizing kept.
- 2026-07-27: **Playbill header mobile density** — `PlaybillHeaderCard` on ≤767px shows domain name + compact portrait (no presents/role stack); `minHeight` 44. `KeeperTopBar` uses `PLAYBILL_ANCHOR_MAX_WIDTH_MOBILE` and hides name/ADMIN meta (avatar-only). Desktop header card unchanged.
- 2026-07-25: **Playbill mobile dropdown density** — overlay `PlaybillCard` rows on ≤767px use tighter padding (`py-1.5`), `text-[14px]` name, and `PlaybillAgentPortrait` size `compact` (36px). List gap/pad reduced via `index.css` media query. Desktop row sizing unchanged.
- 2026-07-24: **cast-select-must-not-change-atmosphere** — `KeeperTopBar` cover uses shell theme only when `domainData.slug` matches the current shell slug (soft-switch race guard).
- 2026-07-17: **InlineDeleteRow + SidebarCard delete** — extracted shared confirm row (`InlineDeleteRow.tsx`, same tokens as IDE Draft delete); `SidebarCardItem` supports hover trash → confirm/cancel for Nav hard-delete (Dialogs).
- 2026-07-12: **Playbill portraits** — `resolvePlaybillAgent` uses `KipApi` + Chronicle `/api/agents/:id` enrichment; avatar reads `presenceSchema`, `config.avatar`, and `resolveCoverAvatarDisplay` (same path as Agent cover).
- 2026-07-12: **Playbill quality pass** — dropdown anchors under header card (not fixed modal); travel rows show only presents / agent / role; whole row is Enter; portraits resolve from `presenceSchema` + `config.avatar` (emoji fallback).
- 2026-07-11: **v2 Section 2 placement** — `/home` uses `PlaybillHeaderCard` + DomainSwitcher overlay (not read-only `LocationStrip`); dropdown width matches anchor card (`PLAYBILL_ANCHOR_MAX_WIDTH`); Playbill lead slug via `resolvePlaybillLeadAgentSlug` (canonical bindings e.g. ke3p → kip).
- 2026-07-10: **Arrival presentation** — `/home` uses read-only `LocationStrip`; Playbill rail in Chronicle (`RealmPlaybillRail`); `PlaybillAmbientLayer` `contained` mode for contrast-safe location strip.
- 2026-07-10: **Playbill in top bar** — `PlaybillHeaderCard` on domain boards; realm uses `LocationStrip` instead.
- 2026-07-10: **Playbill wireframe alignment** — `PlaybillCard` compact header card (no cover hero); human role subtitles; explicit Enter; panel titled "The Playbill". `KeeperTopBar` restores **Home** nav link to `/home` from domain boards.
- 2026-07-08: **Playbill pattern** — `PlaybillCard` replaces duplicate domain picker cards (`DomainSwitcher`, mobile `RealmScreen`); lead agent from `frame_json.kip.agent_id`, stats from `GET /api/domains/:id/stats`, greet continuity via `playbillGreetContinuity`.
- 2026-07-07: `Margin` guest Sign In builds `next` via `buildRealmBoardPath` (`/?board=domain` on livecchi.us) — avoids HostnameSlugGuard redirect flicker after login.
- 2026-07-03 (pm): Domain header always shows wordmark + chevron domain picker on all boards including `/home`; removed separate Home label/link.
- 2026-07-03: `KeeperTopBar` — decoupled Home at `/home`: domain mode prepends `{homeDisplayName}` link via `navigateHome()`; home mode shows user Home label as wordmark with optional anchor-domain workspace link; Brief hidden on Home shell; fallbacks when shell context fields not yet wired.
- 2026-07-03: `KeeperTopBar` — workspace tabs filtered by domain slug (`domainWorkspaceBoards`; IDE/Design on KE3P / `default` only).
- 2026-07-02: **Public cover dark flash fix** — guests default to `gray-earth` (not Warm Dark `neutral`); V0Shell bootstraps `domain-resolved` tokens synchronously from default frame JSON before async fetch; `DesignFrame` uses `suppressAtmosphere` (single StyleScope); cover card uses lighter glass surface.
- 2026-06-27: `DomainSwitcher` — Step 1.2 add-domain form (`DomainAddPanel`); fixed picker ink via `domainSwitcherTheme.ts`.
- 2026-06-27: `DomainSwitcher` — cover thumbs (72px), slug-hash placeholder gradient + initials watermark, dark panel surfaces, light-on-cover typography.
- 2026-06-27: `DomainSwitcher` — fixed unreadable text (`--theme-ink-*-color` tokens instead of raw HSL component vars); scrollable domain list when long.
- 2026-06-24: Margin guest Sign In now returns to `?board=domain` (Domain Board) instead of forcing legacy `?frame=agent`.
- 2026-06-23: `KeeperTopBar` — top inset padding, restored identity/nav divider line, user block vertically centered with avatar (CSS layout classes).
- 2026-06-23: `KeeperTopBar` header polish — larger wordmark/tagline, safer user-name truncation with right inset, profile popover contrast via header token CSS classes (`index.css`).
- 2026-06-22: Added `PanelErrorBoundary.tsx` — isolates Nav, Dialog, and Chronicle crashes on Universal Board; pairs with composer draft autosave.
- 2026-06-14: `SidebarCard` — optional `collapsible` / `defaultCollapsed` for nav sections; chevron toggle on title row.
- 2026-06-12: `KeeperTopBar` calls `switchWorkspace` from V0Shell (single URL authority); active tab from `workspaceBoardId`.
- 2026-06-10: `KeeperTopBar` workspace board tabs use `setSearchParams` (not `navigate`) and strip `?boardDef=` when leaving Design so top-bar switches are not blocked after Design nav selection.
- 2026-04-28 (Prompt 5): Added `panels/` subdirectory with `KeeperJourneyPanel.tsx` — self-contained Journey view state panel (living document layout). See `panels/README.md`.
- 2026-04-01: Added `DomainBanner.tsx` (slim Domain Board center header: wordmark, tagline, live pulse from `theme.colors.primary`, journey/moment stats) and `DomainFeed.tsx` (kept moments + public journey activity via existing APIs; empty state from `commons.messaging.feed` when present). Both use `--theme-*` tokens under `StyleScope`.
- 2026-03-31: Added `StoryScroll` neutral narrative editor (`StoryScroll.tsx`, `StoryScroll.types.ts`, `StoryScroll.example.tsx`) — inline `{fieldId}` prose fields, grace note, crumb bar, internal change buffer; no persistence or domain coupling.
- 2026-03-31: Added `DomainBrief.tsx` for Domain Board Brief mode — accordion sections, theme tokens (`--theme-*`) for chrome, domain JSON colors for swatches / section dots / change indicator / active pills.
- 2026-03-25: CoverFrame: Designer Board preview detection (`buildFrameUrl("cover") === "#"`); skip authenticated cover-image refetch in that shell; prefer `domainFrame.theme` wordmark/tagline for header when in preview so draft JSON drives the right-panel preview.
- 2026-02-28: CoverFrame: (a) hide header imprint when domain name matches platform brand to avoid duplicate KE3P; (b) add solid cover surface (92% opacity) for readable content; (c) CoverBody shows domain name + tagline together when loaded, subtle loading bar when placeholder.
- 2026-02-23: CoverFrame now renders domain cover image as full-page background when `domainData.theme.coverImage` is present. DomainData interface extended with optional `theme`.
- 2026-02-19: Margin: Composer full-width on top; Act, Kip, kip-old below. Bar height 180px when composer shown. AgentComposerContext provides state from AgentBoardFrame.
- 2026-01-27: Renamed the Explore margin action to Act and kept Kip accessible for public users.
- 2026-01-24: Replaced type-only React import in cover frame to avoid runtime `React` reference.
- 2026-01-19: Refined margin bar styling to feel embedded and subtle.
- 2026-01-19: Added Margin component for persistent bottom actions.
- 2026-01-19: Added Index shortcut action to the v0 footer trail navigation.
- 2026-01-18: Routed v0 frame close/back actions through the v0 shell.
- 2026-01-18: Added domain home board diagnostics and snapshot details.
- 2026-01-18: Added `FooterTrail` to render recent navigation/actions with quick frame links.
- 2026-01-01: Added cover and moment frames for V0 surface polishing.
- 2026-01-02: Tightened moment frame padding (7px top/bottom), header spacing, and aligned the close button positioning with navbar icon spacing.
- 2026-01-02: Set moment frame textarea text color to rgba(128, 128, 128, 1), added 1px border in rgba(138, 114, 106, 1), and reduced header-to-body gap.
- 2026-01-02: Swapped the moment frame ruled background for a radial gradient with text clipping, set container text to white, and updated the textarea border to rgba(227, 197, 181, 1).
- 2026-01-02: Locked the moment textarea border to solid 1px with rgba(227, 197, 181, 1) to persist preview styling.
- 2026-01-02: Anchored the nav chevron within a 5xl container and moved the close button inside the moment frame header container with padding to keep Keeper text aligned on resize.
- 2026-01-02: Aligned the navbar chevron to the left edge, kept the close button and Keeper label in the same flex row to prevent wrap on resize, and restored the Kip reply bubble icon in the footer.
- 2026-01-02: Restored close button to absolute top-right of the moment frame with added header top padding for separation; re-anchored nav chevron to the right end of the platform bar.
- 2026-01-02: Pinned the close button to the absolute top-right (above the header), added top margin to the header stack, and added a persistent bottom-right Agent bubble entrypoint.
- 2026-01-02: V0 Cover and Moment now consume canonical `--theme-*` CSS vars for surfaces/ink/borders/ruled lines; Diary Paper theme seed added for warm defaults.
- 2026-01-02: Refined Moment paper structure: split writing/footer regions to prevent overlap, aligned textarea to ruled lines via `--moment-line-step`, and replaced the large Agent bubble with a calm Kip footer control.
- 2026-01-14: Added kept moments frame for domain verification.
- 2026-01-15: Added DiagnosticsFrame for unified diagnostics access in V0 surfaces.
- 2026-01-17: Bootstrapped moment drafts in `moment-frame` before rendering the editor and added a calm error state.
- 2026-01-17: Rendered the moment editor immediately with background draft bootstrap and status pill updates.
- 2026-01-24: Swapped the margin action to show Login for guests and Kip for authenticated users.
- 2026-01-24: Added an authenticated cover-top profile menu for legacy/logout/root access.
- 2026-01-25: Routed Legacy UI to the authenticated `/root` dashboard and gated it to admin users.
- 2026-01-25: Replaced legacy menu links with Settings and Domain Admin destinations.
- 2026-02-09: Extracted `SidebarCard`, `WorkspaceHeader`, and `SidebarWorkspaceLayout` as reusable frame primitives from CommonsFrame. These are composable building blocks for any frame that needs a sidebar + workspace layout.
- 2026-02-09: Removed `children` from `SidebarCard` (pure data card only). Added `PromptedActionCard` for state-driven contextual action nudges with distinct visual treatment (left accent border, inline action links, help affordance).
- 2026-02-09: Refactored `SidebarCard` items from `string[]` to `SidebarCardItem[]` — each item can now be a static bullet or a clickable link (with `onClick`). Added `onAdd` prop rendering a "+" button next to the card title for entity creation. Removed `actionLabel` and `onAction` props — navigation now happens through item clicks and the "+" affordance.
- 2026-03-04: Margin: Split bottom bar into `BottomBarLeft` (Forward, left-justified) and `BottomBarRight` (Sign In then Kip, right-justified). Added `ScrollUpHint` — a subtle stacked double-chevron SVG decoration floating just above the bar border.
- 2026-03-15: Margin: Aligned interaction bar form with DesignFrame header (banner): `backgroundColor` 0.96 opacity, `backdropFilter` 8px, added `boxShadow` for hard bottom boundary — interaction bar now matches top banner as definitive frame boundary.
- 2026-05-21: jsonframe Step 3 — `interaction_bar.labels` drives InteractionBar copy; right cluster order from `secondary` + `auth[audience]` (guest: Kip · Sign In); admin Settings wired. Rendr TODO for JSON-driven left/right layout. Step 4 — `companion=1` auto-opens CompanionSlide after guest redirect from `?frame=agent|kip`.

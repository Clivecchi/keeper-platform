# Commons Frame

## 📌 Purpose
Provides the primary logged-in domain board experience with a stable Commons layout (Banner, Context, Workspace) and an open-ended view model for workspace content. Sidebar items are clickable, loading entity details directly in the workspace.

## 🧱 Key Files
- `CommonsFrame.tsx`

## 🔄 Data & Behavior
Fetches live domain data (journeys, keepers, moments, members when permitted) to populate Commons Banner (scrolling user card), Commons Context, and Workspace content. The Workspace uses `useWorkspaceView` to manage a `WorkspaceView` discriminated union (`feed | entity | create | summary`) serialized to URL search params. Sidebar items are clickable — clicking a journey or keeper loads its detail view in the workspace. A "+" affordance on Journeys and Keepers cards triggers inline creation forms. Feed moments are clickable to open entity detail. The sticky Commons Cover shows identity only and inherits menu/config controls when the Commons Banner scrolls fully out of view.

## ⚠️ Notes & ToDo
- [ ] Confirm action frame activation triggers once the first domain action is defined.
- [ ] Refine feed source once domain-scoped moment endpoints stabilize.
- [ ] Replace `alert()` in build submit flow with toast notifications.

## 📆 Update Log
- 2026-02-01: Added clickable cut line and made the cover flush to the top.
- 2026-02-01: Added a subtle Commons Cover background shift on inheritance.
- 2026-02-01: Moved the domain config gear into the Commons Banner and inherit it on scroll.
- 2026-02-01: Split Commons Cover (sticky identity) from Commons Banner (user card) with control inheritance on scroll.
- 2026-02-01: Restored the sticky header with domain title and menu controls.
- 2026-02-01: Added user menu and moved theme under a banner gear menu.
- 2026-02-01: Removed the Commons frame header so the banner owns top identity.
- 2026-02-01: Removed commons banner body copy in favor of a soft tagline overlay.
- 2026-02-01: Added commons cover image support and banner settings area for admins.
- 2026-02-01: Reframed Commons into Banner/Context/Workspace regions with experience-driven Workspace modes.
- 2026-01-31: Reworked Commons feed into a single cohesive surface with a domain hero.
- 2026-01-31: Added engagement action buttons to the Commons Action Frame.
- 2026-01-31: Wired Commons feed and anchors to live domain data and navigation.
- 2026-01-27: Rebuilt Commons layout with a dominant feed, anchor cards, Kip guide, and subtle admin access.
- 2026-01-25: Added the Commons frame as the default authenticated domain surface.
- 2026-02-05: Adopted `useFrameContext()` for authoritative domain and active journey. Added journey breadcrumb label derived from shell context.
- 2026-02-09: Inline Build workspace forms — clicking "Start journey" or "Capture moment" now renders the engagement form inline in the Build workspace instead of opening a modal overlay. Added `buildIntent` state, `handleBuildActivate`/`handleBuildSubmit`/`handleBuildCancel` handlers, and passed `onActivate` to all `EngagementButton` instances.
- 2026-02-09: Refactored to use extracted primitives: `SidebarCard`, `WorkspaceHeader`, `SidebarWorkspaceLayout`, and `useWorkspaceMode`. Removed inline `renderCard()`, `renderWorkspaceHeader()`, and manual `useSearchParams` mode management. CommonsFrame is now composed from shared building blocks reusable by other frames.
- 2026-02-09: Removed redundant sidebar cards (Workspace modes, Kip, Ways to contribute, Admin tools). Sidebar now contains only data-driven context cards (Journeys, Relationships, Keepers) plus a `PromptedActionCard` with mock state-driven nudges. Workspace modes remain as platform infrastructure via `useWorkspaceMode` but are no longer user-facing UI — mode transitions are driven by user actions.
- 2026-02-09: Removed Start journey and Capture moment buttons from the Banner. Sidebar card actions now open in the workspace (switch to Reflect mode) instead of navigating to separate frames. "Capture a moment" is now a subtle inline affordance at the bottom of the Observe feed, triggering the Build workspace inline form.
- 2026-02-09: **Workspace View Model Refactor** — Replaced fixed `useWorkspaceMode` (observe/focus/build/reflect) with `useWorkspaceView` discriminated union (`feed | entity | create | summary`). Sidebar journey/keeper items are now clickable, loading entity detail views directly in the workspace. "+" affordances on Journeys and Keepers cards trigger inline creation forms. Feed moments are clickable to open entity detail. Renamed renderers: `renderObserveWorkspace` → `renderFeedWorkspace`, `renderFocusWorkspace` → `renderEntityView`, `renderBuildWorkspace` → `renderCreateWorkspace`, `renderReflectWorkspace` → `renderSummaryWorkspace`. Removed `COMMONS_EXPERIENCES` constant and `CommonsExperience` type.

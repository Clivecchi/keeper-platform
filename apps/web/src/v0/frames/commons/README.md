# Commons Frame

## 📌 Purpose
Provides the primary logged-in domain board experience with a stable Commons layout (Banner, Context, Workspace) and experience-driven workspace modes.

## 🧱 Key Files
- `CommonsFrame.tsx`

## 🔄 Data & Behavior
Fetches live domain data (journeys, keepers, moments, members when permitted) to populate Commons Banner (scrolling user card), Commons Context, and Workspace content. The Workspace is an experience container driven by the `experience` query param and renders Observe, Focus, Build, or Reflect modes. The sticky Commons Cover shows identity only and inherits menu/config controls when the Commons Banner scrolls fully out of view.

## ⚠️ Notes & ToDo
- [ ] Confirm action frame activation triggers once the first domain action is defined.
- [ ] Refine feed source once domain-scoped moment endpoints stabilize.

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

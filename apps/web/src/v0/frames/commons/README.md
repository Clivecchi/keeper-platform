# Commons Frame

## 📌 Purpose
Provides the primary logged-in domain board experience with a stable Commons layout (Banner, Context, Workspace) and experience-driven workspace modes.

## 🧱 Key Files
- `CommonsFrame.tsx`

## 🔄 Data & Behavior
Fetches live domain data (journeys, keepers, moments, members when permitted) to populate Commons Context and Workspace content. The Workspace is an experience container driven by the `experience` query param and renders Observe, Focus, Build, or Reflect modes. Observe renders a continuous feed surface with dividers rather than cards.

## ⚠️ Notes & ToDo
- [ ] Confirm action frame activation triggers once the first domain action is defined.
- [ ] Refine feed source once domain-scoped moment endpoints stabilize.

## 📆 Update Log
- 2026-02-01: Added commons cover image support and banner settings area for admins.
- 2026-02-01: Reframed Commons into Banner/Context/Workspace regions with experience-driven Workspace modes.
- 2026-01-31: Reworked Commons feed into a single cohesive surface with a domain hero.
- 2026-01-31: Added engagement action buttons to the Commons Action Frame.
- 2026-01-31: Wired Commons feed and anchors to live domain data and navigation.
- 2026-01-27: Rebuilt Commons layout with a dominant feed, anchor cards, Kip guide, and subtle admin access.
- 2026-01-25: Added the Commons frame as the default authenticated domain surface.

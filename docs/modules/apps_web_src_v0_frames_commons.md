# Commons Frame

## 📌 Purpose
Provides the primary logged-in domain board experience, presenting a shared Commons surface with feed, journeys, relationships, and Kip presence.

## 🧱 Key Files
- `CommonsFrame.tsx`

## 🔄 Data & Behavior
Fetches live domain data (journeys, keepers, moments, members when permitted) to populate a cohesive feed surface and anchor cards, and uses v0 shell navigation to open related frames. The Action Frame exposes engagement buttons for creating journeys and moments.

## ⚠️ Notes & ToDo
- [ ] Confirm action frame activation triggers once the first domain action is defined.
- [ ] Refine feed source once domain-scoped moment endpoints stabilize.

## 📆 Update Log
- 2026-01-31: Reworked Commons feed into a single cohesive surface with a domain hero.
- 2026-01-31: Added engagement action buttons to the Commons Action Frame.
- 2026-01-31: Wired Commons feed and anchors to live domain data and navigation.
- 2026-01-27: Rebuilt Commons layout with a dominant feed, anchor cards, Kip guide, and subtle admin access.
- 2026-01-25: Added the Commons frame as the default authenticated domain surface.

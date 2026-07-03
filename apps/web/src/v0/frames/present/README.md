# Present Frame

## 📌 Purpose
Provides a story-first presentation surface that renders the domain board using Presentation world styling.

## 🧱 Key Files
- `PresentFrame.tsx`

## 🔄 Data & Behavior
Wraps the Presentation board renderer inside the v0 shell to deliver a narrative, read-only surface for `/d/:slug` routes. When `?journeyId=` is set, loads public journey detail via `publicJourneyCache` (stale-while-revalidate — no blank flash when Cover prefetched).

## ⚠️ Notes & ToDo
- [ ] Confirm whether Present should remain a v0 frame or become the default board route.

## 📆 Update Log
- 2026-07-02: Present uses shared `publicJourneyCache`; cached journeys render immediately; guest theme via shell `gray-earth`.
- 2026-01-31: Added Present frame to render the Presentation world board.
- 2026-04-26: Wired `Path.prelude` into `mapPublicJourneyToNarrative`. Function now iterates all paths (adding heading + prelude text props) and all moments (previously only the first moment). Prelude renders as a `type: "text"` Frame prop between the path heading and the first moment of that path, via `NarrativeFrameRenderer`.

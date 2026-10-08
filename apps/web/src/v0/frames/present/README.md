# Present Frame

## 📌 Purpose
Provides a story-first presentation surface that renders the domain board using Presentation world styling.

## 🧱 Key Files
- `PresentFrame.tsx`

## 🔄 Data & Behavior
Wraps the Presentation board renderer inside the v0 shell to deliver a narrative, read-only surface for `/d/:slug` routes. When `?journeyId=` is set, loads public journey detail via `publicJourneyCache` (stale-while-revalidate — no blank flash when Cover prefetched). Content is wrapped in `ChronicleTreatmentShell` from `resolveDomainTreatment(domainFrame)` — full Domain Treatment (background, accent, font).

## ⚠️ Notes & ToDo
- [ ] Confirm whether Present should remain a v0 frame or become the default board route.
- [ ] Share, destination, and release are not on this frame. Do not add them until the contract below is the one being built.

## Release contract recovered 2026-10-08
Present is the guest frame `?frame=present` on `/d/:slug`. With `?journeyId=` it loads that journey through the public journey cache and renders `NarrativeFrameRenderer`. Without a journey id it renders `PresentationBoardRenderer` for the Domain. Treatment comes from `domainFrame`. This is not the Cast trace event `presented`, and it is not the Document status `presented`. There is no audience picker, access change, destination, share link, or release action in this module. The public visitor loop still needs a chosen journey or board that a guest can open. That is the whole contract until Chuck extends it.

## 📆 Update Log
### 2026-08-03 — Full Domain Treatment on Present content
- `PresentFrame` resolves Treatment from `domainFrame` and wraps journey + board content in `ChronicleTreatmentShell`.
- Removed hardcoded warm/white presentation chrome so Treatment background owns the surface.

- 2026-07-02: Present uses shared `publicJourneyCache`; cached journeys render immediately; guest theme via shell `gray-earth`.
- 2026-01-31: Added Present frame to render the Presentation world board.
- 2026-04-26: Wired `Path.prelude` into `mapPublicJourneyToNarrative`. Function now iterates all paths (adding heading + prelude text props) and all moments (previously only the first moment). Prelude renders as a `type: "text"` Frame prop between the path heading and the first moment of that path, via `NarrativeFrameRenderer`.

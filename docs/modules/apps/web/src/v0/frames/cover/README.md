# Cover Frame

## 📌 Purpose
Renders the V0 cover lens that launches the Moment editor and links to other domain surfaces.

## 🧱 Key Files
- `CoverBody.tsx`
- `CoverChatInterface.tsx` — Cover threshold tease (orientation + "Talk to Kip"); opens Companion via `?companion=1`.

## 🔄 Data & Behavior
Creates a draft moment on "Write a Moment" and navigates to the Moment frame. Falls back to direct navigation if draft creation fails. Closed cover reads `domainFrame.cover` from shell context; when `chat_interface.enabled` is true and `resolvedAudience` is in `available_to`, `CoverChatInterface` renders below the invitation as a threshold tease (not a full chat thread — diary lives in Companion on Present).

## ⚠️ Notes & ToDo
- [ ] Confirm draft bootstrap error handling for unauthenticated visitors.

## 📆 Update Log
- 2026-08-30: Cover Forward (guest and keeper) opens the selected story on Present (first public journey today). Browse journeys is not Forward. Designer preview still falls back to journeys.
- 2026-08-30: Cover header imprint uses the domain name (`coverImprint.ts`). Card wordmark is unchanged.
- 2026-07-02: Guest Forward uses `publicJourneyCache`; **Browse journeys** secondary link; Cover chat is threshold tease → Companion panel.
- 2026-07-02: Public cover no longer flashes Warm Dark — guests use `gray-earth` style; domain theme tokens bootstrap before frame fetch (see V0Shell + `cover-frame.tsx`).
- 2026-05-21: jsonframe Step 5 — closed cover respects `cover.card.available_to`; journey_invitation path unchanged (theme + forward). TODO: card type variants belong in Universal Board Design View.
- 2026-03-30: `cover.chat_interface` — added `CoverChatInterface` + `mergeCoverChatInterface`; wired in `CoverBody` with audience from `V0ShellContext.resolvedAudience`. Extended `DomainFrameCover` typing; default domain frame JSON includes sample `chat_interface`.
- 2026-03-27: CoverBody — guests: Journey Invitation **Forward** fetches `/api/public/:slug/journeys`, navigates to `?frame=journeys&journey=<firstId>`; authenticated users unchanged.
- 2026-03-25: CoverBody — optional `id` on `domainData` typing; closed-cover fallback uses `domainFrame.theme` when `buildFrameUrl("cover") === "#"` (Designer preview) so tagline/wordmark track shell `domainFrame`.
- 2026-01-27: Updated cover copy to align the Act threshold language for map entrypoints.
- 2026-01-19: Simplified closed cover to identity-only content in the main well.
- 2026-01-19: Added coverState open/closed handling with First Page threshold actions.
- 2026-01-19: Added Index CTA entrypoint to guide users into the table of contents.
- 2026-01-18: Routed cover navigation through v0 shell frame helpers.
- 2026-01-17: Documented cover lens behavior and draft launch flow.

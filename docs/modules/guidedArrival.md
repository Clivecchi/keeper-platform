# Guided Arrival

## 📌 Purpose
Phase 2.1 first-visit experience for domain owners on `?board=domain` or `?board=realm` (desktop Universal Board and mobile Domain Screen). Detects pending arrival, shows domain Cover greeting in Chronicle, opens Dialog with the lead agent from `frame_json.kip`, and marks completion in `domain.settings.arrivalCompleted`.

## 🧱 Key Files
- `GuidedArrivalContext.tsx` — pending detection, lead agent resolve, PATCH completion
- `GuidedArrivalOrchestrator.tsx` — clears nav selection, composer hint, mobile Kip tab focus
- `GuidedArrivalBanner.tsx` — dismissible soft prompt (Dismiss / Got it)

## 🔄 Data & Behavior
- **Pending:** `isGuidedArrivalPending(settings, frame_json)` from `@keeper/shared` — true when `settings.arrivalCompleted === false` or `frame_json.arrival.completed === false` (legacy unset domains are not pending).
- **Provision:** `provisionDomainOnCreate` seeds `arrivalCompleted: false` and `frame_json.arrival.completed: false`.
- **Complete:** `PATCH /api/domains/:id` with `{ settings: { arrivalCompleted: true } }` on Got it or first Dialog send.
- **Dialog:** UniversalConversation / KipScreen use lead agent slug + `kip.greeting` while active; director mode paused for arrival.
- **Chronicle:** `DomainFocusPresence` shows arrival greeting on domain Cover.

## ⚠️ Notes & ToDo
- [ ] Optional journey_spec draft seed on arrival (composer hint used for now)
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2026-06-30: Lead agent display name resolves via shared `useFrameLeadAgentIdentity` (same label as Agent board Configure).
- 2026-07-01: Phase 4C — Guided Arrival activates on `?board=realm` mobile Domain Screen (same lead agent + Kip tab focus as domain board).
- 2026-07-01: Phase 2.1 Guided Arrival — context, orchestrator, banner, board + mobile wiring.

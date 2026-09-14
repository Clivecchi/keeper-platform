Cursor · Domain Cover-as-map V0 (2026-09-13)

Gloss-only. Not a build lock. Does not create Points or mutate the Document.

Locked grammar used: Cover = Place + judged Terrain + few Reaches + Return.

What shipped on Domain · ke3p Chronicle Cover

- Place is unchanged: `EntityCoverPresence` via `DomainFocusPresence` + `domainCoverSchema`.
- Terrain is no longer dead paper. Recent Moments, Moving, and Present enter the existing Chronicle path through `onJourneySelect` / `onMomentSelect`.
- Judgment is real: Cover shows 3 Recent Moments, 3 Moving, 2 Present, in that order. Extra journeys stay in Nav. Other related-section titles are ignored.
- Visual hierarchy stays on the reading plane. Alive/Moving keep the Accent rail. Present recedes (no rail, quieter ink). Not Journey’s bordered widget cards. Not a dashboard.
- Return is the existing Trail / `clearSelection` path. No new back chrome.

What this taught before Agency Cover

- The missing piece was not a new Cover renderer. It was wiring judged lists to the subject already in `resolveChronicleView`.
- Cover can jump to a Moment without walking Journey → Path. Fast Reach. Weaker sense of path. Agency should decide which jumps are beats and which must stay rooms.
- Trail appends a new Domain chip on return instead of rewinding. You land on the map. The history stack gets messy. Agency Return needs this looked at, not a second back button.
- `onMomentSelect` still clears the parent Journey. Cover-as-map does not invent a combined select. Do not grow that for Agency.
- Agency idle is still Domain Cover. This proof is Domain terrain, not an Agency subject.

Do not treat this as the Agency Cover. It is the map grammar proven on ke3p.

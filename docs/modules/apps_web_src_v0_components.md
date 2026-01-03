# V0 Components

## 📌 Purpose
View components for the V0 surface: cover frame and moment diary frame, with no backend wiring.

## 🧱 Key Files
- `cover-frame.tsx` – Album/storybook-inspired cover with imprint, title, liner notes, and setlist routes.
- `moment-frame.tsx` – Moment diary preview frame with close loop back to the cover.

## 🔄 Data & Behavior
- Cover uses local mock routes and constants for spacing/type scale; mobile-first with a two-column desktop “spread.”
- Routes are keyboard-focusable buttons with hover/focus affordances and optional description lines.
- Moment frame keeps the existing close-to-cover behavior via `?frame=cover`; content is local state only.

## ⚠️ Notes & ToDo
- [ ] Swap mock routes for real record data when available.
- [ ] Add light motion or texture tokens shared with the moment frame.
- [ ] Consider a selected-route state once navigation is wired.

## 📆 Update Log
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


# Presents

## 📌 Purpose
Named presentation forms (Cover, Slide, Media, Journey, Moment) rendered as Theatre.js sequences. Objects bring content; Presents name the form; Treatment governs feel. KeeperPresence listens to Theatre values — it never branches on present name.

## 🧱 Key Files
- `types.ts` — `PresentName`, `RenderContext`, `PresentMotionValues`, `resolvePresentForObject()`
- `presentMotionProps.ts` — Theatre prop definitions shared by every Present sheet
- `buildPresentProjectState.ts` — five default Present sequences as Theatre project state
- `defaultSequences.ts` — `getPresentProject()` singleton loader
- `usePresentMotion.ts` — hook + `PresentMotionProvider` / `usePresentMotionValues()`
- `presentMotionStyles.ts` — maps motion values to CSS (primary, secondary, context, etc.)
- `theatre/TheatreStudioLoader.tsx` — dev-only lazy Studio init
- `theatre/initTheatreStudio.dev.ts` — initializes Studio + loads Keeper Presents project

## 🔄 Data & Behavior
- Default catalog ships in code (`DEFAULT_PRESENT_PROJECT_STATE`) — Rendr overrides later via domain JSON
- Each Present maps to a Theatre sheet (`cover`, `slide`, `media`, `journey`, `moment`)
- Sheet instance id = `{objectType}:{objectId}` so concurrent Chronicle selections do not collide
- `@theatre/studio` is dev-only; production bundle uses `@theatre/core` only
- Motion runs when `KeeperPresence` `layout="focus"` and record is loaded; config layout skips animation

## ⚠️ Notes & ToDo
- [ ] Domain-level Present sequence overrides from Rendr (domain JSON precedence)
- [ ] Export edited sequences from Theatre Studio into the default catalog when tuned
- [ ] Wire `context` prop to future feed/journey surfaces beyond Chronicle

## 📆 Update Log

### 2026-05-25 — Theatre.js scaffold (Steps 4–6)
- Added five default Present sequences and project state builder
- Added `present` + `context` props on `KeeperPresence` and `ChroniclePresenceView`
- Wired `PresentMotionProvider` — KeeperPresence responds to Theatre values, not present name
- Studio loader loads Keeper Presents project in dev for visual sequence editing

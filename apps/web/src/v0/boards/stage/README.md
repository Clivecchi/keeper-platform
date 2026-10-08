# Stage posture

## 📌 Purpose
The performance posture of the Board: one place, the work in hand, and the center performance. Curtains support that. They do not each announce a different current.

## 🧱 Key Files
- `stagePlace.ts` — the place name a person entered. Home stays Home.
- `StageSceneHeader.tsx` — orientation. Place, work, and how that relates to the stage.
- `StagePlaceControl.tsx` — Composer control that travels by Domain, using the existing switcher.
- `StageSupportCurtain.tsx` — right curtain: Cast, objects on stage, work in hand.
- `stageCurtain.tsx` — Cast registered by the conversation and read by the curtain.

## 🔄 Data & Behavior
Place comes from the shell (Home, or the Domain that was opened). Work is the selected Dialog title. The stage pass still chooses the reading. Saved stage objects stay on the Domain. Travel uses `DomainSwitcher` and `SceneChange.travelToSlug`.

## ⚠️ Notes & ToDo
- [ ] Cover and Story appear together only when the pass already has both steps.
- [ ] Present and Share from the mockup are not wired. Those actions do not exist yet.

## 📆 Update Log
- 2026-10-07: Stage posture composes place, work, and the performance. Cast moves to the right curtain. The Composer carries place travel.

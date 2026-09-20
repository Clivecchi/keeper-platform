Cursor · Stage Composer Theatre seam (2026-09-20)

Gloss-only. Not a build lock. Code truth for the smallest Stage working slice.

Settled grammar: Stage → Scene → Frame. Present remains an existing Frame condition. What collects multiple Scenes stays unresolved.

What the code actually has today:

Stage is a room, not a Prisma table. `workspaceSurface: "dialog" | "stage"` lives in `UniversalBoardContext`. Composition persists on `Domain.settings.keeperStage` (`KeeperStageComposition`: presences, one `story` filmstrip, theme). The 70% center is not Dialog. When Stage is open, `UniversalConversation` passes `dialogContent={<KeeperStageCanvas />}` into `KeeperDialogFrame`, and Zone 2 unmounts `DialogueMessageList`. The current filmstrip cell fills that space as Theatre Present `"slide"` (`StagePresentationScreen` → `SlideScene` → `StageEngagementSurface`). Composer stays at the bottom as the pit (`data-composer-placement="pit"`).

There is no Scene model. Existing “Scene” names are unrelated: `SlideScene` is a local Stage cell renderer; `SceneChangeProvider` is the domain-travel curtain; `humanTurn.ts` only comments a future Dialog → Scene → Turns seam. Prisma has legacy `FrameInstance` / `FrameConfig` for old Agent Board frames, not Stage.

Frame, in the live Stage path, is the current Slide + Present condition. Present already exists (`cover | slide | media | journey | moment`). Stage always plays `"slide"`. Guest `PresentFrame` is a different public surface and does not replay `keeperStage.story`.

DialogFrame already exists as `KeeperDialogFrame` — the live conversation shell (Banner · Dialog Space · Composer). Legacy `apps/web/src/components/frames/DialogFrame.tsx` is unused on Universal Board (simulated chat).

Composer / Cast / Turn / receipts / Lead:

- Composer: `AgentComposer` inside `KeeperDialogFrame` bottom zone. Same submit path on Stage (`handleDialogSubmit` → `useAgentDialog.sendMessage` → `KipApi.runAgent`). `agentContext.workspaceSurface: "stage"` is injected. After the send finishes, Stage reloads `keeperStage` so `stage.story.layout` can appear.
- Cast: `CastCueBar` / `DirectorCastHeader` / `IntegratedServicesBar` in the Composer footer. Reach (`ReachPalette`) opens in Chronicle, not Composer. Agency fields (`ComposerStageAgency`) appear in the pit only when an agent presence is selected.
- Turn / Lead / capability receipts: owned by `DialogueMessageList` + `ActionReceiptCard`. On Stage those unmount. Visible leftovers: Broadcast Strip while sending; one-line post-run summary atop Composer; if no persisted story, an ephemeral `"now"` filmstrip cell from last user/agent lines. `StageNowBeat` exists and is not mounted. Receipts have nowhere to stand on Stage.

Theatre.js is already first-class for Present motion, not story truth:

- Project: in-memory `"Keeper Presents · tuned"` from `DEFAULT_PRESENT_PROJECT_STATE`. Not persisted on Domain. Studio is dev-only.
- Sheets: `cover`, `slide`, `media`, `journey`, `moment`.
- One object per sheet: `"Presence"` with seven numbers (atmosphere/primary/secondary/context/caption opacity, mediaScale, contentOffsetY).
- Stage cells are not Theatre objects. They instantiate the `slide` sheet with `instanceKey` `stage:{slideId}`. Content comes from `keeperStage.story` / Cover / Now-beat. Theatre plays arrival, then sits.

TypeSafe is already the inexpensive semantic evaluator (`typesafe.evaluate`: noul / choice / score). It is a Kip action, not an animation author. It must not generate Theatre coordinates. The existing seam above Theatre is `KeeperStageComposition` + `workspaceSurface` + Composer/Dialog state (`data-composer-state`, focus, `isSending`). Those can resolve relationships and intentions into bounded values the existing Presence props can perform.

Scene does not need to enter the persisted model for the first slice. The current cell plus a working Dialog overlay is an experiential Scene. Leave multi-Scene collection unresolved.

Smallest seam (do not rewrite Stage): `KeeperDialogFrame` Zone 2. `dialogContent` vs `DialogueMessageList` is the swap that hides work. `data-composer-state` / Composer focus already exist (focus is wired on mobile only). Theatre Presence opacities already recede content. Do not add a Scene table, a second Theatre project, a fourth panel, or a parallel Stage architecture.

Smallest vertical slice that proves “Keeper has somewhere to work while standing on the Stage”:

Viewing the current Slide → engage Composer → that Slide visually yields (existing Theatre/CSS props) → `DialogueMessageList` (receipts, Lead) comes forward in the same frame without leaving Stage → human Turn runs on the existing submit path → idle returns to the same Slide index.

Not yet: generalized Scene system, Theatre-owned story, TypeSafe-driven animation, Present-plays-Stage-story, or collecting multiple Scenes.

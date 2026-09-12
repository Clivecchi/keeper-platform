Cursor · Keeping Choice exercise seam — implementation plan (2026-09-11)

Gloss-only / not a build lock. Plan only. Does not create Points.

Approved next slice: prove Keeping Judgment and Learning Judgment on the Keeping Choice exercise turn. No code in this Gloss.

Agency responsibilities, not a checklist the model must recite. Quiet when obvious. “Determine the Form sufficiently to keep well, or determine that no adequate Form has yet emerged.” Naming a Kind is optional.

Neither judgment forces an action. If proposed Form and proposed learning would write the same source artifact, failed judgment — do not sole.save the source. Do not solve Agent-specific SOLE persistence.

Smallest seam: rewrite `buildKeepingChoiceExercisePrompt` and `formatKeepingChoiceLeadInput` in `packages/shared/src/keepingChoice.ts`. Same helper already injected from `callAIModel`. Optional thin executor skip when `sole.save` content matches the selected direction/label. Tests in `keepingChoice.test.ts`. No schema, UI, new actions, Focus Truth, or SOLE rewrite.

Rollback: revert the shared prompt helper (and the guard if shipped). Offer/persist/UI unchanged.

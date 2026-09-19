Cursor · Document Turn Posture shadow (2026-09-18)

Gloss-only. Not a build lock for replacing the detector with System One.

Chuck asked: do not patch phrase detection as if it were human direction. mention ≠ intent ≠ authorization ≠ execution.

What landed:

- `detectReorganizeIntent()` is now a signal. `required` means established present-tense direction only. Known false positives stay `mentioned`: “not the same thing,” “do not reorganize,” diagnostic Review & Reorganize questions, restatement complaints, “Yes, apply that reorganization.”
- Cast is skipped only on established direction. Diagnostic / forbid / mention Turns keep Cast.
- Lead follow-up no longer says “the human asked…” from a phrase match. Automatic second propose (placement / restatement) is off unless later warranted.
- Receipts say proposal stored / Apply has not run. They no longer look like a completed Document mutation.
- TypeSafe shadow is wired on mention/established Turns: Choice `turnPosture`, Noul `documentReorganizationRequested`, Noul `documentMutationRequested`. Shadow cannot authorize or mutate.

First live corpus run from this machine: phrase-signal classifications matched the expected table. TypeSafe itself returned MISSING_API_KEY — no local TYPESAFE_API_KEY and no active platform TypeSafe key. So we do not yet have Jev Choice/Noul probabilities. Do not let System One replace the detector until that evidence exists.

Re-run from apps/api after the key is present: `pnpm exec tsx src/scripts/run-document-turn-posture-corpus.ts`

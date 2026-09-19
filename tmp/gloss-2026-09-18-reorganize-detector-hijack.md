Cursor · Director reorganize detector hijack (2026-09-18)

Gloss-only. Not a build lock. Inspection only — no fix written.

Chuck asked the Cast a diagnostic about a previous erroneous reorganization, and explicitly: do not reorganize, propose, apply, or modify. Kip still emitted “Let's reorganize Finding the Plot…” and two `document.reorganize.propose` receipts.

Code + live session evidence (ke3p · Finding the Plot · session Document Gloss):

The failure is not Cast misunderstanding. Cast was not on the hijacked Turns. `detectReorganizeIntent()` is a regex with no negation. When it returns `required`, the client skips Cast (`plain_lead`) and the Lead prompt + follow-up machinery force `document.reorganize.propose`.

Three hijacks, same session:

1. 01:41 — Chuck’s System One staging note. The phrase that fired the detector was “Model and Provider are not the same thing.” Pattern: `(the )?same (document|thing|proposal)`. That pattern was written for restatement complaints. It heard an architectural distinction.
2. 02:23 — same note resent. Same match. Same forced propose, twice (spine-only then placement follow-up).
3. 02:27 — the diagnostic itself. Chuck asked “What user instruction did you interpret as requesting Review & Reorganize?” Pattern: `review … reorganize`. Asking about the operation was classified as requesting it.

TypeSafe/Jev did not run on any of these Turns. No `typesafe.evaluate` receipt exists. Canonical Document was not Applied. A spine-only proposal (8 invented Section titles, 141 Points unchanged) sits on the manuscript.

The later Cast replies (Rendr / Cloud / Ceox) were only consulted on the short challenge Turn, after the damage. They were not consulted on the diagnostic. Their “we held the boundary” is true of that later Turn and silent about the ones that mutated.

Origin: orchestration intent detector + Lead follow-up, not Director synthesis inventing an action from Cast, and not TypeSafe.

A later Turn Posture judgment (observe vs request) is a candidate. Do not assume it is the fix until we decide whether the first cut is tightening/negating this detector so “not the same thing” and “do not reorganize” cannot schedule Document work.

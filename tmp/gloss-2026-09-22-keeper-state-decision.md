Cursor · Keeper-state decision test (2026-09-22)

Gloss-only. Not a build lock. Nothing was wired into the turn.

TypeSafe, given only a frozen objective and four semantic moves, chose PRESERVE_DISCOVERY for “that seems like something worth keeping” at probability 0.98, three times, and again when the option was renamed MOVE_C. Ordinary chatter and “Keep going” chose CONTINUE at 1.00. “Save that joke” and “I remember…” stayed CONTINUE.

The state test failed. Marking the same exchange as already durably represented did not lower PRESERVE. It stayed at 0.99. An obsolete Orientation raised RECONSIDER_ORIENTATION by about 0.11 to 0.14 and never won. The winning move followed the human sentence and the move definitions. The boolean state did not change it.

Jev can read this semantic distinction without Keeper’s implementation vocabulary. It cannot yet be treated as reasoning over Keeper state.

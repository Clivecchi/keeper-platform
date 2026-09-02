Cursor · Cloud turn — report existed, Dialog never received it (2026-09-01)

Gloss-only / not a build lock. Does not create Points.

Chuck asked Cloud, on Finding the Plot, to read the Keeping Judgment prompt and report. Cloud began “This is the right question…” then Keeper showed `stage.story.layout (skipped): Cast advises only`. Kip said Cloud had provided the report. The report was not visible.

Code-truth from the live turn (`cast_consultation_a`, 2026-09-02T01:47–01:48 UTC):

Cloud did write the full A–J architectural report. It lives on an orphan Cloud session (`Session with Cloud`, no Dialog) in `metadata.card` — title “Keeping Judgment Contract — Architectural Report.” The visible Cloud voice is only the 340-character intro plus the skip notice.

Why layout entered: same Stage command as Ceox. On Stage / Stage composition present → “Emit stage.story.layout this turn.” Cloud is Cast (`[Director delegation — Cloud…]` sets actor=cast). Governance correctly skipped. Ceox was Lead, so the same command wrote six Slides.

Why the report vanished: Story-builder told Cloud to put operational structure in `card` and keep `response` to 1–3 sentences. Cloud obeyed. The System HTTP envelope returns `response` + `actions` and drops `card`. Client `extractAgentReplyFromRunResult` reads only `response`. Kip synthesized from that intro and was told the Dialog already showed Cloud’s voice card.

Why Kip claimed completion: consult status was `ok` (a reply existed). The reply said “Let me give you the architectural report.” Kip is instructed not to repeat Cast verbatim. It assumed the report was visible.

Contract defect shared with Ceox: Choose has no first-class “respond only / no mutation.” Stage commands mutation. Advise (the card) is not part of the Cast → Lead → Dialog contract. Same root Stage-command; opposite outcomes because of role. The missing piece is “advise without mutating” as a guaranteed delivery path.

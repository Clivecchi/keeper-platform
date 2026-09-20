Cursor · TypeSafe NL questions and execution truth (2026-09-20)

Gloss-only. Not a build lock.

Cause
Cloud and Rendr both emitted typesafe.evaluate. Receipts: INVALID_QUESTIONS — “needs questions (map) or a single question string.” State was present. The parser only accepted a typed map (id → { type, instructions }) or a top-level question string. Agency that knows when to use TypeSafe was taught the typed map as the contract, so natural-language questions (string, string[], id → string) failed. Exact JSON payloads are not stored on receipts; that error shape is the match.

Kip then reported “TypeSafe Probe initiated” and “high-confidence routes identified.” Lead synthesis listed Cast prose, not action receipts. Cast hopes were treated as execution. Both TypeSafe actions had failed. No Probe results existed.

Change
Smallest Agency contract fix — not a Probe special-case, not a Composer/Cast/ACME/SOLE/runtime redesign, not Rendr participation.

- parseTypeSafeEvaluatePayload now types a question string as noul unless type is set. Accepts string, string[], id → string, and evidence/situation as state aliases.
- typesafe.evaluate / jev.probe prompts and payload schema teach that NL questions are valid.
- After Cast, Lead synthesis lists action receipts. Lead Judgment forbids claiming initiated/completed/findings without a success receipt. TypeSafe follow-up also runs on error so the agent sees the failed receipt.

Verification (one bounded NL question)
payload: { state: GET /api/journeys list-scope, questions: ["Is Domain authorization established before an unscoped journeys list can succeed?"] }
→ parsed as noul q1 → typesafe.evaluate success → receipt “TypeSafe evaluated 1 question” → formatted q1: 0.580 in Agent follow-up → Lead synthesis lists Cloud · typesafe.evaluate: success.

Next
A live Cast turn with the same NL shape should complete instead of INVALID_QUESTIONS. If Lead still narrates findings without a success receipt, the remaining gap is Cast prose in instrumentReply, not the TypeSafe contract.

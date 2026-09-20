Cursor · Jev Codebase X-Ray first live run (2026-09-20)

Gloss-only. Not a build lock. Not a governing Code Map.

Jev evaluated 40 curated Keeper units × 30 Choice questions = 1,200 answers in 3.0 seconds. ~230k input tokens. About one cent. 789 high / 266 medium / 145 low confidence. Zero failed units.

What Jev understood confidently: Stage write/expression cluster; Dialog send path; which units mutate Keeper data.

What ordinary navigation would not have made cheap: `GET /api/journeys` can list across domains when `domainId` is omitted (Jev `domainTruthContradiction` 0.90 on the mounted route). The unmounted twin `domain-integrated-routes.ts` was independently marked `secondImplementation` 0.99. `resolveAudience.ts` was marked legacy 0.85 — it is an explicit deprecated wrapper.

What Jev was bad at: grant ≠ knowledge (it cleared the allowlist); Stage bleed onto audience visibility; duplication likely-on-everything; starved wrapper extracts (`promoteDraftPoint`).

Recommendation: Jev is useful enough as a Cloud *probe*, not an authority. Smallest next step: richer extracts + a seam pass on mutation/domain-scope only. Do not build a UI. Do not treat this map as law.

The loop we wanted is real: X-ray → identify → investigate. Cursor only opened the seams Jev ranked.

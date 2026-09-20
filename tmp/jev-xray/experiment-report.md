# Jev Keeper Codebase X-Ray — Experiment Report

Generated after the 2026-09-20 live run. Gloss-only findings. Not a build lock.

## What We Built

CLI harness at `apps/api/src/scripts/run-jev-codebase-xray.ts`. Reuses `evaluateTypeSafe`. One System One call per unit, 30 Choice questions batched. Writes this folder.

## What Jev Examined

- 40 units, 40 ok, 0 failed
- 30 questions / unit
- 1,200 evaluations
- Model `jev-latest`
- 3.0s wall time
- 230,484 input tokens · 51,574 output tokens
- Estimated cost ≈ **$0.01** (TypeSafe list: $0.042 / 1M input, output free)

## What Jev Found

High-confidence Stage cluster is real and tight: `expressResolvedMeaningOnStage`, `composeStageExpression`, `keeperStageRoutes`, `stage.story.layout`, `keeperStageStore`, `layoutStageStory`.

High-confidence Dialog cluster is smaller than expected: `useAgentDialog` (1.00), `draft.update.propose` (0.92), `directorDialog` (0.77). Human Turn identity did not read as Dialog behavior.

State mutation map is useful. Jev marked keeper-data on Stage store/layout/routes, Gloss, journeys (both twins), promote, draft.propose, and grant helpers.

The most important architectural finding: **`GET /api/journeys` can list across domains**. `domainId` is optional; if omitted, `where` stays `{}`. Jev flagged `domainTruthContradiction: likely` at 0.90 on the mounted route.

The discovery question about a second implementation fired cleanly on the unmounted twin: `domain-integrated-routes.ts` `secondImplementation: likely` 0.99.

## Surprises

1. A filename-blind domain-scope warning on the *mounted* Journey API, not only the known unmounted twin.
2. `resolveAudience.ts` classified **legacy** at 0.85 — the file is an explicit `@deprecated` wrapper. Grep would not have said that.
3. Jev almost never said Agents receive grant-as-knowledge, including on `GOLDEN_PATH_ACTIONS`. That is the opposite of the Agency principle we handed it.
4. `possibleDuplication: likely` fired on most conceptually shared objects. Exploratory, too eager to be a work list.
5. `silentSuccess: likely` stayed low-confidence. Jev would not confidently accuse unverified success.
6. Whole-repo semantic map in three seconds, about a cent.

## Confidence

| Band | Evaluations | Share |
|---|---|---|
| high (≥0.75) | 789 | 66% |
| medium (0.45–0.75) | 266 | 22% |
| low (<0.45) | 145 | 12% |
| unknown | 0 | 0% |

Jev is confident about object participation and mutation. It is cautious about silent success and capability-literacy.

## Validation

Cursor inspected code *after* Jev classified it. Calibration only — not a second audit.

| Unit | Jev | Conf | Cursor | Verdict |
|---|---|---|---|---|
| `domainIntegratedJourneyRoutes` / second implementation | likely | 0.99 | File header: not mounted; twin of `journeys.ts` | correct |
| `resolveAudience` / alignment | legacy | 0.85 | `@deprecated` wrapper around `resolveDomainAudience` | correct |
| `createDraftPoint` / can modify Points | yes | 0.97 | Creates Points | correct |
| `PresentFrame` / public experience | yes | 1.00 | Guest Present surface | correct |
| `keeperStageStore` / keeper-data + current | yes | 1.00 | Writes `Domain.settings.keeperStage` | correct |
| `journeysRoutes` / domain-truth contradiction | likely | 0.90 | Optional `domainId`; empty `where` lists across domains | correct |
| `capabilityGrantUtils` / keeper-data | keeper-data | 0.91 | POST/DELETE capability grants | correct |
| `JourneysFrame` / public experience | yes | 0.99 | Also a legacy member frame, but it calls public journey/Present helpers | reasonable |
| `ChronicleActPresence` / legacy UI | yes | 0.86 | Current Chronicle shell; still imports EngagementForm types | reasonable |
| `KeeperPresence` / keeper-data | keeper-data | 0.94 | Contains PATCH `apiFetch` | reasonable |
| `evaluateTypeSafe` / LLM infers capability | likely | 0.51 | This is the Jev client, not an Agent inferring a capability | questionable |
| `domainIntegratedJourneyRoutes` / domain-truth contradiction | likely | 0.87 | This twin *adds* domain permission middleware | questionable |
| `isVisibleToAudience` / participates Stage | yes | 0.68 | Audience visibility. Not Stage. | wrong |
| `promoteDraftPoint` / can modify Points | yes | 0.40 | Harness sent only the 2-line wrapper; body was starved | wrong / starved |
| `GOLDEN_PATH_ACTIONS` / grant as knowledge | unlikely | 0.98 | This file *is* allowlist-without-instructions | questionable |

High-confidence object/mutation answers were mostly correct. Medium answers were mixed. Low-confidence and capability-literacy answers need a human.

## What Jev Was Bad At

- **Grant ≠ knowledge.** Architecture context stated it. Jev still said allowlists do not treat grant as knowledge.
- **Stage bleed.** Audience visibility was marked Stage-related at 0.68.
- **Duplication trigger-happiness.** `possibleDuplication: likely` is a hint, not a finding.
- **Starved extracts.** Export-only windows (promoteDraftPoint) lost the implementation.
- **Legacy by import.** Chronicle Act looked legacy because it shares EngagementForm field types.
- **Silent success.** Too uncertain to map reliability seams. That caution is useful; the view is not yet actionable.

## Best New Questions

Questions we could not cheaply ask with grep, and that earned their place:

1. Could this code list or mutate across Domain boundaries if a scope argument is omitted?
2. Is this an unmounted / second implementation of a live path?
3. Is this the current resolver, or a deprecated wrapper in front of one?
4. Does this write Keeper data, or only render it?
5. Would a Cloud change here move Stage, Story, or Document — and does the code keep them distinct?

Weaker until rewritten:

- “Treat grant as knowledge?” — needs the allowlist *and* the prompt/instruction neighbor in one state.
- “Possible duplication?” — too broad. Ask “same HTTP path / same write / same object?” separately.

## Recommendation

**Yes — Jev is useful enough to become a Cloud code-intelligence *probe*.** Not an authority. Not a UI.

The idea is real: X-ray → identify → investigate. This run cost about a cent and three seconds, then Cursor only had to open the seams Jev ranked.

Smallest next evolution (do not build yet):

1. Richer extracts for wrappers (include the function body, not the one-line export).
2. A second “seam pass” only on high-confidence mutation + low/medium domain-scope answers.
3. Tighten duplication/literacy questions so they cannot fire on every shared concept.

Do not promote the Code Map to a governing document. Use it to point Cloud at `journeys.ts` domain scoping, the unmounted Journey twin, and the Stage write cluster.

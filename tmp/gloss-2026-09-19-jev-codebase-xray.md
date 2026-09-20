Cursor · Jev Keeper Codebase X-Ray harness (2026-09-19)

Gloss-only. Not a build lock. Not a Code Map. Jev has not classified the repository yet.

We built the smallest developer harness that lets Jev do a semantic X-ray of Keeper, instead of asking Cursor to audit the codebase.

Reuse, not a second TypeSafe client:
- `evaluateTypeSafe` → `POST https://api.typesafe.ai/v1/systemone`
- Choice questions only (answer + confidence + probabilities)
- One request per code unit, all 30 questions batched (Jev evaluates them in parallel)
- Key path unchanged: env → platform

What the harness does:
- 40 curated units (file / export / marker windows — not 9k-line dumps)
- Compact architecture context (Domain-scoped, Stage ≠ Story ≠ Document, grant ≠ knowledge)
- 26 architecture questions + 4 discovery questions the repository itself suggested (Stage/Story/Document collapse, dual Journey path, grant-as-knowledge, synthesized unperformed work)
- Writes `tmp/jev-xray/results.json` + `code-map.md`

From `apps/api`: `pnpm exec tsx src/scripts/run-jev-codebase-xray.ts`

Blocked on this machine: no `TYPESAFE_API_KEY` and no active platform TypeSafe key. Same gap as the 2026-09-18 Document Turn Posture corpus. The harness is ready. The X-ray is not.

The idea we are testing, once the key is present:
X-ray → identify → investigate → act → verify
instead of search → open → read → guess → search again.

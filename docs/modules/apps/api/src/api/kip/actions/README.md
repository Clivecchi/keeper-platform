# kip actions

## 📌 Purpose
Normalize and validate structured Kip agent actions before `executeAgentActions` runs them.

## 🧱 Key Files
- `normalizeDraftPropose.ts` — coerce common model mistakes for `draft.update.propose` / point id aliases
- `normalizeDraftCreate.ts` — working-draft kind + first Points from `content`
- `normalizeDraftPropose.test.ts`
- `schema.ts` — action envelope schemas and `parseActionsOrThrow`

## 🔄 Data & Behavior
- Models often send point body as `text`/`body`/`narrative` or nest `{ content: { text, author } }`.
- `normalizeDraftUpdateProposePayload` maps those shapes to flat `content` + optional `author`/`proposedBy`, and `title` → `prelude` (Point story-label).
- Point id actions accept `draftId`/`id` and `pointId`/`point_id` / number aliases. Rewrite does not require a UUID.

## ⚠️ Notes & ToDo
- [ ] Wire Zod `actionPayloadSchemas` into `parseActionsOrThrow` (currently documented but unused)
- [ ] Confirm with Chuck: cast agents proposing on journey drafts should stay `proposed` (human Accept)

## 📆 Update Log
- 2026-08-30: `stage.story.layout` — Lead lays out the Stage filmstrip (`slides[]`). Writes `keeperStage.story`. Not a Document action.
- 2026-08-29: `document.reorganize.propose` — omitted `sectionId` is a safety default (keep current Section). Nest Points under the Section they should belong to in Proposed. Do not emit a Section named Open.
- 2026-08-25: `document.reorganize.propose` payload accepts `title`, `documentTitle`, `forward` / `forwardTitle` / `forwardDescription`. Those are Document identity, not Point fields.
- 2026-08-25: Actions README — `gloss.append` payload schema (pointId + content).
- 2026-08-25: Rewrite identity is Chronicle-facing — numeric `pointId`, `id` as Point 1–N, `points[]` batch, and title aliases. `payload.id` is not the Draft when it is a Point number or Point UUID.
- 2026-08-21: `draft.update.propose` no longer requires the model to send `id` / `draftId`. `content` is the contract. Keeper fills the Dialog manuscript UUID at execute time.
- 2026-08-21: Point propose ids that are not UUIDs (`none`, `manuscript-…` keys) are replaced with the Dialog manuscript UUID before execution.
- 2026-08-19: `normalizeDraftCreate.ts` — reject `document_manuscript` as a working-draft kind; persist `content` as proposed Points.
- 2026-08-04: Added `web.search` payload schema (`webSearchPayloadSchema`) — `{ query, count? }` for Brave-backed live search.
- 2026-08-03: Added `normalizeDraftPropose.ts` for content/author coercion used by draft propose execution.

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
- `normalizeDraftUpdateProposePayload` maps those shapes to flat `content` + optional `author`/`proposedBy`.
- Point id actions accept `draftId`/`id` and `pointId`/`point_id` aliases.

## ⚠️ Notes & ToDo
- [ ] Wire Zod `actionPayloadSchemas` into `parseActionsOrThrow` (currently documented but unused)
- [ ] Confirm with Chuck: cast agents proposing on journey drafts should stay `proposed` (human Accept)

## 📆 Update Log
- 2026-08-21: Point propose ids that are not UUIDs (`none`, `manuscript-…` keys) are replaced with the Dialog manuscript UUID before execution.
- 2026-08-19: `normalizeDraftCreate.ts` — reject `document_manuscript` as a working-draft kind; persist `content` as proposed Points.
- 2026-08-04: Added `web.search` payload schema (`webSearchPayloadSchema`) — `{ query, count? }` for Brave-backed live search.
- 2026-08-03: Added `normalizeDraftPropose.ts` for content/author coercion used by draft propose execution.

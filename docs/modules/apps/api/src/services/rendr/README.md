# Rendr

## 📌 Purpose
Rendr agent identity and Design-board Treatment prompt. Presence partner — not the Lead.

## 🧱 Key Files
- `rendrAgentConfig.ts` — purpose, voice prompt, identity lock (seed + runtime)
- `composeFramePerformance.ts` — Rendr prompt for a turn-scoped Frame Performance (meaning + selected lines, not the transcript)
- `composeStageExpression.ts` — compact Set used by that prompt
- `expressResolvedMeaningOnStage.ts` — post-Lead handoff. Persists `framePerformance` on the Lead message. Stamps presentation only when the Lead set `presentFrame` or the human asked for a Frame. Appends one live-sourced Stage cell only for that stamp, and only when the turn is already on Stage.

## 🔄 Data & Behavior
Treatment changes use `treatment.propose` on Design Board. Dialog Points use `draft.update.propose` on Working on (Chronicle Document or focused Draft). `draft.create` is only for a new working Draft, never as a substitute for Points on the focused Document.

## ⚠️ Notes & ToDo
- [ ] Spatial/motion primitives (Float, Weight, Motion contract) remain queued behind Chronicle becoming

## 📆 Update Log

### 2026-09-27 — Frame expression uses the chat seam
- `expressResolvedMeaningOnStage` calls `executeRegisteredChat` with Rendr's stored provider and model (empty model stays `claude-sonnet-4-6`). Sibling fallback is off. Domain tier and `jsonMode` are unchanged.

### 2026-09-27 — Lead authorizes the Frame
- `presentFrame` is the Lead's decision. An explicit human request also authorizes. Rendr composes the Frame and may set `recommendPresentation`. Rendr's `promote` is discarded.

### 2026-09-27 — Promotion is editorial
- Rendr may compose a telling after resolved meaning. `promote: true` is set only on a Story-significant beat. Omit it otherwise. A Stage cell is written only for a promoted beat.

### 2026-09-23 — Frame Performance
- Rendr composes `FramePerformance` after the Lead emits `resolvedMeaning`. Dialog turns do not write internal beats onto the domain filmstrip. A Stage cell, when created, points at the Lead message.

### 2026-09-11 — Performance One expression
- Post-Lead handoff receives Resolved Meaning + compact Set/coordinates only. Rendr returns one `stage_expression` beat. Keeper appends it. Timeout or parse miss leaves Stage unchanged. Does not use `stage.story.layout`.

### 2026-08-25 — Dialog Points on Working on
- Voice prompt: propose Points to Working on this turn. Do not `draft.create` a different Draft. Do not narrate a read instead of the write.

### 2026-08-19 — Session ≠ Dialog (locked)
- Voice prompt: working drafts vs Treatment. Never `document_manuscript`. Prose in chat, not the JSON envelope.

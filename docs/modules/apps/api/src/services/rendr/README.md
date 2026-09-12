# Rendr

## 📌 Purpose
Rendr agent identity and Design-board Treatment prompt. Presence partner — not the Lead.

## 🧱 Key Files
- `rendrAgentConfig.ts` — purpose, voice prompt, identity lock (seed + runtime)
- `composeStageExpression.ts` — constrained Rendr prompt: Resolved Meaning + compact Set only
- `expressResolvedMeaningOnStage.ts` — post-Lead ephemeral handoff; Keeper appends one Frame

## 🔄 Data & Behavior
Treatment changes use `treatment.propose` on Design Board. Dialog Points use `draft.update.propose` on Working on (Chronicle Document or focused Draft). `draft.create` is only for a new working Draft, never as a substitute for Points on the focused Document.

## ⚠️ Notes & ToDo
- [ ] Spatial/motion primitives (Float, Weight, Motion contract) remain queued behind Chronicle becoming

## 📆 Update Log

### 2026-09-11 — Performance One expression
- Post-Lead handoff receives Resolved Meaning + compact Set/coordinates only. Rendr returns one `stage_expression` beat. Keeper appends it. Timeout or parse miss leaves Stage unchanged. Does not use `stage.story.layout`.

### 2026-08-25 — Dialog Points on Working on
- Voice prompt: propose Points to Working on this turn. Do not `draft.create` a different Draft. Do not narrate a read instead of the write.

### 2026-08-19 — Session ≠ Dialog (locked)
- Voice prompt: working drafts vs Treatment. Never `document_manuscript`. Prose in chat, not the JSON envelope.

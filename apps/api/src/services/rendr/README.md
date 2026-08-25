# Rendr

## 📌 Purpose
Rendr agent identity and Design-board Treatment prompt. Presence partner — not the Lead.

## 🧱 Key Files
- `rendrAgentConfig.ts` — purpose, voice prompt, identity lock (seed + runtime)

## 🔄 Data & Behavior
Treatment changes use `treatment.propose` on Design Board. Dialog Points use `draft.update.propose` on Working on (Chronicle Document or focused Draft). `draft.create` is only for a new working Draft, never as a substitute for Points on the focused Document.

## ⚠️ Notes & ToDo
- [ ] Spatial/motion primitives (Float, Weight, Motion contract) remain queued behind Chronicle becoming

## 📆 Update Log

### 2026-08-25 — Dialog Points on Working on
- Voice prompt: propose Points to Working on this turn. Do not `draft.create` a different Draft. Do not narrate a read instead of the write.

### 2026-08-19 — Session ≠ Dialog (locked)
- Voice prompt: working drafts vs Treatment. Never `document_manuscript`. Prose in chat, not the JSON envelope.

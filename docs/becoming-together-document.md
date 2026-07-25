# Becoming Together — the Document

**Keeper Platform · 2026-07-24** (updated after fabrication diagnostic + fix ship)

## Desired end state

Becoming Together is one shared document, attached directly to the real "Becoming Together" Dialog (`cmrtyoraw0001ot0033p5wiwm` on ke3p) — not a Journey, not a new top-level entity — that Kip, Cloud, Ceox, Cursor, Rendr, and Chuck all genuinely read from and write into as the same current truth, visible the same way on every board's Chronicle panel. Its Forward states the purpose once and stays stable; its Points are real things that actually happened, grouped by Path; its Step is the honest current tip, not a placeholder claiming not to be one. Kip can genuinely consult other enabled cast members and return their real, minimal input — or say plainly that it got nothing back — never invent a quote on someone else's behalf. The cast can genuinely grow: another domain's agent through the Cast Header, or a second real human through Invite. Cursor's own completed work shows up here as real entries credited to Cursor, not only as commits no one but Cloud ever reads.

## What shipped

### 2026-07-23 (Document + consult paths)

- **Document on Dialog:** `forward_title` / `forward_description` / `step_title` / `step_body` / `document_paths` columns on `Dialog`. PATCH via `kip-dialogs`. No Journey, no new top-level entity.
- **Placeholder gone:** `DomainRealmStory` reads Forward/Step from the Dialog. Hardcoded strings removed.
- **Points:** `document_manuscript` kip_draft under the Dialog; Points expand into Document cards with cast voice + Path groups. Seed script: `apps/api/src/scripts/seed-becoming-together-document.ts` (dry-run default; `--execute` writes).
- **Cursor visible:** Seed Points credited to Cursor (eager-dialog stop, session domain scope, Document attach, delegation, invite).
- **Two consult mechanisms (kept distinct):**
  - **Mechanism A — multi-select cast consultation:** client runs each engaged instrument via `runAgent`, then Lead synthesizes with `buildCastConsultationsSynthesisPrompt`.
  - **Mechanism B — `delegate.consult`:** Lead emits the action mid-turn; server runs a real sub-turn; follow-up synthesizes with the same honesty rules.
- **Invite human:** Cast Header Invite → form → `POST /connections/invite`; email path returns copyable `/invite/accept?token=…`; `POST /api/domains/invitations/accept` redeems.

### 2026-07-24 (honesty + Document in agent context + participation)

- **Standing cast honesty on every Lead turn:** `buildCastHonestySystemPrompt` is injected in live `callAIModel` (not only on consult synthesis paths). Plain Lead turns must not invent another agent's words — honest “got nothing back” / support-only disclosure.
- **Dialog Document in agent context:** `resolveAgentEnvironment` loads `environment.dialogDocument` (Forward / Step / Paths / manuscript Points) when `session.dialog_id` is set — same fields Chronicle renders. `callAIModel` surfaces them via `buildDialogDocumentSystemPrompt`.
- **Declared Dialog participation:** `config.dialog_participation` (`voice` | `support_only` | `silent`) on agent records. Cloud defaults to `support_only`. Editable in Agent Config; Cast Header shows Support / Silent badges. Additive to `DialogCastMember` enable/disable.
- **AgentTurn debug:** `[AgentTurn]` logs mechanism, document-in-context flags, cast consult statuses; message `metadata.orchestration` persists the same. JWT tokens redacted from login / diag / fetch-shim bodies.

## Authored Forward (recovered / restored)

> **Becoming Together** — Kip, Cloud, Ceox, Cursor, Rendr, and Chuck share one Document — the same current truth, read and written the same way on every board. Capture what actually happened. Shape it into Paths. Keep what holds. Show it here.

(Earlier mockup overwrite lost the product copy; this is the restored purpose statement now stored on the Dialog.)

## Ops

```bash
# After migrate 20260723210000_dialog_document_forward_step:
cd apps/api && npx tsx src/scripts/seed-becoming-together-document.ts
cd apps/api && npx tsx src/scripts/seed-becoming-together-document.ts --execute

# Orphan echo sessions (independent verify):
cd apps/api && npx tsx src/scripts/archive-orphan-echo-sessions.ts
cd apps/api && npx tsx src/scripts/archive-orphan-echo-sessions.ts --execute
```

## Prompt for Cursor (completed)

Read this document in full, then `@AGENTS.md @docs/chronicle-document-architecture.md @docs/universal-board-dialog-orchestration.md`. Complete the work described above — real Document content attached directly to the real Dialog (no Journey, no new top-level entity), the placeholder gone, real delegation with honest fallback instead of fabrication, the cast genuinely growable by both agent and human, and Cursor's own contributions visible here as real entries. Nothing parked, nothing left open. Work autonomously; don't stop to ask.

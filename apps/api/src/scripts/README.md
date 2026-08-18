# API Scripts

## 📌 Purpose
Manually invoked operational scripts for domain diagnostics, frame repair, seeding, and one-off data consolidations. Not run automatically on deploy.

## 🧱 Key Files
- `diagnose-default-domain.ts` — inspect default domain `frame_json` governed keys
- `repair-domain-frame.ts` — re-provision unseeded personal domain frames
- `seed-agent-personalities.ts` / `seed-cloud-agent.ts` / `seed-default-domain-frames.ts` — seed helpers
- `consolidate-ke3p-dialogs.ts` — ke3p Becoming Together Dialog + Library archive consolidation (dry-run default)
- `archive-orphan-echo-sessions.ts` — archive dialog-less "Domain Lead Collaboration" / "Agent Board Echo" sessions (dry-run default)
- `prune-chronicle-history-noise.ts` — delete old per-turn Chronicle History rows (dry-run default; Document/Dialog untouched)
- `seed-becoming-together-document.ts` — write real Forward/Step/Paths + manuscript Points onto Dialog `cmrtyoraw0001ot0033p5wiwm` (dry-run default)
- `deploy-object-glossary-read-access.ts` — catalog Object Glossary (+ EntityKind Recipe) as `source_type: github` Library Items and inject condensed Governance canon into Kip/Cloud `voice_prompt` (dry-run default)
- `gloss-cursor-to-dialog.ts` — durable Cursor → Gloss writer (default ke3p · Becoming Together); `--file` / `--content` / stdin; does not create Points
- `append-boards-as-lenses-lock.ts` — accepted Presentational-lenses decision Point + Dialog Step tip (dry-run; `--execute`)

## 🔄 Data & Behavior
Scripts load `apps/api/.env` (or cwd dotenv) and talk to Postgres via `@keeper/database` prisma. Destructive or production-writing scripts must default to dry-run and require an explicit `--execute` flag.
Cursor Gloss uses in-process `dialog_search` → `dialog_read` → `gloss_write_turn` (same as scoped MCP). See `.cursor/rules/cursor-gloss-becoming-together.mdc`.

## ⚠️ Notes & ToDo
- [ ] `consolidate-ke3p-dialogs.ts --execute` is a deliberate production step — never unattended
- [ ] `archive-orphan-echo-sessions.ts --execute` requires migration `20260723200000_kip_sessions_is_archived` applied first
- [ ] `seed-becoming-together-document.ts --execute` requires migration `20260723210000_dialog_document_forward_step` applied first
- [ ] Confirm with Kip before generalizing ke3p consolidation to other domains
- [ ] Re-run `deploy-object-glossary-read-access.ts --execute` after glossary content changes if `agent_perspective` / Governance block should refresh; embeddings need a valid OpenAI platform key

## 📆 Update Log

### 2026-08-17 — Glossary governance canon
- `deploy-object-glossary-read-access.ts` condensed Governance block now includes the board-emphasis invariant and Build board label (`ide` internal key). Re-run with `--execute` to refresh Kip/Cloud Training Mode.

### 2026-08-05 — Boards-as-lenses Document lock
- `append-boards-as-lenses-lock.ts` — appends accepted decision Point under Progress + updates Becoming Together Step tip. Dry-run default.

### 2026-08-05 — Cursor Gloss runner
- Added `gloss-cursor-to-dialog.ts`: one durable path for Cursor agent Gloss onto Dialog Documents (default Becoming Together). Replaces one-off board-lens script. Rule: `.cursor/rules/cursor-gloss-becoming-together.mdc`.

### 2026-08-03 — Prune Chronicle History noise
- Added `prune-chronicle-history-noise.ts`: deletes `chronicle_events` under the old per-turn History model so the feed can refill as session chapters + Document keeps. Default scope = Becoming Together Dialog; supports `--domain-slug=` / `--all`. Dry-run by default; `--execute` gated. Does not touch Document, Dialog, sessions, or messages.

### 2026-08-02 — Object Glossary read access
- Added `deploy-object-glossary-read-access.ts`: upserts github Library Items for `docs/keeper-object-glossary.md` + EntityKind Recipe; patches Kip/Cloud Training Mode Governance with condensed canon + `library.read` pointer. Dry-run by default; `--execute` gated.

### 2026-07-24 — verify Dialog Document agent context
- Added `verify-dialog-document-context.ts` — read-only check that Becoming Together Dialog loads into `loadDialogDocumentForAgent` (Forward/Step/Points) + redaction helpers.

### 2026-07-23 — seed Becoming Together Document
- Added `seed-becoming-together-document.ts`: Dialog Forward/Step/document_paths + `document_manuscript` Points (incl. Cursor-credited entries). Dry-run by default; `--execute` gated.

### 2026-07-23 — archive orphan echo sessions
- Added `archive-orphan-echo-sessions.ts`: sets `is_archived=true` on dialog-less echo sessions. Dry-run by default; `--execute` gated. Never deletes.

### 2026-07-20 — ke3p Becoming Together consolidation script
- Added `consolidate-ke3p-dialogs.ts`: creates "Becoming Together" Dialog, archives other ke3p dialogs + attached drafts, converts orphaned drafts to `LibraryItem` archive pointers (`source_type=draft`, `category=["archive"]`). Dry-run by default; `--execute` gated.

# API Scripts

## 📌 Purpose
Manually invoked operational scripts for domain diagnostics, frame repair, seeding, and one-off data consolidations. Not run automatically on deploy.

## 🧱 Key Files
- `diagnose-default-domain.ts` — inspect default domain `frame_json` governed keys
- `repair-domain-frame.ts` — re-provision unseeded personal domain frames
- `seed-agent-personalities.ts` / `seed-cloud-agent.ts` / `seed-default-domain-frames.ts` — seed helpers
- `consolidate-ke3p-dialogs.ts` — ke3p Becoming Together Dialog + Library archive consolidation (dry-run default)

## 🔄 Data & Behavior
Scripts load `apps/api/.env` (or cwd dotenv) and talk to Postgres via `@keeper/database` prisma. Destructive or production-writing scripts must default to dry-run and require an explicit `--execute` flag.

## ⚠️ Notes & ToDo
- [ ] `consolidate-ke3p-dialogs.ts --execute` is a deliberate production step — never unattended
- [ ] Confirm with Kip before generalizing ke3p consolidation to other domains

## 📆 Update Log

### 2026-07-20 — ke3p Becoming Together consolidation script
- Added `consolidate-ke3p-dialogs.ts`: creates "Becoming Together" Dialog, archives other ke3p dialogs + attached drafts, converts orphaned drafts to `LibraryItem` archive pointers (`source_type=draft`, `category=["archive"]`). Dry-run by default; `--execute` gated.

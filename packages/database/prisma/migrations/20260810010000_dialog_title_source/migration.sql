-- Dialog title_source: classify named Dialogs vs auto-titled Chatter.
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "title_source" TEXT NOT NULL DEFAULT 'user_set';

-- Backfill: auto-generated pattern from findOrCreateKipDialog
-- "{Board} · {Frame} · {Mon D}" e.g. "Agent · conversation · Jun 28"
UPDATE "Dialog"
SET "title_source" = 'auto_generated'
WHERE "title" ~ '^[A-Za-z][\w\s]* · .+ · (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{1,2}$';

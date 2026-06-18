-- Retire legacy agent-scoped Draft table (superseded by kip_drafts).
-- No Prisma relations pointed at this model; Task.draftId is an unlinked string field.

DROP TABLE IF EXISTS "Draft";

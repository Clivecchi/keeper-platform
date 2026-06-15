-- Library EntityKind (Pass 1)
-- pgvector diagnosis (2026-06-14): CREATE EXTENSION vector fails on main Railway Postgres —
-- extension control file is not installed on the host. No separate pgvector service exists in repo env.
-- Pass 1 stores embeddings as DOUBLE PRECISION[] until pgvector is enabled on the database host.

CREATE TYPE "LibraryItemSourceType" AS ENUM ('upload', 'url', 'github', 'gdrive');

CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "source_type" "LibraryItemSourceType" NOT NULL,
    "source_ref" TEXT NOT NULL,
    "display_label" TEXT,
    "description" TEXT,
    "agent_perspective" TEXT,
    "embedding" DOUBLE PRECISION[],
    "assigned_keeper_id" TEXT,
    "assigned_agent_id" UUID,
    "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryItem_domain_id_idx" ON "LibraryItem"("domain_id");
CREATE INDEX "LibraryItem_assigned_keeper_id_idx" ON "LibraryItem"("assigned_keeper_id");
CREATE INDEX "LibraryItem_assigned_agent_id_idx" ON "LibraryItem"("assigned_agent_id");
CREATE INDEX "LibraryItem_source_type_idx" ON "LibraryItem"("source_type");
CREATE INDEX "LibraryItem_created_at_idx" ON "LibraryItem"("created_at");

ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_assigned_keeper_id_fkey" FOREIGN KEY ("assigned_keeper_id") REFERENCES "Keeper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "kip_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

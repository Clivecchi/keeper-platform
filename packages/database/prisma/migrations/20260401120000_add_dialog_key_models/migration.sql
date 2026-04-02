-- AlterTable
ALTER TABLE "kip_sessions" ADD COLUMN IF NOT EXISTS "beat_metadata" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "kip_session_handoff_keys" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "session_id" UUID NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "claimed_by" TEXT,
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "kip_session_handoff_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kip_session_handoff_keys_domain_id_idx" ON "kip_session_handoff_keys"("domain_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kip_session_handoff_keys_session_id_idx" ON "kip_session_handoff_keys"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kip_session_handoff_keys_claimed_by_idx" ON "kip_session_handoff_keys"("claimed_by");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "kip_session_handoff_keys" ADD CONSTRAINT "kip_session_handoff_keys_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "kip_session_handoff_keys" ADD CONSTRAINT "kip_session_handoff_keys_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "kip_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "kip_session_handoff_keys" ADD CONSTRAINT "kip_session_handoff_keys_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN NULL;
END $$;

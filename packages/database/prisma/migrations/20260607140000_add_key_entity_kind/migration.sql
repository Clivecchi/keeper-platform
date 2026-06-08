-- CreateTable: Key EntityKind (provider credential presence layer)
CREATE TABLE "Key" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "key_source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "scope" TEXT,
    "last_verified" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "domain_id" TEXT NOT NULL,
    "user_id" TEXT,
    "integration_id" TEXT,
    "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "display_label" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Key_domain_id_idx" ON "Key"("domain_id");
CREATE INDEX "Key_provider_idx" ON "Key"("provider");
CREATE INDEX "Key_integration_id_idx" ON "Key"("integration_id");
CREATE INDEX "Key_user_id_idx" ON "Key"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Key_domain_id_provider_key_source_user_id_key" ON "Key"("domain_id", "provider", "key_source", "user_id");

-- AddForeignKey
ALTER TABLE "Key" ADD CONSTRAINT "Key_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Key" ADD CONSTRAINT "Key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Key" ADD CONSTRAINT "Key_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain-scoped MCP / external tool access keys (hashed at rest)
CREATE TABLE "domain_access_keys" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_access_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "domain_access_keys_key_hash_key" ON "domain_access_keys"("key_hash");
CREATE INDEX "domain_access_keys_domain_id_idx" ON "domain_access_keys"("domain_id");
CREATE INDEX "domain_access_keys_status_idx" ON "domain_access_keys"("status");

ALTER TABLE "domain_access_keys" ADD CONSTRAINT "domain_access_keys_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

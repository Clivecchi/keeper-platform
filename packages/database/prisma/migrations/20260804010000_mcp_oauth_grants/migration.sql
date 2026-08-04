-- MCP OAuth Phase B: clients, auth codes, grants, access tokens

CREATE TABLE "mcp_oauth_clients" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT,
    "client_name" TEXT,
    "redirect_uris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "token_endpoint_auth_method" TEXT NOT NULL DEFAULT 'none',
    "source" TEXT NOT NULL DEFAULT 'dcr',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_oauth_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_oauth_clients_client_id_key" ON "mcp_oauth_clients"("client_id");

CREATE TABLE "mcp_oauth_authorization_codes" (
    "id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "redirect_uri" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "code_challenge_method" TEXT NOT NULL DEFAULT 'S256',
    "resource" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_oauth_authorization_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_oauth_authorization_codes_code_hash_key" ON "mcp_oauth_authorization_codes"("code_hash");
CREATE INDEX "mcp_oauth_authorization_codes_user_id_idx" ON "mcp_oauth_authorization_codes"("user_id");
CREATE INDEX "mcp_oauth_authorization_codes_domain_id_idx" ON "mcp_oauth_authorization_codes"("domain_id");

CREATE TABLE "mcp_oauth_grants" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_name" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "refresh_token_hash" TEXT,
    "refresh_expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_oauth_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_oauth_grants_refresh_token_hash_key" ON "mcp_oauth_grants"("refresh_token_hash");
CREATE INDEX "mcp_oauth_grants_domain_id_status_idx" ON "mcp_oauth_grants"("domain_id", "status");
CREATE INDEX "mcp_oauth_grants_user_id_idx" ON "mcp_oauth_grants"("user_id");

ALTER TABLE "mcp_oauth_grants" ADD CONSTRAINT "mcp_oauth_grants_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mcp_oauth_access_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_oauth_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_oauth_access_tokens_token_hash_key" ON "mcp_oauth_access_tokens"("token_hash");
CREATE INDEX "mcp_oauth_access_tokens_grant_id_idx" ON "mcp_oauth_access_tokens"("grant_id");

ALTER TABLE "mcp_oauth_access_tokens" ADD CONSTRAINT "mcp_oauth_access_tokens_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "mcp_oauth_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

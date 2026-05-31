-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "nangoConnectionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "tier" TEXT NOT NULL DEFAULT 'platform',
    "scopes" TEXT[],
    "domainId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_service_tier_domainId_userId_key" ON "Integration"("service", "tier", "domainId", "userId");

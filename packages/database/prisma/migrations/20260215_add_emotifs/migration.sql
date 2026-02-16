-- Emotifs MVP: Platform, Domain, User, MomentEmotif

-- CreateTable PlatformEmotif
CREATE TABLE "PlatformEmotif" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEmotif_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformEmotif_symbol_key" ON "PlatformEmotif"("symbol");

-- CreateTable DomainEmotif
CREATE TABLE "DomainEmotif" (
    "id" TEXT NOT NULL,
    "domain_id" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEmotif_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DomainEmotif_domain_id_slot_key" ON "DomainEmotif"("domain_id", "slot");
CREATE INDEX "DomainEmotif_domain_id_idx" ON "DomainEmotif"("domain_id");

ALTER TABLE "DomainEmotif" ADD CONSTRAINT "DomainEmotif_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable UserEmotif
CREATE TABLE "UserEmotif" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEmotif_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserEmotif_user_id_slot_key" ON "UserEmotif"("user_id", "slot");
CREATE INDEX "UserEmotif_user_id_idx" ON "UserEmotif"("user_id");

ALTER TABLE "UserEmotif" ADD CONSTRAINT "UserEmotif_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable MomentEmotif
CREATE TABLE "MomentEmotif" (
    "id" TEXT NOT NULL,
    "moment_id" TEXT NOT NULL,
    "emotif_id" TEXT NOT NULL,
    "emotif_type" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomentEmotif_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MomentEmotif_moment_id_emotif_id_user_id_key" ON "MomentEmotif"("moment_id", "emotif_id", "user_id");
CREATE INDEX "MomentEmotif_moment_id_idx" ON "MomentEmotif"("moment_id");
CREATE INDEX "MomentEmotif_user_id_idx" ON "MomentEmotif"("user_id");

ALTER TABLE "MomentEmotif" ADD CONSTRAINT "MomentEmotif_moment_id_fkey" FOREIGN KEY ("moment_id") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

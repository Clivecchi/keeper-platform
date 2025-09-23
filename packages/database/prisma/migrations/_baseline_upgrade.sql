-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "boardType" TEXT,
ADD COLUMN     "domainId" TEXT;

-- AlterTable
ALTER TABLE "Domain" ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "boardId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "data" JSONB,
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "topicId" TEXT,
    "draftId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "topicId" TEXT,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainAudit" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardAlias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domainId" TEXT NOT NULL,
    "boardId" UUID NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "BoardAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reqId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Topic_agentId_idx" ON "Topic"("agentId");

-- CreateIndex
CREATE INDEX "Topic_boardId_idx" ON "Topic"("boardId");

-- CreateIndex
CREATE INDEX "Draft_agentId_idx" ON "Draft"("agentId");

-- CreateIndex
CREATE INDEX "Draft_topicId_idx" ON "Draft"("topicId");

-- CreateIndex
CREATE INDEX "Task_agentId_idx" ON "Task"("agentId");

-- CreateIndex
CREATE INDEX "Task_topicId_idx" ON "Task"("topicId");

-- CreateIndex
CREATE INDEX "Task_draftId_idx" ON "Task"("draftId");

-- CreateIndex
CREATE INDEX "Activity_agentId_idx" ON "Activity"("agentId");

-- CreateIndex
CREATE INDEX "Activity_topicId_idx" ON "Activity"("topicId");

-- CreateIndex
CREATE INDEX "DomainAudit_domainId_createdAt_idx" ON "DomainAudit"("domainId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BoardAlias_domainId_alias_key" ON "BoardAlias"("domainId", "alias");

-- CreateIndex
CREATE INDEX "RequestLog_reqId_at_idx" ON "RequestLog"("reqId", "at");

-- CreateIndex
CREATE INDEX "Board_domainId_idx" ON "Board"("domainId");

-- CreateIndex
CREATE UNIQUE INDEX "Board_domainId_boardType_key" ON "Board"("domainId", "boardType");


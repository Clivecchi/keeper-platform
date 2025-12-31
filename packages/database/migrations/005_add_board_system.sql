-- Migration: Add Board System
-- This migration adds Board model and updates FrameInstance for Board Studio

-- Create Board table
CREATE TABLE "Board" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keeperId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "behavior" JSONB NOT NULL DEFAULT '{}',
    "data" JSONB NOT NULL DEFAULT '{}',
    "access" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for keeperId + slug
CREATE UNIQUE INDEX "Board_keeperId_slug_key" ON "Board"("keeperId", "slug");

-- Add index for keeperId
CREATE INDEX "Board_keeperId_idx" ON "Board"("keeperId");

-- Add new columns to FrameInstance
ALTER TABLE "FrameInstance" ADD COLUMN "boardId" UUID;
ALTER TABLE "FrameInstance" ADD COLUMN "role" TEXT;
ALTER TABLE "FrameInstance" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Untitled Frame';
ALTER TABLE "FrameInstance" ADD COLUMN "pattern" TEXT NOT NULL DEFAULT 'dialogic';
ALTER TABLE "FrameInstance" ADD COLUMN "frameType" TEXT NOT NULL DEFAULT 'media_card';
ALTER TABLE "FrameInstance" ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FrameInstance" ADD COLUMN "layoutKind" TEXT NOT NULL DEFAULT 'canvas';
ALTER TABLE "FrameInstance" ADD COLUMN "layoutData" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "FrameInstance" ADD COLUMN "props" JSONB NOT NULL DEFAULT '{}';

-- Add foreign key constraint
ALTER TABLE "FrameInstance" ADD CONSTRAINT "FrameInstance_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "FrameInstance_boardId_idx" ON "FrameInstance"("boardId");
CREATE INDEX "FrameInstance_entityType_entityId_idx" ON "FrameInstance"("entityType", "entityId");

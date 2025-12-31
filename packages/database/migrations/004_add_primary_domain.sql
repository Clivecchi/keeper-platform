-- Migration: Add Primary Domain Support
-- This migration adds primary domain identification to users

-- Add primaryDomainId column to users table (nullable, so safe to add)
ALTER TABLE users ADD COLUMN "primaryDomainId" TEXT;

-- Add index for performance
CREATE INDEX "users_primaryDomainId_idx" ON users("primaryDomainId"); 
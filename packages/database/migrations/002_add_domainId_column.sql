-- Adds missing domainId column to Keeper table to align with Prisma schema
ALTER TABLE "Keeper" 
ADD COLUMN IF NOT EXISTS "domainId" uuid REFERENCES "Domain"(id) ON DELETE SET NULL; 
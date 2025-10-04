-- AlterTable
-- Add foreign key constraint for Board.domainId -> Domain.id
-- Uses ON DELETE SET NULL to avoid breaking existing boards when domain is deleted

ALTER TABLE "Board" ADD CONSTRAINT "Board_domainId_fkey" 
FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Moment" DROP CONSTRAINT IF EXISTS "Moment_pathId_key";
ALTER TABLE "Moment" DROP CONSTRAINT IF EXISTS "Moment_journeyId_key";

DROP INDEX IF EXISTS "Moment_pathId_key";
DROP INDEX IF EXISTS "Moment_journeyId_key";

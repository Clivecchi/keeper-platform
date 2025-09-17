import { prisma } from '@keeper/database';

/**
 * Ensures DB shape for critical tables. Idempotent and safe to run per-request.
 * Returns an array of warnings (strings) if anything notable happens.
 */
export async function ensureDomainTableShape(): Promise<string[]> {
  const warnings: string[] = [];
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Domain"
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL
    `);
  } catch (e: any) {
    warnings.push(`Domain table guard failed: ${e?.message ?? 'unknown'}`);
  }
  return warnings;
}



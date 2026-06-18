/**
 * Eager backfill: convert kip_drafts.spec_json sections → points (accepted).
 * Run: pnpm --filter @keeper/database exec tsx prisma/scripts/backfill-draft-sections-to-points.ts
 */
import { PrismaClient } from '@prisma/client';
import { canonicalizeDraftSpecJson } from '@keeper/shared';

const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.kip_drafts.findMany({
    select: { id: true, spec_json: true },
  });

  let updated = 0;
  for (const draft of drafts) {
    const spec = draft.spec_json as Record<string, unknown> | null;
    if (!spec || !Array.isArray(spec.sections) || spec.sections.length === 0) continue;
    if (Array.isArray(spec.points) && spec.points.length > 0) continue;

    const canonical = canonicalizeDraftSpecJson(spec, { proposedBy: 'backfill' });
    await prisma.kip_drafts.update({
      where: { id: draft.id },
      data: { spec_json: canonical as object, updated_at: new Date() },
    });
    updated += 1;
  }

  console.log(`Backfilled ${updated} draft(s) from sections to points.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

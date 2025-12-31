/*
 * Board data sanitization script
 * Coerces malformed rows to safe defaults for data and behavior.
 */
import { PrismaClient } from '@keeper/database';

const prisma = new PrismaClient();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

async function main(): Promise<void> {
  const boards = await prisma.board.findMany({});
  let updatedCount = 0;

  for (const board of boards) {
    let changed = false;
    let nextData: any = {};
    let nextBehavior: any = {};

    // Normalize data
    const rawDataAny = (board as any).data;
    if (typeof rawDataAny === 'string') {
      try {
        nextData = JSON.parse(rawDataAny);
        changed = true;
      } catch {
        nextData = {};
        changed = true;
      }
    } else if (isPlainObject(rawDataAny)) {
      nextData = rawDataAny;
    } else {
      nextData = {};
      changed = true;
    }
    if (!Array.isArray(nextData.frames)) {
      nextData.frames = [];
      changed = true;
    }
    if (!isPlainObject(nextData.layoutPrefs)) {
      nextData.layoutPrefs = {};
      changed = true;
    }

    // Normalize behavior
    const rawBehaviorAny = (board as any).behavior;
    if (isPlainObject(rawBehaviorAny)) {
      nextBehavior = rawBehaviorAny;
    } else {
      nextBehavior = {};
      changed = true;
    }
    nextBehavior.realtime = { enabled: true, ...(nextBehavior.realtime || {}) };
    nextBehavior.composition = { allowEdits: true, ...(nextBehavior.composition || {}) };

    if (changed) {
      await prisma.board.update({
        where: { id: board.id },
        data: {
          data: nextData,
          behavior: nextBehavior,
          updatedAt: new Date(),
        },
      });
      updatedCount += 1;
      // eslint-disable-next-line no-console
      console.log(`[sanitize-boards] normalized board ${board.id}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[sanitize-boards] completed. updated ${updatedCount} of ${boards.length} boards.`);
}

main().then(() => prisma.$disconnect()).catch((err) => {
  console.error(err);
  return prisma.$disconnect().finally(() => process.exit(1));
});



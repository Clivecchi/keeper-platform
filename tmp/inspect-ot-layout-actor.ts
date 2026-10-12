import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });
const { prisma } = await import('@keeper/database');

const agent = await prisma.kip_agents.findUnique({
  where: { id: '385689a0-d5e5-47a7-bf97-08d6597e1a33' },
  select: { id: true, name: true, slug: true, role: true },
});
const domain = await prisma.domain.findUnique({
  where: { id: '9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9' },
  select: { settings: true },
});
const settings = domain?.settings && typeof domain.settings === 'object' && !Array.isArray(domain.settings)
  ? domain.settings as Record<string, unknown>
  : {};
const stories = settings.stories && typeof settings.stories === 'object' && !Array.isArray(settings.stories)
  ? settings.stories as Record<string, unknown>
  : {};
const rows = Array.isArray(stories.stories) ? stories.stories : [];
console.log(JSON.stringify({
  agent,
  activeStoryId: stories.activeStoryId,
  stories: rows.map((row) => {
    const item = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    return {
      id: item.id,
      title: item.title,
      status: item.status,
      dialogId: item.dialogId,
      material: Array.isArray(item.material)
        ? item.material.map((entry) => {
            const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
            return { id: row.id, kind: row.kind, sourceId: row.sourceId, title: row.title, dialogId: row.dialogId };
          })
        : [],
    };
  }),
}, null, 2));
await prisma.$disconnect();

/**
 * One-off: patch default domain frame_json.cover.chat_interface for live DB verification.
 * Run from repo: pnpm exec tsx scripts/patch-default-domain-chat-interface.ts
 * (cwd: packages/database)
 *
 * Loads DATABASE_URL from env, or from ../../apps/api/.env / ../../.env (first match).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  const roots = [
    resolve(__dirname, '../../../apps/api/.env'),
    resolve(__dirname, '../../../.env'),
    resolve(__dirname, '../prisma/.env'),
  ];
  for (const p of roots) {
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env.DATABASE_URL = v;
      return;
    }
  }
}

ensureDatabaseUrl();

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.domain.findUnique({
    where: { slug: 'default' },
    select: { id: true, frame_json: true },
  });
  if (!row) {
    console.error('No domain with slug "default"');
    process.exit(1);
  }

  const frame = (row.frame_json as Record<string, unknown> | null) ?? {};
  const cover = (frame.cover as Record<string, unknown> | undefined) ?? {};
  const existingChat = (cover.chat_interface as Record<string, unknown> | undefined) ?? {};

  const next = {
    ...frame,
    cover: {
      ...cover,
      chat_interface: {
        ...existingChat,
        enabled: false,
        placeholder: 'Testing the live database connection',
      },
    },
  };

  await prisma.domain.update({
    where: { slug: 'default' },
    data: { frame_json: next as object },
  });

  console.log('Updated domain "default" frame_json.cover.chat_interface:', {
    enabled: false,
    placeholder: 'Testing the live database connection',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

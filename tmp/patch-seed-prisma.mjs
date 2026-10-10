import fs from 'node:fs';
import path from 'node:path';

const dir = 'packages/database/prisma/seeds';
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.ts')) continue;
  const file = path.join(dir, name);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('new PrismaClient()')) continue;
  const next = text
    .replace(
      /import \{ PrismaClient \} from '@prisma\/client';\r?\n/,
      "import { prisma } from '../seedPrisma.ts';\n",
    )
    .replace(/\r?\nconst prisma = new PrismaClient\(\);\r?\n/, '\n');
  if (next === text || next.includes('new PrismaClient()')) {
    console.log('SKIP', name);
    continue;
  }
  fs.writeFileSync(file, next);
  console.log('OK', name);
}

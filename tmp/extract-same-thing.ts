import 'dotenv/config';
import { prisma } from '@keeper/database';

async function main() {
  const m = await prisma.kip_messages.findUnique({
    where: { id: 'e06804fd-d9cf-428c-8c51-08e6f585dade' },
    select: { content: true },
  });
  const text = m?.content ?? '';
  const re = /\b(the )?same (document|thing|proposal)\b/gi;
  let match: RegExpExecArray | null;
  const hits: string[] = [];
  while ((match = re.exec(text))) {
    const start = Math.max(0, match.index - 70);
    const end = Math.min(text.length, match.index + match[0].length + 70);
    hits.push(text.slice(start, end).replace(/\s+/g, ' '));
  }
  console.log(JSON.stringify({ hits, count: hits.length }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

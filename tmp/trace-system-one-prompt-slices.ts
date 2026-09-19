/**
 * Read-only: slice Kip's composedSystemPrompt for TypeSafe / Cast / reorganize directives.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';

const LOG = '4bec0f75-965a-46ec-bd10-a619fe774788';

function slices(text: string, needles: string[]): Array<{ needle: string; hits: string[] }> {
  return needles.map((needle) => {
    const hits: string[] = [];
    const lower = text.toLowerCase();
    const n = needle.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const at = lower.indexOf(n, from);
      if (at < 0) break;
      const start = Math.max(0, at - 180);
      const end = Math.min(text.length, at + needle.length + 220);
      hits.push(text.slice(start, end));
      from = at + n.length;
      if (hits.length >= 6) break;
    }
    return { needle, hits };
  });
}

async function main() {
  const log = await prisma.kip_agent_logs.findUnique({
    where: { id: LOG },
    select: { output: true },
  });
  const output = log?.output ? JSON.parse(log.output) as { data?: { composedSystemPrompt?: string; model_response_raw?: string } } : null;
  const prompt = output?.data?.composedSystemPrompt ?? '';
  const raw = output?.data?.model_response_raw ?? '';

  console.log(JSON.stringify({
    promptLen: prompt.length,
    rawPreview: raw.slice(0, 600),
    slices: slices(prompt, [
      'TypeSafe',
      'System One',
      'turnPosture',
      'jev',
      'REVIEW & REORGANIZE',
      'the human asked',
      'Cast consultation',
      'after hearing the Cast',
      'document.reorganize',
      'orchestration',
      'Confidence must not',
    ]),
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

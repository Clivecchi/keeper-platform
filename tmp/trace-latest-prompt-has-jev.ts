/**
 * Confirm Kip's composed prompt did not contain the stored Jev numbers.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';

const LOG = 'e647b93c-c3cc-4ea1-8c73-5b5cbaab3111';

async function main() {
  const log = await prisma.kip_agent_logs.findUnique({
    where: { id: LOG },
    select: { output: true },
  });
  const output = log?.output
    ? JSON.parse(log.output) as { data?: { composedSystemPrompt?: string; orchestration?: unknown } }
    : null;
  const prompt = output?.data?.composedSystemPrompt ?? '';
  console.log(JSON.stringify({
    promptLen: prompt.length,
    hasJevModel: /jev-1\.13\.0|jev-latest/i.test(prompt),
    hasDiagnose058: /0\.58|0\.65/.test(prompt) && /diagnose/.test(prompt),
    hasTurnPostureShadow: /turnPostureShadow|documentReorganizationRequested/i.test(prompt),
    hasSystemOneOrientationBlock: /System One orientation/i.test(prompt),
    orchInLog: Boolean(output?.data?.orchestration),
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

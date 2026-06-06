/**
 * B2 verification: full agent run path must not 400 on gpt-4 / gpt-3.5-turbo.
 * Run: npx tsx scripts/verify-jsonmode-gating.ts
 */
import { prisma } from '@keeper/database';
import { KipAgentService } from '../src/api/kip/agents.js';

type Case = {
  label: string;
  model_provider: 'openai' | 'anthropic';
  model: string;
  requireSuccess: boolean;
};

const CASES: Case[] = [
  { label: 'gpt-4 (no json_object)', model_provider: 'openai', model: 'gpt-4', requireSuccess: true },
  { label: 'gpt-3.5-turbo (no json_object)', model_provider: 'openai', model: 'gpt-3.5-turbo', requireSuccess: true },
  { label: 'gpt-4o (json_object ok)', model_provider: 'openai', model: 'gpt-4o', requireSuccess: true },
  { label: 'claude-sonnet-4-6', model_provider: 'anthropic', model: 'claude-sonnet-4-6', requireSuccess: !!process.env.ANTHROPIC_API_KEY?.trim() },
];

function isResponseFormatError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('response_format') ||
    lower.includes('json_object') ||
    lower.includes("invalid parameter: 'response_format'")
  );
}

async function main() {
  const agent = await prisma.kip_agents.findFirst({
    where: { slug: 'kip' },
    select: { id: true, slug: true, model: true, model_provider: true },
  });
  if (!agent) {
    console.error('FAIL: kip agent not found');
    process.exit(1);
  }

  const user = await prisma.users.findFirst({
    where: { email: 'clivecchi@gmail.com' },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error('FAIL: user not found');
    process.exit(1);
  }

  const domain = await prisma.domain.findFirst({
    where: { slug: 'default' },
    select: { id: true },
  });

  const original = { model: agent.model, model_provider: agent.model_provider };
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

  console.log(`Agent: ${agent.slug} (${agent.id})`);
  console.log(`User: ${user.email}`);
  console.log(`OPENAI_API_KEY: ${openaiKey ? 'present' : 'missing'}`);
  console.log(`ANTHROPIC_API_KEY: ${anthropicKey ? 'present' : 'missing'}`);
  console.log('---');

  const results: Array<{ label: string; ok: boolean; detail: string }> = [];

  for (const testCase of CASES) {
    if (!testCase.requireSuccess) {
      console.log(`SKIP — ${testCase.label}: no API key configured`);
      continue;
    }

    await prisma.kip_agents.update({
      where: { id: agent.id },
      data: { model: testCase.model, model_provider: testCase.model_provider },
    });

    try {
      const result = await KipAgentService.runAgent(
        agent.slug,
        'Reply briefly with one word: verified',
        user.id,
        undefined,
        { domainId: domain?.id },
      );

      const serialized = JSON.stringify(result);
      const responseFormatBug = isResponseFormatError(serialized);
      const ok = !responseFormatBug;
      const detail = responseFormatBug
        ? `response_format regression: ${serialized.slice(0, 200)}`
        : `no response_format error (agent path reached OpenAI): ${serialized.slice(0, 120)}`;
      results.push({ label: testCase.label, ok, detail });
      console.log(`${ok ? 'PASS' : 'FAIL'} — ${testCase.label}: ${detail}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const responseFormatBug = isResponseFormatError(message);
      const ok = !responseFormatBug;
      const detail = responseFormatBug
        ? `response_format regression: ${message.slice(0, 200)}`
        : `no response_format error: ${message.slice(0, 200)}`;
      results.push({ label: testCase.label, ok, detail });
      console.log(`${ok ? 'PASS' : 'FAIL'} — ${testCase.label}: ${detail}`);
    }
  }

  await prisma.kip_agents.update({
    where: { id: agent.id },
    data: original,
  });

  console.log('---');
  if (results.length === 0) {
    console.error('FAIL: no cases executed (missing API keys)');
    process.exit(1);
  }
  if (!results.every((r) => r.ok)) process.exit(1);
  console.log(`All ${results.length} agent-run verification cases passed.`);
}

main()
  .catch((e) => {
    console.error('Verification error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

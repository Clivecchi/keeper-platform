#!/usr/bin/env tsx

/**
 * Cloud platform agent seed — infra read capabilities for Railway/Vercel/GitHub Chronicle.
 *
 * Canonical capability list matches apps/api/src/capabilities/infraCapabilities.ts
 * `CLOUD_AGENT_CAPABILITIES` (infra read + GitHub MCP tools).
 *
 * Idempotent — creates Cloud agent or ensures read infra capabilities are present.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const CLOUD_INFRA_READ_CAPABILITIES = [
  'infra.railway.read',
  'infra.vercel.read',
  'infra.github.read',
] as const;

export const GITHUB_MCP_TOOL_CAPABILITIES = [
  'github.repo.read',
  'github.commits.list',
  'github.branch.create',
  'github.file.write',
  'github.pr.create',
  'github.pr.read',
  'github.actions.status',
] as const;

export const CLOUD_AGENT_CAPABILITIES = [
  ...CLOUD_INFRA_READ_CAPABILITIES,
  'infra.github.write',
  ...GITHUB_MCP_TOOL_CAPABILITIES,
] as const;

function mergeCloudCapabilities(existing: string[]): string[] {
  return Array.from(new Set([...existing, ...CLOUD_AGENT_CAPABILITIES]));
}

export { prisma as cloudAgentPrisma };

export default async function seedCloudAgent() {
  console.log('☁️  Seeding Cloud platform agent...');

  const existing = await prisma.kip_agents.findFirst({
    where: { slug: 'cloud' },
    select: { id: true, capabilities: true },
  });

  if (existing) {
    const capabilities = mergeCloudCapabilities(existing.capabilities);
    const agent = await prisma.kip_agents.update({
      where: { id: existing.id },
      data: { capabilities },
    });
    console.log(
      `  ✅ Cloud agent updated — id: ${agent.id}, capabilities: ${agent.capabilities.join(', ')}`,
    );
    return;
  }

  const agent = await prisma.kip_agents.create({
    data: {
      name: 'Cloud',
      slug: 'cloud',
      model: 'claude-sonnet-4-6',
      model_provider: 'anthropic',
      purpose:
        'Technical agent. Codebase, Railway, Vercel, GitHub. Reads and executes. No persona overlay.',
      agent_class: 'System',
      status: 'ready',
      visibility: 'private',
      memory_enabled: true,
      tools: [],
      permissions: [],
      capabilities: [...CLOUD_AGENT_CAPABILITIES],
      config: {
        persona: null,
        suppress_kip_system_prompt: true,
        suppress_sole_memory: true,
        domain: 'default',
      },
      model_settings: {},
    },
  });

  console.log(`  ✅ Cloud agent created — id: ${agent.id}, name: ${agent.name}`);
}

if (process.argv[1]?.includes('cloud-agent.seed')) {
  seedCloudAgent()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Cloud agent seed failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

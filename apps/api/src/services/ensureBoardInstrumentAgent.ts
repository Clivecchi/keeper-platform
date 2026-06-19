/**
 * Ensures board instrument agents (Cloud, Rendr) exist before IDE director delegation.
 */

import { prisma } from '@keeper/database';
import { CLOUD_AGENT_CAPABILITIES } from '../capabilities/infraCapabilities.js';
import type { BoardInstrumentSlug } from './directorDialog.js';

type InstrumentAgent = NonNullable<
  Awaited<ReturnType<typeof prisma.kip_agents.findUnique>>
>;

async function ensureCloudAgent(): Promise<InstrumentAgent | null> {
  const existing = await prisma.kip_agents.findUnique({ where: { slug: 'cloud' } });
  if (existing) return existing;

  try {
    return await prisma.kip_agents.create({
      data: {
        name: 'Cloud',
        slug: 'cloud',
        model: 'claude-sonnet-4-6',
        model_provider: 'anthropic',
        purpose:
          'Technical agent. Codebase, Railway, Vercel, GitHub. Reads and executes. No persona overlay.',
        role: 'System',
        status: 'ready',
        visibility: 'private',
        memory_enabled: true,
        tools: [],
        permissions: [],
        capabilities: [...CLOUD_AGENT_CAPABILITIES],
        config: {
          persona: null,
          personality: 'Technical Execution Agent. I read, build, and ship.',
          suppress_kip_system_prompt: true,
          suppress_sole_memory: true,
          domain: 'default',
        },
        model_settings: {},
      },
    });
  } catch (error) {
    console.error('[director] Cloud agent create failed', {
      error: error instanceof Error ? error.message : error,
    });
    return prisma.kip_agents.findUnique({ where: { slug: 'cloud' } });
  }
}

async function ensureRendrAgent(): Promise<InstrumentAgent | null> {
  const existing = await prisma.kip_agents.findUnique({ where: { slug: 'rendr' } });
  if (existing) return existing;

  try {
    return await prisma.kip_agents.create({
      data: {
        name: 'Rendr',
        slug: 'rendr',
        model: 'claude-sonnet-4-6',
        model_provider: 'anthropic',
        purpose:
          'Presence and rendering agent. Translates presenceTreatment into spatial ratio, motion, density, and what comes forward.',
        role: 'System',
        status: 'ready',
        visibility: 'private',
        memory_enabled: true,
        tools: [],
        permissions: [],
        capabilities: [],
        config: {
          persona: null,
          personality: 'Presence and rendering guidance for the IDE board.',
          suppress_kip_system_prompt: true,
          suppress_sole_memory: true,
        },
        model_settings: {},
      },
    });
  } catch (error) {
    console.error('[director] Rendr agent create failed', {
      error: error instanceof Error ? error.message : error,
    });
    return prisma.kip_agents.findUnique({ where: { slug: 'rendr' } });
  }
}

export async function ensureBoardInstrumentAgent(
  slug: BoardInstrumentSlug,
): Promise<InstrumentAgent | null> {
  if (slug === 'cloud') return ensureCloudAgent();
  return ensureRendrAgent();
}

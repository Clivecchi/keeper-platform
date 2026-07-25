/**
 * Ensures board instrument agents (Cloud, Rendr) exist before IDE director delegation.
 */

import { prisma, type Prisma } from '@keeper/database';
import { CLOUD_AGENT_CAPABILITIES } from '../capabilities/infraCapabilities.js';
import type { BoardInstrumentSlug } from './directorDialog.js';
import {
  RENDR_AGENT_PURPOSE,
  RENDR_VOICE_PROMPT,
} from './rendr/rendrAgentConfig.js';
type InstrumentAgent = NonNullable<
  Awaited<ReturnType<typeof prisma.kip_agents.findUnique>>
>;

async function ensureCloudAgent(): Promise<InstrumentAgent | null> {
  const existing = await prisma.kip_agents.findUnique({ where: { slug: 'cloud' } });
  if (existing) {
    const current = existing.capabilities ?? [];
    const needsCaps = CLOUD_AGENT_CAPABILITIES.some((cap) => !current.includes(cap));
    const config = (existing.config ?? {}) as Record<string, unknown>;
    const needsParticipation = config.dialog_participation !== 'support_only';
    if (needsCaps || needsParticipation) {
      return prisma.kip_agents.update({
        where: { slug: 'cloud' },
        data: {
          ...(needsCaps
            ? {
                capabilities: Array.from(
                  new Set([...current, ...CLOUD_AGENT_CAPABILITIES]),
                ),
              }
            : {}),
          config: {
            ...config,
            dialog_participation: 'support_only',
          } as Prisma.InputJsonValue,
        },
      });
    }
    return existing;
  }

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
          dialog_participation: 'support_only',
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
  if (existing) {
    const config = (existing.config ?? {}) as Record<string, unknown>;
    const voicePrompt =
      typeof config.voice_prompt === 'string' ? config.voice_prompt.trim() : '';
    if (!voicePrompt || existing.purpose !== RENDR_AGENT_PURPOSE) {
      return prisma.kip_agents.update({
        where: { slug: 'rendr' },
        data: {
          purpose: RENDR_AGENT_PURPOSE,
          config: {
            ...config,
            persona: null,
            suppress_kip_system_prompt: true,
            suppress_sole_memory: true,
            voice_prompt: RENDR_VOICE_PROMPT,
          } as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
      });
    }
    return existing;
  }

  try {
    return await prisma.kip_agents.create({
      data: {
        name: 'Rendr',
        slug: 'rendr',
        model: 'claude-sonnet-4-6',
        model_provider: 'anthropic',
        purpose: RENDR_AGENT_PURPOSE,
        role: 'System',
        status: 'ready',
        visibility: 'private',
        memory_enabled: true,
        tools: [],
        permissions: [],
        capabilities: [],
        config: {
          persona: null,
          suppress_kip_system_prompt: true,
          suppress_sole_memory: true,
          domain: 'default',
          voice_prompt: RENDR_VOICE_PROMPT,
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
  if (slug === 'rendr') return ensureRendrAgent();
  return prisma.kip_agents.findUnique({ where: { slug } });
}

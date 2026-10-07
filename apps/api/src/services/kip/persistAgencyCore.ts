/**
 * Write the platform Agency core onto the agent row once.
 * Prompt resolution does not wait on this write: resolveAgencyCore already falls back.
 */
import { prisma, type Prisma } from '@keeper/database';
import { platformAgencyCore, type AgencyCoreV1 } from '@keeper/shared';

export async function persistPlatformAgencyCore(agent: {
  id: string;
  slug?: string | null;
  config?: unknown;
}): Promise<AgencyCoreV1 | null> {
  const platform = platformAgencyCore(agent.slug);
  if (!platform) return null;
  const config = agent.config && typeof agent.config === 'object' && !Array.isArray(agent.config)
    ? (agent.config as Record<string, unknown>)
    : {};
  const existing = config.agency;
  if (existing && typeof existing === 'object' && !Array.isArray(existing) && (existing as { v?: unknown }).v === 1) {
    return null;
  }
  try {
    await prisma.kip_agents.update({
      where: { id: agent.id },
      data: {
        config: { ...config, agency: platform } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.warn('[agency-core] persist failed', {
      slug: agent.slug,
      error: error instanceof Error ? error.message : error,
    });
  }
  return platform;
}

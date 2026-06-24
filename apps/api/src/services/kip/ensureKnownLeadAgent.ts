import { prisma } from '@keeper/database';
import type { kip_agents } from '@prisma/client';

export const KNOWN_LEAD_AGENT_SLUGS = ['kip', 'ceox'] as const;

export type KnownLeadAgentSlug = (typeof KNOWN_LEAD_AGENT_SLUGS)[number];

export function isKnownLeadAgentSlug(slug: string): slug is KnownLeadAgentSlug {
  return (KNOWN_LEAD_AGENT_SLUGS as readonly string[]).includes(slug);
}

/**
 * Load a KIP agent by slug and self-heal canonical Lead agents (kip, ceox)
 * when production data drifts from expected role=Lead + public visibility.
 */
export async function getKipAgentBySlugEnsured(slug: string): Promise<kip_agents | null> {
  const agent = await prisma.kip_agents.findUnique({
    where: { slug },
  });

  if (!agent) {
    return null;
  }

  if (!isKnownLeadAgentSlug(slug)) {
    return agent;
  }

  if (agent.role === 'Lead' && agent.visibility === 'public') {
    return agent;
  }

  console.warn('[kip/agents] self-healing known Lead agent record', {
    slug,
    role: agent.role,
    visibility: agent.visibility,
  });

  return prisma.kip_agents.update({
    where: { slug },
    data: {
      role: 'Lead',
      visibility: 'public',
      updated_at: new Date(),
    },
  });
}

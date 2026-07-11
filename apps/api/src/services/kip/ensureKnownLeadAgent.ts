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

/**
 * Resolve agent by slug for API reads — repairs missing domain lead rows inline
 * so boards do not 404 when frame_json.agent_id exists without a kip_agents row.
 */
export async function resolveKipAgentBySlugForLoad(slug: string): Promise<kip_agents | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  let agent = await getKipAgentBySlugEnsured(trimmed);
  if (agent) return agent;

  const { ensureDomainLeadAgentBySlug } = await import('../domains/provisionDomainOnCreate.js');
  const repaired = await ensureDomainLeadAgentBySlug(prisma, trimmed);
  if (repaired) {
    agent = await getKipAgentBySlugEnsured(repaired.slug);
    if (agent) return agent;
  }

  if (trimmed === 'rendr') {
    const { ensureBoardInstrumentAgent } = await import('../ensureBoardInstrumentAgent.js');
    return ensureBoardInstrumentAgent('rendr');
  }

  // Last resort: synthetic provision slug — do not substitute platform Kip.
  if (trimmed.endsWith('-lead')) {
    return null;
  }

  return null;
}

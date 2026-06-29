/**
 * Domain-scoped agent roster — domain lead (when not Kip) + platform Lead (Kip).
 * Shared by GET /api/domains/:domainId/kip/agents and Kip environment resolution.
 */

import { prisma } from '@keeper/database';

export type DomainScopedAgentSummary = {
  id: string;
  slug: string;
  name: string;
  purpose: string | null;
  role: string | null;
};

const agentSelect = {
  id: true,
  slug: true,
  name: true,
  purpose: true,
  role: true,
} as const;

export async function loadDomainScopedAgents(
  domainId: string,
): Promise<DomainScopedAgentSummary[]> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  if (!domain) return [];

  const domainSettings = ((domain.settings as Record<string, unknown>) || {});
  const primaryAgentId =
    typeof domainSettings.primaryAgentId === 'string' ? domainSettings.primaryAgentId : null;

  const kipAgent = await prisma.kip_agents.findFirst({
    where: { slug: 'kip' },
    select: agentSelect,
  });

  const agents: DomainScopedAgentSummary[] = [];
  const seen = new Set<string>();

  const pushUnique = (agent: typeof kipAgent) => {
    if (!agent || seen.has(agent.id)) return;
    seen.add(agent.id);
    agents.push({
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      purpose: agent.purpose ?? null,
      role: agent.role ?? null,
    });
  };

  if (primaryAgentId && primaryAgentId !== kipAgent?.id) {
    const primaryAgent = await prisma.kip_agents.findUnique({
      where: { id: primaryAgentId },
      select: agentSelect,
    });
    pushUnique(primaryAgent);
  }

  if (kipAgent) {
    pushUnique(kipAgent);
  }

  return agents;
}

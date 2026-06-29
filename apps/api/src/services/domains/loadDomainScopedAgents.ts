/**
 * Domain-accessible agent roster for Agent board nav, Kip environment, and director delegation.
 *
 * Order: domain lead (when not Kip) → Kip (platform Lead) → platform domain-accessible agents.
 * Platform agents (Cloud, Rendr) live in kip_agents globally — merged here for every domain.
 */

import { prisma, type Prisma } from '@keeper/database';

/** Platform agents every domain can configure on Agent board (not the full global registry). */
export const DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS = ['cloud', 'rendr'] as const;

export type DomainAccessiblePlatformAgentSlug =
  (typeof DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS)[number];

export type DomainScopedAgentSummary = {
  id: string;
  slug: string;
  name: string;
  purpose: string | null;
  role: string | null;
};

const summarySelect = {
  id: true,
  slug: true,
  name: true,
  purpose: true,
  role: true,
} as const;

export const domainAccessibleAgentSelect = {
  id: true,
  slug: true,
  name: true,
  purpose: true,
  model: true,
  context_scope: true,
  memory_enabled: true,
  tools: true,
  permissions: true,
  config: true,
  status: true,
  role: true,
  model_provider: true,
  model_settings: true,
  visibility: true,
  created_at: true,
  updated_at: true,
} as const;

type SummaryAgent = Prisma.kip_agentsGetPayload<{ select: typeof summarySelect }>;
type FullDomainAccessibleAgent = Prisma.kip_agentsGetPayload<{
  select: typeof domainAccessibleAgentSelect;
}>;

/** Resolve ordered agent ids for a domain's accessible roster. */
async function resolveDomainAccessibleAgentIds(domainId: string): Promise<string[]> {
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
    select: { id: true },
  });

  const ids: string[] = [];
  const seen = new Set<string>();

  const pushId = (id: string | null | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  if (primaryAgentId && primaryAgentId !== kipAgent?.id) {
    pushId(primaryAgentId);
  }

  pushId(kipAgent?.id);

  for (const slug of DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS) {
    const platformAgent = await prisma.kip_agents.findUnique({
      where: { slug },
      select: { id: true },
    });
    pushId(platformAgent?.id);
  }

  return ids;
}

function orderAgentsByIds<T extends { id: string }>(agents: T[], ids: string[]): T[] {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  return ids.flatMap((id) => {
    const agent = byId.get(id);
    return agent ? [agent] : [];
  });
}

export async function loadDomainScopedAgents(
  domainId: string,
): Promise<DomainScopedAgentSummary[]> {
  const ids = await resolveDomainAccessibleAgentIds(domainId);
  if (ids.length === 0) return [];

  const rows = await prisma.kip_agents.findMany({
    where: { id: { in: ids } },
    select: summarySelect,
  });

  return orderAgentsByIds(rows, ids).map((agent) => ({
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    purpose: agent.purpose ?? null,
    role: agent.role ?? null,
  }));
}

export async function loadDomainAccessibleAgents(
  domainId: string,
): Promise<FullDomainAccessibleAgent[]> {
  const ids = await resolveDomainAccessibleAgentIds(domainId);
  if (ids.length === 0) return [];

  const rows = await prisma.kip_agents.findMany({
    where: { id: { in: ids } },
    select: domainAccessibleAgentSelect,
  });

  return orderAgentsByIds(rows, ids);
}

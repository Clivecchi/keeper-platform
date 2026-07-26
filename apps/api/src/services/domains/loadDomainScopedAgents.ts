/**
 * Domain-accessible agent roster for Agent board nav, Kip environment, and director delegation.
 *
 * Order: domain lead (when not Kip) → Kip (platform Lead) → platform domain-accessible agents.
 * Platform agents (Cloud, Rendr) live in kip_agents globally — merged here for every domain.
 */

import { prisma, type Prisma } from '@keeper/database';
import {
  resolveDialogParticipation,
  type DialogParticipation,
} from '@keeper/shared';

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
  /** Declared Dialog-voice mode — from config.dialog_participation (default voice). */
  dialogParticipation: DialogParticipation;
}

/**
 * Legacy Cloud rows were seeded `support_only`, which skipped Dialog consult.
 * Promote to `voice` on roster load so Roll Call includes Cloud. Agent Config
 * may set `silent` afterward; `support_only` is no longer the Cloud default.
 */
async function promoteLegacyCloudDialogVoice(): Promise<void> {
  const cloud = await prisma.kip_agents.findUnique({
    where: { slug: 'cloud' },
    select: { id: true, config: true },
  });
  if (!cloud) return;
  const config =
    cloud.config && typeof cloud.config === 'object' && !Array.isArray(cloud.config)
      ? ({ ...(cloud.config as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  if (config.dialog_participation !== 'support_only') return;
  // Honor intentional Agent Config choices.
  if (config.dialog_participation_user_set === true) return;
  config.dialog_participation = 'voice';
  await prisma.kip_agents.update({
    where: { id: cloud.id },
    data: { config: config as Prisma.InputJsonValue },
  });
};

const summarySelect = {
  id: true,
  slug: true,
  name: true,
  purpose: true,
  role: true,
  config: true,
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
  await promoteLegacyCloudDialogVoice();
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
    dialogParticipation: resolveDialogParticipation(agent.config, { slug: agent.slug }),
  }));
}

export async function loadDomainAccessibleAgents(
  domainId: string,
): Promise<FullDomainAccessibleAgent[]> {
  await promoteLegacyCloudDialogVoice();
  const ids = await resolveDomainAccessibleAgentIds(domainId);
  if (ids.length === 0) return [];

  const rows = await prisma.kip_agents.findMany({
    where: { id: { in: ids } },
    select: domainAccessibleAgentSelect,
  });

  return orderAgentsByIds(rows, ids);
}

/**
 * Read-only Agency Place facts for a Domain.
 * Composes existing Domain, People, Lead, policy, Lens, and last Lead performance.
 * Does not create storage or invent missing fields.
 */

import { prisma } from '@keeper/database';
import { parseAgentPerformanceProvenance } from '@keeper/shared';
import { loadDomainAgentPolicy } from '../../governance/index.js';
import { resolveLensPair } from '../kip/modeConfig.js';
import { resolveDomainLeadAgentFromDomain } from './resolveDomainLeadAgent.js';

export type AgencyPlaceLayer = {
  key: string;
  label: string;
  status: string;
};

export type AgencyPlacePayload = {
  domainId: string;
  domainName: string;
  domainSlug: string;
  entrusted: {
    ownerName: string | null;
    ownerUserId: string | null;
    leadName: string | null;
    leadRole: string | null;
    peopleCount: number | null;
  };
  contract: {
    name: string;
    version: string;
    enforcementMode: string;
  } | null;
  lens: {
    name: string;
    source: 'domain' | 'default';
  } | null;
  lastPerformance: {
    messageId: string;
    dialogId: string;
    dialogTitle: string;
    recordedAt: string;
    agentId: string;
    agentName: string;
    layers: AgencyPlaceLayer[];
  } | null;
};

export async function loadAgencyPlace(domainId: string): Promise<AgencyPlacePayload | null> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      id: true,
      name: true,
      slug: true,
      display_label: true,
      ownerId: true,
      settings: true,
      frame_json: true,
      users: { select: { id: true, name: true, email: true } },
    },
  });
  if (!domain) return null;

  const ownerName =
    domain.users?.name?.trim() || domain.users?.email?.trim() || null;

  const extraMembers = await prisma.domainPermission.count({
    where: { domainId, userId: { not: domain.ownerId } },
  });

  const lead = await resolveDomainLeadAgentFromDomain(prisma, domain);
  const leadRow = lead
    ? await prisma.kip_agents.findUnique({
        where: { id: lead.id },
        select: { role: true },
      })
    : null;

  const policy = await loadDomainAgentPolicy(domainId);
  const { domainLens } = await resolveLensPair(domain.id);

  let lastPerformance: AgencyPlacePayload['lastPerformance'] = null;
  if (lead) {
    const message = await prisma.kip_messages.findFirst({
      where: {
        sender: 'agent',
        kip_sessions: {
          agent_id: lead.id,
          is_archived: false,
          dialog: { domain_id: domainId },
        },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        created_at: true,
        metadata: true,
        kip_sessions: {
          select: {
            dialog_id: true,
            dialog: { select: { title: true } },
          },
        },
      },
    });

    const dialogId = message?.kip_sessions.dialog_id?.trim() ?? '';
    const dialogTitle = message?.kip_sessions.dialog?.title?.trim() ?? '';
    if (message && dialogId && dialogTitle) {
      const metadata =
        message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
          ? (message.metadata as Record<string, unknown>)
          : {};
      const provenance = parseAgentPerformanceProvenance(metadata.performanceProvenance);
      lastPerformance = {
        messageId: message.id,
        dialogId,
        dialogTitle,
        recordedAt: (provenance?.recordedAt ?? message.created_at.toISOString()).trim(),
        agentId: lead.id,
        agentName: lead.name,
        layers: provenance
          ? provenance.layers.map((layer) => ({
              key: layer.key,
              label: layer.label,
              status: layer.status,
            }))
          : [],
      };
    }
  }

  return {
    domainId: domain.id,
    domainName: domain.display_label?.trim() || domain.name,
    domainSlug: domain.slug,
    entrusted: {
      ownerName,
      ownerUserId: domain.ownerId,
      leadName: lead?.name ?? null,
      leadRole: leadRow?.role?.trim() || null,
      peopleCount: 1 + extraMembers,
    },
    contract: policy
      ? {
          name: policy.contract.name,
          version: policy.contract.version,
          enforcementMode: policy.enforcementMode,
        }
      : null,
    lens: domainLens
      ? {
          name: domainLens.name,
          source: domainLens.domainId === domain.id ? 'domain' : 'default',
        }
      : null,
    lastPerformance,
  };
}

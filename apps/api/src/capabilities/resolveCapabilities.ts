/**
 * Resolves effective agent capabilities: agent record ∩ board ceiling (when board provided).
 */

import { prisma } from '@keeper/database';
import { BOARD_CAPABILITY_CEILINGS } from './boardCapabilityCeilings.js';

export type ResolveCapabilitiesInput = {
  agentId?: string;
  agentSlug?: string;
  boardId?: string;
};

export type ResolvedCapabilities = {
  agentId: string;
  agentSlug: string;
  boardId: string | null;
  agentCapabilities: string[];
  boardCeiling: string[] | null;
  capabilities: string[];
};

export async function resolveAgentCapabilities(
  input: ResolveCapabilitiesInput,
): Promise<ResolvedCapabilities | null> {
  const { agentId, agentSlug, boardId } = input;
  if (!agentId && !agentSlug) return null;

  const agent = await prisma.kip_agents.findFirst({
    where: agentId ? { id: agentId } : { slug: agentSlug! },
    select: { id: true, slug: true, capabilities: true },
  });
  if (!agent) return null;

  const agentCaps = Array.isArray(agent.capabilities)
    ? agent.capabilities.filter((c): c is string => typeof c === 'string')
    : [];

  const boardCeiling: string[] | null = boardId
    ? [...(BOARD_CAPABILITY_CEILINGS[boardId] ?? [])]
    : null;

  let effective: string[];
  if (boardCeiling && boardCeiling.length > 0) {
    const ceilingSet = new Set(boardCeiling);
    effective = agentCaps.filter((c) => ceilingSet.has(c));
  } else {
    effective = [...agentCaps];
  }

  return {
    agentId: agent.id,
    agentSlug: agent.slug,
    boardId: boardId ?? null,
    agentCapabilities: agentCaps,
    boardCeiling,
    capabilities: effective,
  };
}

export function hasCapability(resolved: ResolvedCapabilities | null, required: string): boolean {
  if (!resolved) return false;
  return resolved.capabilities.includes(required);
}

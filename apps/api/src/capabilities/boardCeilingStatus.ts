/**
 * Cloud MCP ceiling — read-only descriptor of what Cloud may reach via
 * in-process mcp.call after agent record ∩ ceiling.
 *
 * Does not change requireCapability or MCP tool gates.
 */

import { BUILD_BOARD_ID, normalizeUniversalBoardId } from '@keeper/shared';
import { BOARD_CAPABILITY_CEILINGS, boardCeilingFor } from './boardCapabilityCeilings.js';
import type { ResolvedCapabilities } from './resolveCapabilities.js';

export type CloudCeilingStatus = {
  surface: 'cloud_mcp_ceiling';
  boardId: string;
  /** Canonical ceiling strings for Cloud / Build Board. */
  ceiling: string[];
  /** Agent record capabilities before ceiling filter. */
  agentCapabilities: string[] | null;
  /** Effective set (agent ∩ ceiling). Null when no agent context. */
  granted: string[] | null;
  /** On the ceiling but not on the agent record (or filtered off). */
  denied: string[] | null;
  /** Agent caps that are not on this ceiling. */
  aboveCeiling: string[] | null;
  note: string;
};

export type BuildCloudCeilingStatusParams = {
  boardId?: string | null;
  agentCapabilities?: string[] | null;
  resolved?: ResolvedCapabilities | null;
};

function resolveBoardId(boardId?: string | null): string {
  const normalized = normalizeUniversalBoardId(boardId);
  if (normalized && normalized in BOARD_CAPABILITY_CEILINGS) return normalized;
  return BUILD_BOARD_ID;
}

export function buildCloudCeilingStatus(
  params: BuildCloudCeilingStatusParams = {},
): CloudCeilingStatus {
  const boardId = resolveBoardId(params.boardId ?? params.resolved?.boardId);
  const ceiling = [...boardCeilingFor(boardId)];
  const ceilingSet = new Set(ceiling);

  const agentCapabilities =
    params.resolved?.agentCapabilities ??
    (params.agentCapabilities ? [...params.agentCapabilities] : null);

  const grantedFromResolved = params.resolved?.capabilities;
  let granted: string[] | null = null;
  let denied: string[] | null = null;
  let aboveCeiling: string[] | null = null;

  if (grantedFromResolved) {
    granted = [...grantedFromResolved].sort();
    const grantedSet = new Set(granted);
    denied = ceiling.filter((cap) => !grantedSet.has(cap)).sort();
    aboveCeiling = (agentCapabilities ?? [])
      .filter((cap) => !ceilingSet.has(cap))
      .sort();
  } else if (agentCapabilities) {
    granted = agentCapabilities.filter((cap) => ceilingSet.has(cap)).sort();
    const grantedSet = new Set(granted);
    denied = ceiling.filter((cap) => !grantedSet.has(cap)).sort();
    aboveCeiling = agentCapabilities.filter((cap) => !ceilingSet.has(cap)).sort();
  }

  const hasAgent = agentCapabilities !== null;
  return {
    surface: 'cloud_mcp_ceiling',
    boardId,
    ceiling: [...ceiling].sort(),
    agentCapabilities: agentCapabilities ? [...agentCapabilities].sort() : null,
    granted,
    denied,
    aboveCeiling,
    note: hasAgent
      ? 'Effective set is agent record ∩ Cloud MCP ceiling. Same rule as resolveAgentCapabilities / mcp.call. This read does not change enforcement.'
      : 'Declared Cloud MCP ceiling only (no agent context). Pass agentSlug or call from Cloud mcp.call to see the intersection. JWT twin: GET /api/capabilities/resolve.',
  };
}

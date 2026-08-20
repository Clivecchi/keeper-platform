/**
 * IDE / Build board MCP ceiling — read-only descriptor of what Cloud may
 * reach via in-process mcp.call after agent record ∩ board ceiling.
 *
 * Does not change requireCapability or MCP tool gates.
 */

import {
  IDE_BOARD_MCP_CEILING,
} from './infraCapabilities.js';
import { BOARD_CAPABILITY_CEILINGS } from './boardCapabilityCeilings.js';
import type { ResolvedCapabilities } from './resolveCapabilities.js';

export type IdeBoardCeilingStatus = {
  surface: 'ide_board_mcp_ceiling';
  boardId: string;
  /** Canonical ceiling strings for ide/build. */
  ceiling: string[];
  /** Agent record capabilities before ceiling filter. */
  agentCapabilities: string[] | null;
  /** Effective set (agent ∩ ceiling). Null when no agent context. */
  granted: string[] | null;
  /** On the ceiling but not on the agent record (or filtered off). */
  denied: string[] | null;
  /** Agent caps that are not on this board's ceiling. */
  aboveCeiling: string[] | null;
  note: string;
};

export type BuildIdeBoardCeilingStatusParams = {
  boardId?: string | null;
  agentCapabilities?: string[] | null;
  resolved?: ResolvedCapabilities | null;
};

function resolveBoardId(boardId?: string | null): string {
  if (boardId === 'build' || boardId === 'ide') return boardId;
  if (boardId && boardId in BOARD_CAPABILITY_CEILINGS) return boardId;
  return 'ide';
}

export function buildIdeBoardCeilingStatus(
  params: BuildIdeBoardCeilingStatusParams = {},
): IdeBoardCeilingStatus {
  const boardId = resolveBoardId(params.boardId ?? params.resolved?.boardId);
  const ceiling = [...(BOARD_CAPABILITY_CEILINGS[boardId] ?? IDE_BOARD_MCP_CEILING)];
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
    surface: 'ide_board_mcp_ceiling',
    boardId,
    ceiling: [...ceiling].sort(),
    agentCapabilities: agentCapabilities ? [...agentCapabilities].sort() : null,
    granted,
    denied,
    aboveCeiling,
    note: hasAgent
      ? 'Effective set is agent record ∩ board ceiling. Same rule as resolveAgentCapabilities / mcp.call. This read does not change enforcement.'
      : 'Declared IDE/Build ceiling only (no agent context). Pass agentSlug or call from Cloud mcp.call to see the intersection. JWT twin: GET /api/capabilities/resolve.',
  };
}

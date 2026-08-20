/**
 * Capability Ledger (Phase 2) — one read-only aggregation of existing authority.
 *
 * Composes Phase 1 slices. Does not enforce. Does not merge Key stores (Phase 3).
 */

import { BUILD_BOARD_ID } from '@keeper/shared';
import { resolveAgentCapabilities } from './resolveCapabilities.js';
import { buildCloudCeilingStatus, type CloudCeilingStatus } from './boardCeilingStatus.js';
import {
  resolveKipActionAllowlistStatusForSession,
} from '../services/kip/resolveKipActionAllowlistStatus.js';
import type { KipActionAllowlistStatus } from '../policy/kipActionAllowlist.js';

/** Same shape as MCP CapabilityManifest — kept local so this module does not import tools.ts. */
export type LedgerMcpSlice = {
  domainId: string | null;
  domainName?: string;
  domainSlug?: string;
  granted: string[];
  denied: string[];
  capabilities: string[];
  tools: string[];
  note: string;
};

export type KeyStoreLedgerSlice = {
  status: 'not_aggregated';
  jobs: ReadonlyArray<{
    job: 'llm_secrets' | 'mcp_identity' | 'chronicle_presence';
    stores: string[];
  }>;
  unused: string[];
  nango: string;
  note: string;
};

/** Phase 0 measurement — included so the ledger is honest about what it does not merge. */
export const KEY_STORE_LEDGER_SLICE: KeyStoreLedgerSlice = {
  status: 'not_aggregated',
  jobs: [
    { job: 'llm_secrets', stores: ['kip_user_keys', 'kip_platform_keys', 'env'] },
    { job: 'mcp_identity', stores: ['DomainAccessKey', 'McpOAuthGrant'] },
    { job: 'chronicle_presence', stores: ['Key EntityKind'] },
  ],
  unused: ['UserApiCredential'],
  nango: 'GitHub OAuth vault + proxy only. Credentials stay in Nango. Keeper stores Integration.nangoConnectionId.',
  note: 'Phase 3 Key-store consolidation is not authorized. This ledger does not merge stores or return secrets.',
};

export type CapabilityLedger = {
  surface: 'capability_ledger';
  phase: 2;
  mcp: LedgerMcpSlice;
  kipActions: KipActionAllowlistStatus;
  cloudCeiling: CloudCeilingStatus;
  keyStores: KeyStoreLedgerSlice;
  note: string;
};

export type ResolveCapabilityLedgerParams = {
  mcp: LedgerMcpSlice;
  domainId?: string | null;
  userId?: string | null;
  agentSlug?: string | null;
  agentId?: string | null;
  boardId?: string | null;
  agentCapabilities?: string[] | null;
};

export function buildJwtMcpSlice(domainId: string | null): LedgerMcpSlice {
  return {
    domainId,
    granted: [],
    denied: [],
    capabilities: [],
    tools: [],
    note: 'JWT session is not an MCP token. MCP scopes live on DomainAccessKey / OAuth grants. Call capability_ledger via MCP to see granted scopes.',
  };
}

export function buildCapabilityLedger(input: {
  mcp: LedgerMcpSlice;
  kipActions: KipActionAllowlistStatus;
  cloudCeiling: CloudCeilingStatus;
}): CapabilityLedger {
  return {
    surface: 'capability_ledger',
    phase: 2,
    mcp: input.mcp,
    kipActions: input.kipActions,
    cloudCeiling: input.cloudCeiling,
    keyStores: KEY_STORE_LEDGER_SLICE,
    note: 'Read-only aggregation of existing authority. Does not change MCP gates, Kip executor allowlist, or mcp.call. Key stores are listed, not merged.',
  };
}

export async function resolveCapabilityLedger(
  params: ResolveCapabilityLedgerParams,
): Promise<CapabilityLedger> {
  const kipActions = await resolveKipActionAllowlistStatusForSession({
    userId: params.userId ?? null,
    domainId: params.domainId ?? null,
  });

  const agentSlug = params.agentSlug?.trim() || undefined;
  const agentId = params.agentId?.trim() || undefined;
  const boardId = params.boardId?.trim() || BUILD_BOARD_ID;

  let resolved = null;
  if (agentSlug || agentId) {
    try {
      resolved = await resolveAgentCapabilities({
        agentId,
        agentSlug,
        boardId,
      });
    } catch (error) {
      console.warn('[capabilityLedger] agent capability resolve failed', {
        agentId,
        agentSlug,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  const cloudCeiling = buildCloudCeilingStatus({
    boardId,
    resolved,
    agentCapabilities:
      resolved || agentSlug || agentId
        ? null
        : params.agentCapabilities ?? null,
  });

  return buildCapabilityLedger({
    mcp: params.mcp,
    kipActions,
    cloudCeiling,
  });
}

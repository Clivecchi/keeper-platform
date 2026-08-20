import { describe, expect, it } from 'vitest';
import { BUILD_BOARD_ID, CLOUD_MCP_CEILING } from '@keeper/shared';
import { buildKipActionAllowlistStatus } from '../policy/kipActionAllowlist.js';
import { buildCloudCeilingStatus } from './boardCeilingStatus.js';
import {
  KEY_STORE_LEDGER_SLICE,
  buildCapabilityLedger,
  buildJwtMcpSlice,
} from './capabilityLedger.js';

describe('capabilityLedger', () => {
  it('aggregates the three Phase 1 slices without inventing enforcement', () => {
    const mcp = buildJwtMcpSlice(null);
    const kipActions = buildKipActionAllowlistStatus({ canDraft: null });
    const cloudCeiling = buildCloudCeilingStatus();
    const ledger = buildCapabilityLedger({ mcp, kipActions, cloudCeiling });

    expect(ledger.surface).toBe('capability_ledger');
    expect(ledger.phase).toBe(2);
    expect(ledger.mcp.note).toContain('JWT session is not an MCP token');
    expect(ledger.kipActions.surface).toBe('kip_action_allowlist');
    expect(ledger.kipActions.allowed).toContain('draft.create');
    expect(ledger.kipActions.allowed).not.toContain('mcp.call');
    expect(ledger.cloudCeiling.surface).toBe('cloud_mcp_ceiling');
    expect(ledger.cloudCeiling.boardId).toBe(BUILD_BOARD_ID);
    expect(ledger.cloudCeiling.ceiling).toEqual([...CLOUD_MCP_CEILING].sort());
    expect(ledger.keyStores).toEqual(KEY_STORE_LEDGER_SLICE);
    expect(ledger.keyStores.status).toBe('not_aggregated');
    expect(ledger.note).toContain('Does not change');
  });
});

import { describe, expect, it } from 'vitest';
import { BUILD_BOARD_ID, CLOUD_MCP_CEILING } from '@keeper/shared';
import { buildCloudCeilingStatus } from './boardCeilingStatus.js';

describe('boardCeilingStatus', () => {
  it('returns the declared Cloud ceiling with no agent intersection', () => {
    const status = buildCloudCeilingStatus();
    expect(status.surface).toBe('cloud_mcp_ceiling');
    expect(status.boardId).toBe(BUILD_BOARD_ID);
    expect(status.ceiling).toEqual([...CLOUD_MCP_CEILING].sort());
    expect(status.granted).toBeNull();
    expect(status.denied).toBeNull();
    expect(status.note).toContain('Declared Cloud MCP ceiling');
  });

  it('maps legacy ide board name to build', () => {
    const status = buildCloudCeilingStatus({ boardId: 'ide' });
    expect(status.boardId).toBe(BUILD_BOARD_ID);
    expect(status.ceiling).toEqual([...CLOUD_MCP_CEILING].sort());
  });

  it('intersects agent capabilities with the ceiling', () => {
    const status = buildCloudCeilingStatus({
      boardId: BUILD_BOARD_ID,
      agentCapabilities: ['infra.railway.read', 'not.a.real.cap', 'github.repo.read'],
    });
    expect(status.granted).toEqual(['github.repo.read', 'infra.railway.read']);
    expect(status.denied).toContain('infra.vercel.read');
    expect(status.aboveCeiling).toEqual(['not.a.real.cap']);
  });

  it('prefers resolved agent ∩ ceiling when both are provided', () => {
    const status = buildCloudCeilingStatus({
      agentCapabilities: ['infra.railway.read'],
      resolved: {
        agentId: 'a1',
        agentSlug: 'cloud',
        boardId: BUILD_BOARD_ID,
        agentCapabilities: ['infra.railway.read', 'infra.github.write'],
        boardCeiling: [...CLOUD_MCP_CEILING],
        capabilities: ['infra.railway.read'],
      },
    });
    expect(status.granted).toEqual(['infra.railway.read']);
    expect(status.agentCapabilities).toEqual(['infra.github.write', 'infra.railway.read']);
  });
});

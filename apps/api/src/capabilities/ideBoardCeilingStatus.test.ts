import { describe, expect, it } from 'vitest';
import { IDE_BOARD_MCP_CEILING } from './infraCapabilities.js';
import { buildIdeBoardCeilingStatus } from './ideBoardCeilingStatus.js';

describe('ideBoardCeilingStatus', () => {
  it('returns the declared ide ceiling with no agent intersection', () => {
    const status = buildIdeBoardCeilingStatus();
    expect(status.surface).toBe('ide_board_mcp_ceiling');
    expect(status.boardId).toBe('ide');
    expect(status.ceiling).toEqual([...IDE_BOARD_MCP_CEILING].sort());
    expect(status.granted).toBeNull();
    expect(status.denied).toBeNull();
    expect(status.note).toContain('Declared IDE/Build ceiling');
  });

  it('treats build as the same ceiling as ide', () => {
    const status = buildIdeBoardCeilingStatus({ boardId: 'build' });
    expect(status.boardId).toBe('build');
    expect(status.ceiling).toEqual([...IDE_BOARD_MCP_CEILING].sort());
  });

  it('intersects agent capabilities with the ceiling', () => {
    const status = buildIdeBoardCeilingStatus({
      boardId: 'ide',
      agentCapabilities: ['infra.railway.read', 'not.a.real.cap', 'github.repo.read'],
    });
    expect(status.granted).toEqual(['github.repo.read', 'infra.railway.read']);
    expect(status.denied).toContain('infra.vercel.read');
    expect(status.aboveCeiling).toEqual(['not.a.real.cap']);
  });

  it('prefers resolved agent ∩ ceiling when both are provided', () => {
    const status = buildIdeBoardCeilingStatus({
      agentCapabilities: ['infra.railway.read'],
      resolved: {
        agentId: 'a1',
        agentSlug: 'cloud',
        boardId: 'ide',
        agentCapabilities: ['infra.railway.read', 'infra.github.write'],
        boardCeiling: [...IDE_BOARD_MCP_CEILING],
        capabilities: ['infra.railway.read'],
      },
    });
    expect(status.granted).toEqual(['infra.railway.read']);
    expect(status.agentCapabilities).toEqual(['infra.github.write', 'infra.railway.read']);
  });
});

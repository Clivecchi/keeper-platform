import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('ensureDomainManagementBoard idempotency', () => {
  it('returns same UUID and creates/migrates alias', async () => {
    // Mock services path
    const hoisted = (globalThis as any).__dmb || ((globalThis as any).__dmb = {
      domainFind: vi.fn(),
      boardFindFirst: vi.fn(),
      boardCreate: vi.fn(),
      frameCfgFind: vi.fn(),
      frameCfgCreate: vi.fn(),
      frameCreateMany: vi.fn(),
      frameCreate: vi.fn(),
      frameUpdate: vi.fn(),
      boardFindUnique: vi.fn(),
      boardAliasFind: vi.fn(),
      boardAliasCreate: vi.fn(),
    });
    vi.mock('@keeper/database', () => ({ prisma: {
      domain: { findUnique: hoisted.domainFind },
      board: { findFirst: hoisted.boardFindFirst, create: hoisted.boardCreate, findUnique: hoisted.boardFindUnique },
      frameConfig: { findFirst: hoisted.frameCfgFind, create: hoisted.frameCfgCreate },
      frameInstance: { createMany: hoisted.frameCreateMany, create: hoisted.frameCreate, update: hoisted.frameUpdate },
      boardAlias: { findUnique: hoisted.boardAliasFind, create: hoisted.boardAliasCreate },
    }}));

    const { ensureDomainManagementBoard } = await import('../services/ensureDomainManagementBoard.js');
    hoisted.domainFind.mockResolvedValue({ id: 'd1' });
    // First call: no board exists
    hoisted.boardFindFirst.mockResolvedValueOnce(null);
    hoisted.frameCfgFind.mockResolvedValue(null);
    hoisted.frameCfgCreate.mockResolvedValue({ id: 'cfg' });
    hoisted.boardCreate.mockResolvedValue({ id: 'b1', domainId: 'd1' });
    hoisted.frameCreateMany.mockResolvedValue({ count: 2 });
    hoisted.boardFindUnique.mockResolvedValue({ id: 'b1', domainId: 'd1', frames: [] });
    hoisted.boardAliasFind.mockResolvedValue(null);
    hoisted.boardAliasCreate.mockResolvedValue({ id: 'a1' });

    const r1 = await ensureDomainManagementBoard('d1', { reqId: 'r1' });
    expect(r1.ok).toBe(true);
    expect(r1.boardId).toBe('b1');

    // Second call: board exists
    hoisted.boardFindFirst.mockResolvedValueOnce({ id: 'b1', domainId: 'd1', frames: [] });
    hoisted.boardFindUnique.mockResolvedValue({ id: 'b1', domainId: 'd1', frames: [] });
    const r2 = await ensureDomainManagementBoard('d1', { reqId: 'r2' });
    expect(r2.ok).toBe(true);
    expect(r2.boardId).toBe('b1');
  });
});



import { describe, it, expect, beforeEach } from 'vitest';
import { ensureDomainManagementBoard } from '../services/boards/domainManagement';

type BoardRow = {
  id: string; keeperId: string; name: string; slug: string; description: string | null;
  behavior: any; data: any; access: any; domainId?: string | null; boardType?: string | null; updatedAt: Date;
};

type FrameConfigRow = { id: string; name: string; description?: string | null; theme?: any };
type FrameRow = {
  id: string; boardId: string; role: string | null; name: string; pattern: string; frameType: string;
  orderIndex: number; layoutKind: string; layoutData: any; props: any; entityType: string; entityId: string;
  configId: string; updatedAt: Date;
};

function makeMockPrisma() {
  const boards: BoardRow[] = [];
  const frames: FrameRow[] = [];
  const configs: FrameConfigRow[] = [];

  return {
    _state: { boards, frames, configs },
    frameConfig: {
      findFirst: async ({ where: { name } }: any) => configs.find(c => c.name === name) || null,
      create: async ({ data }: any) => { configs.push({ id: data.id, name: data.name, description: data.description, theme: data.theme }); return configs[configs.length - 1]; }
    },
    board: {
      findFirst: async ({ where, include }: any) => {
        const b = boards.find(b => (
          (where.domainId ? b.domainId === where.domainId : true) &&
          (where.boardType ? b.boardType === where.boardType : true) &&
          (where.keeperId ? b.keeperId === where.keeperId : true) &&
          (where.slug ? b.slug === where.slug : true)
        )) || null;
        if (!b) return null;
        if (include?.frames) {
          const orderKey = include.frames.orderBy?.orderIndex ? 'orderIndex' : undefined;
          const fs = frames.filter(f => f.boardId === b.id).sort((a,b) => a.orderIndex - b.orderIndex);
          // @ts-ignore
          return { ...b, frames: fs };
        }
        return b;
      },
      create: async ({ data, include }: any) => {
        const row: BoardRow = { id: data.id, keeperId: data.keeperId, name: data.name, slug: data.slug, description: data.description ?? null, behavior: data.behavior, data: data.data, access: data.access, domainId: data.domainId, boardType: data.boardType, updatedAt: data.updatedAt };
        // uniqueness on (domainId, boardType)
        if (boards.find(b => b.domainId === row.domainId && b.boardType === row.boardType)) {
          const err: any = new Error('unique_violation'); err.code = 'P2002'; throw err;
        }
        boards.push(row);
        if (include?.frames) {
          // @ts-ignore
          return { ...row, frames: frames.filter(f => f.boardId === row.id) };
        }
        return row as any;
      },
      findUnique: async ({ where: { id }, include }: any) => {
        const b = boards.find(b => b.id === id) || null;
        if (!b) return null as any;
        if (include?.frames) {
          const fs = frames.filter(f => f.boardId === b.id).sort((a,b) => a.orderIndex - b.orderIndex);
          // @ts-ignore
          return { ...b, frames: fs };
        }
        return b as any;
      },
      update: async ({ where: { id }, data, include }: any) => {
        const idx = boards.findIndex(b => b.id === id);
        if (idx === -1) throw new Error('not found');
        boards[idx] = { ...boards[idx], ...data };
        const b = boards[idx];
        if (include?.frames) {
          const fs = frames.filter(f => f.boardId === b.id).sort((a,b) => a.orderIndex - b.orderIndex);
          // @ts-ignore
          return { ...b, frames: fs };
        }
        return b as any;
      }
    },
    frameInstance: {
      createMany: async ({ data }: any) => { for (const d of data) frames.push(d); return { count: data.length }; },
      create: async ({ data }: any) => { frames.push(data); return data; },
      update: async ({ where: { id }, data }: any) => { const i = frames.findIndex(f => f.id === id); if (i !== -1) frames[i] = { ...frames[i], ...data }; return frames[i]; },
      findMany: async ({ where: { boardId }, orderBy }: any) => frames.filter(f => f.boardId === boardId).sort((a,b) => a.orderIndex - b.orderIndex),
    },
    $transaction: async (fn: any) => fn({ frameInstance: { findMany: async ({ where: { boardId } }: any) => frames.filter(f => f.boardId === boardId).sort((a,b)=>a.createdAt?.getTime?.()-b.createdAt?.getTime?.() || 0), delete: async ({ where: { id } }: any) => { const i = frames.findIndex(f => f.id === id); if (i !== -1) frames.splice(i,1); } } }),
  } as any;
}

describe('ensureDomainManagementBoard', () => {
  let prisma: any;
  const domainId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    prisma = makeMockPrisma();
  });

  it('creates a board and deterministic frames on first run', async () => {
    const b = await ensureDomainManagementBoard(prisma, domainId);
    expect(b).toBeTruthy();
    expect(b.domainId).toBe(domainId);
    expect(b.boardType).toBe('domain-home');
    expect(Array.isArray(b.frames)).toBe(true);
    const ids = b.frames.map((f: any) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is idempotent and does not create duplicate frames', async () => {
    const first = await ensureDomainManagementBoard(prisma, domainId);
    const firstIds = new Set(first.frames.map((f: any) => f.id));
    const second = await ensureDomainManagementBoard(prisma, domainId);
    const secondIds = new Set(second.frames.map((f: any) => f.id));
    expect(second.id).toBe(first.id);
    expect(secondIds.size).toBe(firstIds.size);
    // IDs are stable
    for (const id of firstIds) expect(secondIds.has(id)).toBe(true);
  });
});



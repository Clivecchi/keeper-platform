import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createDraftPoint } from '@keeper/shared';
import { promoteDraftPointInTransaction } from './promoteDraftPoint.js';

const PATH_ONE = `PATH 1: ESTABLISH — Claiming Your Realm The first path names who you are. Moments: 1. The Declaration — A formal statement. 2. North Star — The guiding principle.`;

function buildMockTx(overrides: Record<string, unknown> = {}) {
  return {
    kip_drafts: {
      findFirst: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ dialog_id: null }),
      update: vi.fn(),
    },
    kip_draft_versions: {
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    journey: {
      findUnique: vi.fn(),
    },
    path: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    moment: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    dialog: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ...overrides,
  };
}

describe('promoteDraftPointInTransaction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns idempotent result when kept moments still exist', async () => {
    const point = {
      ...createDraftPoint({
        id: 'point-1',
        content: PATH_ONE,
        proposedBy: 'kip',
        status: 'accepted',
      }),
      promotion: {
        promotedAt: '2026-06-01T00:00:00.000Z',
        promotedJourneyId: 'journey-1',
        promotedPathId: 'path-existing',
        promotedMomentIds: ['point-1'],
      },
    };

    const tx = buildMockTx();
    tx.kip_drafts.findFirst.mockResolvedValue({
      id: 'draft-1',
      kind: 'journey_spec',
      keeper_id: null,
      spec_json: { points: [point] },
      title: 'Draft',
      summary: null,
      status: 'draft',
      dialog_id: null,
    });
    tx.moment.findMany.mockResolvedValue([
      {
        id: 'point-1',
        title: 'The Declaration',
        narrative: 'A formal statement.',
        pathId: 'path-existing',
        journeyId: 'journey-1',
      },
    ]);
    tx.path.findUnique.mockResolvedValue({
      id: 'path-existing',
      name: 'ESTABLISH',
      prelude: 'Claiming Your Realm',
      journeyId: 'journey-1',
      keeperId: 'keeper-1',
    });

    const result = await promoteDraftPointInTransaction(tx as never, {
      domainId: 'domain-1',
      userId: 'user-1',
      draftId: 'draft-1',
      pointId: 'point-1',
      journeyId: 'journey-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.idempotent).toBe(true);
    expect(result.pathId).toBe('path-existing');
    expect(tx.path.create).not.toHaveBeenCalled();
  });

  it('creates path and moments with Point.id as primary Moment.id', async () => {
    const point = createDraftPoint({
      id: 'point-1',
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'accepted',
    });

    const tx = buildMockTx();
    tx.kip_drafts.findFirst.mockResolvedValue({
      id: 'draft-1',
      kind: 'journey_spec',
      keeper_id: null,
      spec_json: { points: [point] },
      title: 'Draft',
      summary: null,
      status: 'draft',
      dialog_id: 'dialog-1',
    });
    tx.journey.findUnique.mockResolvedValue({
      id: 'journey-1',
      keeperId: 'keeper-1',
      domainId: 'domain-1',
    });
    tx.path.create.mockImplementation(async ({ data }: { data: { id: string } }) => ({
      id: data.id,
      name: 'ESTABLISH',
      prelude: 'Claiming Your Realm',
      journeyId: 'journey-1',
      keeperId: 'keeper-1',
    }));
    tx.moment.create.mockImplementation(async ({ data }: { data: { id: string; title: string; narrative: string; pathId: string | null; journeyId: string } }) => ({
      id: data.id,
      title: data.title,
      narrative: data.narrative,
      pathId: data.pathId,
      journeyId: data.journeyId,
    }));

    const result = await promoteDraftPointInTransaction(tx as never, {
      domainId: 'domain-1',
      userId: 'user-1',
      draftId: 'draft-1',
      pointId: 'point-1',
      journeyId: 'journey-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.idempotent).toBe(false);
    expect(result.evolved).toBe(false);
    expect(result.momentIds[0]).toBe('point-1');
    expect(tx.path.create).toHaveBeenCalledOnce();
    expect(tx.moment.create).toHaveBeenCalledTimes(2);
    expect(tx.moment.create.mock.calls[0][0].data.id).toBe('point-1');
    expect(tx.moment.create.mock.calls[0][0].data.sourcePointId).toBe('point-1');
    expect(tx.kip_drafts.update).toHaveBeenCalledOnce();
    expect(tx.dialog.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dialog-1', document_status: 'drafts' },
        data: { document_status: 'kept' },
      }),
    );
  });

  it('evolves an existing Moment in place when evolvesMomentId is set', async () => {
    const point = {
      ...createDraftPoint({
        id: 'point-2',
        content: 'Updated north star narrative',
        proposedBy: 'kip',
        status: 'accepted',
        type: 'moment',
      }),
      evolvesMomentId: 'point-1',
    };

    const tx = buildMockTx();
    tx.kip_drafts.findFirst.mockResolvedValue({
      id: 'draft-1',
      kind: 'journey_spec',
      keeper_id: null,
      spec_json: { points: [point] },
      title: 'Draft',
      summary: null,
      status: 'draft',
      dialog_id: null,
    });
    tx.journey.findUnique.mockResolvedValue({
      id: 'journey-1',
      keeperId: 'keeper-1',
      domainId: 'domain-1',
    });
    tx.moment.findFirst.mockResolvedValue({
      id: 'point-1',
      title: 'Old',
      narrative: 'Old narrative',
      pathId: 'path-1',
      journeyId: 'journey-1',
    });
    tx.moment.update.mockResolvedValue({
      id: 'point-1',
      title: 'Updated north star narrative',
      narrative: 'Updated north star narrative',
      pathId: 'path-1',
      journeyId: 'journey-1',
    });
    tx.path.findUnique.mockResolvedValue({
      id: 'path-1',
      name: 'ESTABLISH',
      prelude: 'Claiming',
      journeyId: 'journey-1',
      keeperId: 'keeper-1',
    });

    const result = await promoteDraftPointInTransaction(tx as never, {
      domainId: 'domain-1',
      userId: 'user-1',
      draftId: 'draft-1',
      pointId: 'point-2',
      journeyId: 'journey-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evolved).toBe(true);
    expect(result.momentIds).toEqual(['point-1']);
    expect(tx.moment.create).not.toHaveBeenCalled();
    expect(tx.moment.update).toHaveBeenCalledOnce();
  });

  it('rejects non journey_spec drafts', async () => {
    const point = createDraftPoint({
      id: 'point-1',
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'accepted',
    });

    const tx = buildMockTx();
    tx.kip_drafts.findFirst.mockResolvedValue({
      id: 'draft-1',
      kind: 'vehicle_template',
      keeper_id: null,
      spec_json: { points: [point] },
      title: 'Draft',
      summary: null,
      status: 'draft',
      dialog_id: null,
    });

    const result = await promoteDraftPointInTransaction(tx as never, {
      domainId: 'domain-1',
      userId: 'user-1',
      draftId: 'draft-1',
      pointId: 'point-1',
      journeyId: 'journey-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INVALID_DRAFT_KIND');
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createDraftPoint } from '@keeper/shared';
import { promoteDraftPointInTransaction } from './promoteDraftPoint.js';

const PATH_ONE = `PATH 1: ESTABLISH — Claiming Your Realm The first path names who you are. Moments: 1. The Declaration — A formal statement. 2. North Star — The guiding principle.`;

function buildMockTx(overrides: Record<string, unknown> = {}) {
  return {
    kip_drafts: {
      findFirst: vi.fn(),
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
      create: vi.fn(),
    },
    moment: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

describe('promoteDraftPointInTransaction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns idempotent result when promoted path still exists', async () => {
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
        promotedMomentIds: ['moment-1'],
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
    });
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

  it('creates path and moments for accepted journey_spec point', async () => {
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
    });
    tx.journey.findUnique.mockResolvedValue({
      id: 'journey-1',
      keeperId: 'keeper-1',
      domainId: 'domain-1',
    });
    tx.path.create.mockResolvedValue({
      id: 'path-new',
      name: 'ESTABLISH',
      prelude: 'Claiming Your Realm',
      journeyId: 'journey-1',
      keeperId: 'keeper-1',
    });
    tx.moment.create
      .mockResolvedValueOnce({
        id: 'moment-1',
        title: 'The Declaration',
        narrative: 'A formal statement.',
        pathId: 'path-new',
        journeyId: 'journey-1',
      })
      .mockResolvedValueOnce({
        id: 'moment-2',
        title: 'North Star',
        narrative: 'The guiding principle.',
        pathId: 'path-new',
        journeyId: 'journey-1',
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
    expect(result.idempotent).toBe(false);
    expect(result.momentIds).toEqual(['moment-1', 'moment-2']);
    expect(tx.path.create).toHaveBeenCalledOnce();
    expect(tx.moment.create).toHaveBeenCalledTimes(2);
    expect(tx.kip_drafts.update).toHaveBeenCalledOnce();
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

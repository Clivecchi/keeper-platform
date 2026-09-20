import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    domain: { findUnique: vi.fn() },
    domainPermission: { findFirst: vi.fn() },
    keeper: { findFirst: vi.fn(), findUnique: vi.fn() },
    journey: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock('@keeper/database', () => ({
  prisma,
}));

vi.mock('../middleware/authMiddleware.js', () => ({
  authMiddlewareCompat: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.header('x-test-user-id');
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    (req as express.Request & { user?: { id: string } }).user = { id: userId };
    next();
  },
}));

import journeysRoutes from './journeys.js';

function app() {
  const server = express();
  server.use(express.json());
  server.use('/api/journeys', journeysRoutes);
  return server;
}

describe('mounted GET /api/journeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.journey.findMany.mockResolvedValue([]);
    prisma.journey.count.mockResolvedValue(0);
    prisma.keeper.findFirst.mockResolvedValue(null);
    prisma.domainPermission.findFirst.mockResolvedValue(null);
  });

  it('rejects an authenticated unscoped list', async () => {
    const res = await request(app()).get('/api/journeys').set('x-test-user-id', 'user-1');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('domainId or keeperId is required');
    expect(prisma.journey.findMany).not.toHaveBeenCalled();
  });

  it('returns domain-scoped journeys for an authorized caller', async () => {
    prisma.domain.findUnique.mockResolvedValue({
      id: 'domain-a',
      ownerId: 'user-1',
      isPublic: false,
    });
    prisma.journey.findMany.mockResolvedValue([
      {
        id: 'j1',
        name: 'One',
        forward: 'Go',
        ownerId: 'user-1',
        domainId: 'domain-a',
        keeperId: 'k1',
        createdAt: new Date(),
        updatedAt: new Date(),
        Keeper: { id: 'k1', title: 'K', keeperType: null },
        Path: [],
        Moment: [],
        themes: null,
      },
    ]);
    prisma.journey.count.mockResolvedValue(1);

    const res = await request(app())
      .get('/api/journeys')
      .query({ domainId: 'domain-a' })
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.data.journeys).toHaveLength(1);
    expect(res.body.data.journeys[0].domainId).toBe('domain-a');
    expect(prisma.journey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { domainId: 'domain-a' } }),
    );
  });

  it('rejects a domain UUID the caller cannot access', async () => {
    prisma.domain.findUnique.mockResolvedValue({
      id: 'domain-b',
      ownerId: 'other',
      isPublic: false,
    });

    const res = await request(app())
      .get('/api/journeys')
      .query({ domainId: 'domain-b' })
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
    expect(prisma.journey.findMany).not.toHaveBeenCalled();
  });

  it('keeps keeper-scoped listing after authorizing the Keeper domain', async () => {
    prisma.keeper.findUnique.mockResolvedValue({ id: 'k1', domainId: 'domain-a' });
    prisma.domain.findUnique.mockResolvedValue({
      id: 'domain-a',
      ownerId: 'user-1',
      isPublic: false,
    });

    const res = await request(app())
      .get('/api/journeys')
      .query({ keeperId: 'k1' })
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(prisma.journey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keeperId: 'k1' } }),
    );
  });

  it('cannot use a foreign keeperId to bypass Domain authorization', async () => {
    prisma.keeper.findUnique.mockResolvedValue({ id: 'k-foreign', domainId: 'domain-b' });
    prisma.domain.findUnique.mockResolvedValue({
      id: 'domain-b',
      ownerId: 'other',
      isPublic: false,
    });

    const res = await request(app())
      .get('/api/journeys')
      .query({ keeperId: 'k-foreign' })
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(403);
    expect(prisma.journey.findMany).not.toHaveBeenCalled();
  });

  it('intersects domainId and keeperId', async () => {
    prisma.domain.findUnique.mockResolvedValue({
      id: 'domain-a',
      ownerId: 'user-1',
      isPublic: false,
    });
    prisma.keeper.findUnique.mockResolvedValue({ id: 'k1', domainId: 'domain-a' });

    const res = await request(app())
      .get('/api/journeys')
      .query({ domainId: 'domain-a', keeperId: 'k1' })
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(prisma.journey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { domainId: 'domain-a', keeperId: 'k1' } }),
    );
  });
});

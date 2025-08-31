import { Router, type Request, type Response } from 'express';
import { isDbDisabled } from '../../lib/env.js';

export const topicsRouter = Router({ mergeParams: true });

/**
 * Agent-scoped Topics API (Phase 3)
 * - Proxies to existing board/topic endpoints later; for now, returns mocks when DB is disabled
 */

// LIST
topicsRouter.get('/:id/topics', async (req: Request, res: Response) => {
  const agentId = req.params.id;
  if (isDbDisabled()) {
    return res.json([
      { id: 't1', agentId, title: 'Example Topic', essence: 'demo', tags: [] }
    ]);
  }
  // TODO: Proxy to /api/board-data/:boardId/topics when boardId mapping is available
  return res.json([]);
});

// CREATE
topicsRouter.post('/:id/topics', async (req: Request, res: Response) => {
  const agentId = req.params.id;
  const { title, essence, tags = [] } = (req.body ?? {}) as { title?: string; essence?: string; tags?: string[] };
  if (isDbDisabled()) {
    return res.status(201).json({ id: 't_new', agentId, title, essence, tags });
  }
  // TODO: Proxy to /api/board-data/:boardId/topics
  return res.status(201).json({ id: 't_new', agentId, title, essence, tags });
});

// UPDATE
topicsRouter.put('/:id/topics/:topicId', async (req: Request, res: Response) => {
  const { id: agentId, topicId } = req.params as { id: string; topicId: string };
  const patch = (req.body ?? {}) as Record<string, unknown>;
  if (isDbDisabled()) {
    return res.json({ id: topicId, agentId, ...patch });
  }
  // TODO: Proxy to /api/topics/:topicId
  return res.json({ id: topicId, agentId, ...patch });
});

// ARCHIVE
topicsRouter.delete('/:id/topics/:topicId', async (req: Request, res: Response) => {
  if (isDbDisabled()) return res.status(204).end();
  // TODO: Proxy to /api/topics/:topicId (soft delete/archive)
  return res.status(204).end();
});

// MERGE (basic)
topicsRouter.post('/:id/topics/:topicId/merge', async (req: Request, res: Response) => {
  const { topicId } = req.params as { topicId: string };
  const { intoId } = (req.body ?? {}) as { intoId?: string };
  if (isDbDisabled()) return res.json({ merged: topicId, into: intoId });
  // TODO: Implement merge behavior with persistence
  return res.json({ merged: topicId, into: intoId });
});



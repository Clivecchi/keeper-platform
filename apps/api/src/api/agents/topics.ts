import { Router, type Request, type Response } from 'express';
import { isDbDisabled } from '../../lib/env.js';
import { emitActivity } from './_activity-util.js';
import { broadcastAgentEvent } from './events.js';

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
  // Proxy once boardId mapping is resolved via agentId column
  const prisma = new PrismaClient();
  const { agentId } = req.query as any;
  if (agentId) {
    try {
      const board = await prisma.board.findFirst({ where: { agentId: String(agentId) } });
      if (board) {
        // For now return empty array to avoid breaking clients; full proxy would call board-data endpoint
        return res.json([]);
      }
    } catch {}
  }
  return res.json([]);
});

// CREATE
topicsRouter.post('/:id/topics', async (req: Request, res: Response) => {
  const agentId = req.params.id;
  const { title, essence, tags = [] } = (req.body ?? {}) as { title?: string; essence?: string; tags?: string[] };
  if (isDbDisabled()) {
    const createdId = 't_new';
    emitActivity({ agentId, kind: 'topic', action: 'create', message: `Topic "${title}" created`, linkedIds: { topicId: createdId } });
    broadcastAgentEvent({ type: 'topic.created', agentId, topicId: createdId, data: { title }, at: new Date().toISOString() });
    return res.status(201).json({ id: createdId, agentId, title, essence, tags });
  }
  // TODO: Proxy to /api/board-data/:boardId/topics
  return res.status(201).json({ id: 't_new', agentId, title, essence, tags });
});

// UPDATE
topicsRouter.put('/:id/topics/:topicId', async (req: Request, res: Response) => {
  const { id: agentId, topicId } = req.params as { id: string; topicId: string };
  const patch = (req.body ?? {}) as Record<string, unknown>;
  if (isDbDisabled()) {
    emitActivity({ agentId, kind: 'topic', action: 'update', message: `Topic "${(patch as any)?.title ?? topicId}" updated`, linkedIds: { topicId } });
    broadcastAgentEvent({ type: 'topic.updated', agentId, topicId, data: patch, at: new Date().toISOString() });
    return res.json({ id: topicId, agentId, ...patch });
  }
  // TODO: Proxy to /api/topics/:topicId
  return res.json({ id: topicId, agentId, ...patch });
});

// ARCHIVE
topicsRouter.delete('/:id/topics/:topicId', async (req: Request, res: Response) => {
  if (isDbDisabled()) {
    emitActivity({ agentId: req.params.id, kind: 'topic', action: 'delete', message: `Topic "${req.params.topicId}" archived`, linkedIds: { topicId: req.params.topicId } });
    broadcastAgentEvent({ type: 'topic.merged', agentId: req.params.id, topicId: req.params.topicId, at: new Date().toISOString() });
    return res.status(204).end();
  }
  // TODO: Proxy to /api/topics/:topicId (soft delete/archive)
  return res.status(204).end();
});

// MERGE (basic)
topicsRouter.post('/:id/topics/:topicId/merge', async (req: Request, res: Response) => {
  const { topicId } = req.params as { topicId: string };
  const { intoId } = (req.body ?? {}) as { intoId?: string };
  if (isDbDisabled()) {
    emitActivity({ agentId: req.params.id, kind: 'topic', action: 'update', message: `Topic "${topicId}" merged into "${intoId}"`, linkedIds: { topicId } });
    broadcastAgentEvent({ type: 'topic.merged', agentId: req.params.id, topicId, data: { intoId }, at: new Date().toISOString() });
    return res.json({ merged: topicId, into: intoId });
  }
  // TODO: Implement merge behavior with persistence
  return res.json({ merged: topicId, into: intoId });
});



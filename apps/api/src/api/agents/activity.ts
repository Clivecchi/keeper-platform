import { Router, type Request, type Response } from 'express';
import { isDbDisabled } from '../../lib/env.js';
import { readActivity } from './_activity-util.js';
import { broadcastAgentEvent } from './events.js';

export const activityRouter = Router({ mergeParams: true });

// GET /api/agents/:id/activity?topicId=&type=&q=&cursor=
activityRouter.get('/:id/activity', async (req: Request, res: Response) => {
  const agentId = req.params.id;
  const topicId = (req.query.topicId as string) || undefined;
  const type = (req.query.type as 'topic' | 'draft' | 'task') || undefined;
  const q = (req.query.q as string) || undefined;
  const cursor = (req.query.cursor as string) || null;

  if (isDbDisabled()) {
    const page = readActivity({ agentId, topicId, type, q, cursor, limit: 25 });
    // Synthesize a lightweight event for polling fallback consumers
    if (page.items.length) {
      const latest = page.items[0];
      broadcastAgentEvent({ type: 'activity.appended', agentId, activityId: latest.id, data: latest, at: latest.createdAt });
    }
    return res.json(page);
  }
  return res.json({ items: [], nextCursor: null });
});




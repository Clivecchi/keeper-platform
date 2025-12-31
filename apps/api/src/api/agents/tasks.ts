import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { isDbDisabled } from '../../lib/env.js';
import { emitActivity } from './_activity-util.js';
import { broadcastAgentEvent } from './events.js';

export const tasksRouter = Router({ mergeParams: true });

type Task = {
  id: string;
  agentId: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dueAt?: string;
  linkedDraftId?: string;
  linkedTopicId?: string;
  createdAt: string;
  updatedAt: string;
};

function mockTask(agentId: string, patch: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'task1',
    agentId,
    title: 'Example Task',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    ...patch
  };
}

// LIST (?topicId= supported)
tasksRouter.get('/:id/tasks', async (req: Request, res: Response) => {
  const agentId = req.params.id;
  const topicId = req.query.topicId as string | undefined;
  if (isDbDisabled()) {
    return res.json([mockTask(agentId, topicId ? { linkedTopicId: topicId } : {})]);
  }
  return res.json([]);
});

// CREATE
tasksRouter.post('/:id/tasks', async (req: Request, res: Response) => {
  const agentId = req.params.id;
  const { title, dueAt, linkedDraftId, linkedTopicId } = (req.body ?? {}) as Partial<Task> & { title?: string };
  if (isDbDisabled()) {
    emitActivity({ agentId, kind: 'task', action: 'create', message: `Task "${title || 'task_new'}" created`, linkedIds: { taskId: 'task_new', topicId: linkedTopicId } });
    broadcastAgentEvent({ type: 'task.created', agentId, taskId: 'task_new', data: { title, linkedTopicId }, at: new Date().toISOString() });
    return res.status(201).json(
      mockTask(agentId, { id: 'task_new', title: title || 'Untitled', dueAt, linkedDraftId, linkedTopicId })
    );
  }
  return res.status(201).json(mockTask(agentId, { id: 'task_new', title: title || 'Untitled', dueAt, linkedDraftId, linkedTopicId }));
});

// UPDATE
tasksRouter.put('/:id/tasks/:taskId', async (req: Request, res: Response) => {
  const { id: agentId, taskId } = req.params;
  const patch = (req.body ?? {}) as Partial<Task>;
  if (isDbDisabled()) {
    emitActivity({ agentId, kind: 'task', action: 'update', message: `Task "${taskId}" updated`, linkedIds: { taskId, topicId: (patch as any)?.linkedTopicId } });
    broadcastAgentEvent({ type: 'task.updated', agentId, taskId, data: patch, at: new Date().toISOString() });
    return res.json(mockTask(agentId, { id: taskId, ...patch, updatedAt: new Date().toISOString() }));
  }
  return res.json(mockTask(agentId, { id: taskId, ...patch }));
});

// STATUS transition
tasksRouter.patch('/:id/tasks/:taskId/status', async (req: Request, res: Response) => {
  const { id: agentId, taskId } = req.params;
  const { status } = (req.body ?? {}) as { status?: Task['status'] };
  if (isDbDisabled()) {
    emitActivity({ agentId, kind: 'task', action: 'status', message: `Task "${taskId}" → ${status}`, linkedIds: { taskId } });
    broadcastAgentEvent({ type: 'task.status', agentId, taskId, data: { status }, at: new Date().toISOString() });
    return res.json(mockTask(agentId, { id: taskId, status: status || 'pending', updatedAt: new Date().toISOString() }));
  }
  return res.json(mockTask(agentId, { id: taskId, status: status || 'pending' }));
});

// DELETE
tasksRouter.delete('/:id/tasks/:taskId', async (_req: Request, res: Response) => res.status(204).end());



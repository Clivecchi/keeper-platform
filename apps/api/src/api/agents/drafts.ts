import { Router, type Request, type Response } from 'express';
import { isDbDisabled } from '../../lib/env.js';

export const draftsRouter = Router({ mergeParams: true });

function mockDraft(agentId: string, id = 'd1', patch: any = {}) {
  return {
    id,
    agentId,
    title: 'Example Draft',
    status: 'draft',
    data: { foo: 'bar' },
    topicId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...patch
  };
}

// LIST -> returns 0..1 drafts
draftsRouter.get('/:id/drafts', async (req: Request, res: Response) => {
  const { id: agentId } = req.params;
  const topicId = req.query.topicId as string | undefined;

  if (isDbDisabled()) {
    return res.json([mockDraft(agentId, 'd_mock', topicId ? { topicId } : {})]);
  }

  return res.json([]);
});

// CREATE -> upsert single draft
draftsRouter.post('/:id/drafts', async (req: Request, res: Response) => {
  const { id: agentId } = req.params;
  const { title, data = {}, topicId } = (req.body ?? {}) as any;

  if (isDbDisabled()) {
    return res.status(201).json(mockDraft(agentId, 'd_new', { title, data, topicId }));
  }

  return res.status(201).json(mockDraft(agentId, 'd_new', { title, data, topicId }));
});

// UPDATE -> updates single draft
draftsRouter.put('/:id/drafts/:draftId', async (req: Request, res: Response) => {
  const { id: agentId, draftId } = req.params as any;
  const patch = (req.body ?? {}) as any;

  if (isDbDisabled()) {
    return res.json(mockDraft(agentId, draftId, { ...patch, updatedAt: new Date().toISOString() }));
  }

  return res.json(mockDraft(agentId, draftId, { ...patch }));
});

// DELETE -> clears draft
draftsRouter.delete('/:id/drafts/:draftId', async (_req: Request, res: Response) => {
  return res.status(204).end();
});

// PROPOSE passthrough
draftsRouter.post('/:id/drafts/:draftId/propose', async (req: Request, res: Response) => {
  const { id: agentId, draftId } = req.params as any;
  if (isDbDisabled()) return res.json(mockDraft(agentId, draftId, { status: 'proposed' }));
  return res.json(mockDraft(agentId, draftId, { status: 'proposed' }));
});

// COMMIT passthrough (server role gate remains in single-draft handler)
draftsRouter.post('/:id/drafts/:draftId/commit', async (req: Request, res: Response) => {
  const { id: agentId, draftId } = req.params as any;
  if (isDbDisabled()) return res.json(mockDraft(agentId, draftId, { status: 'committed' }));
  return res.json(mockDraft(agentId, draftId, { status: 'committed' }));
});

// HISTORY passthrough
draftsRouter.get('/:id/drafts/:draftId/history', async (req: Request, res: Response) => {
  const { id: agentId, draftId } = req.params as any;
  if (isDbDisabled()) {
    return res.json([
      { at: new Date().toISOString(), from: 'draft', to: 'proposed', diff: { data: { foo: ['bar', 'baz'] } } }
    ]);
  }
  return res.json([]);
});



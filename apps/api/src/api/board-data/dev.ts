import { Router, Request, Response } from 'express';
import { PrismaClient } from '@keeper/database';

export const boardDataDevRouter = Router();
const prisma = new PrismaClient();

// PATCH /api/board-data/dev/frames/:id/max-messages
boardDataDevRouter.patch('/dev/frames/:id/max-messages', async (req: Request, res: Response) => {
  try {
    // Enforce KAM-only dev write scope
    const auth = (req as any).auth as { kind?: string; scopes?: string[] } | undefined;
    if (!auth || auth.kind !== 'kam') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    const scopes = Array.isArray(auth.scopes) ? auth.scopes : [];
    if (!scopes.includes('boards.rw.dev')) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const { id } = req.params as { id: string };
    const value = Number((req.body as any)?.value);
    if (!Number.isFinite(value) || value < 1 || value > 500) {
      res.status(400).json({ error: 'bad_request', details: 'value must be number in [1,500]' });
      return;
    }

    const frame = await prisma.frameInstance.findUnique({ where: { id } });
    if (!frame) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const kind = (frame.role as string | null) === 'dialog' ? 'dialog' : frame.frameType;
    if (kind !== 'dialog') {
      res.status(400).json({ error: 'bad_request', details: 'frame is not dialog' });
      return;
    }

    const props = (frame.props as Record<string, unknown>) || {};
    const nextProps = { ...props, maxMessages: value } as Record<string, unknown>;

    await prisma.frameInstance.update({ where: { id }, data: { props: nextProps, updatedAt: new Date() } });

    res.json({ id, kind: 'dialog', props: { maxMessages: value } });
  } catch (err) {
    res.status(500).json({ error: 'internal' });
  }
});



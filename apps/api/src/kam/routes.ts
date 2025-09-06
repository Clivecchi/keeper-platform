import { Router, Request, Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { kamAuth, kamScope, kamRateLimit, kamAudit } from './middleware.js';

const prisma = new PrismaClient();
export const kamRouter = Router();

// Shared helpers
function bad(res: Response, details?: unknown) {
  res.status(400).json({ error: 'bad_request', details });
}
function notFound(res: Response) {
  res.status(404).json({ error: 'not_found' });
}
function serverError(res: Response, req: Request, err?: unknown) {
  res.status(500).json({ error: 'internal', requestId: (req as any).reqId || '' });
}

// All KAM routes require auth, scopes, rate limit, and emit audit
kamRouter.use(kamAuth);
kamRouter.use(kamRateLimit);
kamRouter.use(kamAudit);

// 1) GET /kam/agents/:agentId/home (RO) - Domain discovery, no X-Domain-Id required
kamRouter.get('/agents/:agentId/home', kamScope(['boards.ro']), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params as { agentId: string };

    const agent = await prisma.kip_agents.findUnique({
      where: { id: agentId },
      select: { id: true }
    });
    if (!agent) return notFound(res);

    // Resolve the agent's domainId directly from agent record
    const agentDomainId = (agent as any).domainId || null;

    const board = await prisma.board.findFirst({
      where: { agentId: agentId },
      select: { id: true },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({
      agentId,
      domainId: agentDomainId,
      boardId: board?.id || null
    });
  } catch (err) {
    return serverError(res, req, err);
  }
});

// 2) GET /kam/boards/:boardId (RO)
kamRouter.get('/boards/:boardId', kamScope(['boards.ro']), async (req: Request, res: Response) => {
  try {
    const headerDomainId = req.get('X-Domain-Id') || req.get('x-domain-id') || '';
    const { boardId } = req.params as { boardId: string };

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return notFound(res);
    // Tenancy guard: board must map to an agent with this domain id, unless agent has null domain
    if ((board as any).agentId) {
      const agent = await prisma.kip_agents.findUnique({ where: { id: (board as any).agentId } });
      const agentDomainId = (agent as any)?.domainId ?? null;
      if (agentDomainId !== null) {
        if (!headerDomainId) return bad(res);
        if (String(agentDomainId) !== String(headerDomainId)) return notFound(res);
      }
    }
    // Domain filter: current schema lacks domainId on Board; expose domainId from request for tenancy tagging
    return res.json({
      id: board.id,
      agentId: (board as any).agentId || null,
      domainId: headerDomainId,
      slug: (board as any).slug,
      template: false,
      createdAt: (board as any).createdAt,
      updatedAt: (board as any).updatedAt
    });
  } catch (err) {
    return serverError(res, req, err);
  }
});

// 3) GET /kam/boards/:boardId/frames (RO)
kamRouter.get('/boards/:boardId/frames', kamScope(['frames.ro']), async (req: Request, res: Response) => {
  try {
    const headerDomainId = req.get('X-Domain-Id') || req.get('x-domain-id') || '';
    const { boardId } = req.params as { boardId: string };

    // Tenancy guard: verify board ↔ agent matches domain
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return notFound(res);
    if ((board as any).agentId) {
      const agent = await prisma.kip_agents.findUnique({ where: { id: (board as any).agentId } });
      const agentDomainId = (agent as any)?.domainId ?? null;
      if (agentDomainId !== null) {
        if (!headerDomainId) return bad(res);
        if (String(agentDomainId) !== String(headerDomainId)) return notFound(res);
      }
    }

    const frames = await prisma.frameInstance.findMany({
      where: { boardId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, role: true, frameType: true, orderIndex: true, name: true }
    });
    return res.json({
      boardId,
      items: frames.map((f) => ({
        id: f.id,
        kind: normalizeKind(f.role as string | null, f.frameType as string),
        order: f.orderIndex,
        title: f.name || null
      }))
    });
  } catch (err) {
    return serverError(res, req, err);
  }
});

// 4) GET /kam/frames/:frameInstanceId/config (RO)
kamRouter.get('/frames/:frameInstanceId/config', kamScope(['frames.ro']), async (req: Request, res: Response) => {
  try {
    const headerDomainId = req.get('X-Domain-Id') || req.get('x-domain-id') || '';
    const { frameInstanceId } = req.params as { frameInstanceId: string };

    const f = await prisma.frameInstance.findUnique({
      where: { id: frameInstanceId },
      include: { FrameConfig: true }
    });
    if (!f) return notFound(res);
    if (f.boardId) {
      const board = await prisma.board.findUnique({ where: { id: f.boardId } });
      if ((board as any)?.agentId) {
        const agent = await prisma.kip_agents.findUnique({ where: { id: (board as any).agentId } });
        const agentDomainId = (agent as any)?.domainId ?? null;
        if (agentDomainId !== null) {
          if (!headerDomainId) return bad(res);
          if (String(agentDomainId) !== String(headerDomainId)) return notFound(res);
        }
      }
    }

    return res.json({
      id: f.id,
      kind: normalizeKind(f.role as string | null, f.frameType as string),
      props: (f.props as Record<string, unknown>) || {},
      configSchema: (f.FrameConfig?.theme as Record<string, unknown>) || null
    });
  } catch (err) {
    return serverError(res, req, err);
  }
});

// 5) GET /kam/boards?agentId= (RO)
kamRouter.get('/boards', kamScope(['boards.ro']), async (req: Request, res: Response) => {
  try {
    const headerDomainId = req.get('X-Domain-Id') || req.get('x-domain-id') || '';
    const agentId = (req.query?.agentId as string) || '';

    if (!agentId) return res.json({ items: [] });

    // Enforce tenancy by checking agent domainId
    const agent = await prisma.kip_agents.findUnique({ where: { id: agentId } });
    if (!agent) return notFound(res);
    const agentDomainId = (agent as any)?.domainId ?? null;
    if (agentDomainId !== null) {
      if (!headerDomainId) return bad(res);
      if (String(agentDomainId) !== String(headerDomainId)) {
        return res.json({ items: [] });
      }
    }

    const boards = await prisma.board.findMany({ where: { agentId }, orderBy: { createdAt: 'desc' } });

    return res.json({
      items: boards.map((b: any) => ({
        id: b.id,
        agentId: b.agentId || null,
        slug: b.slug,
        template: false,
        createdAt: b.createdAt
      }))
    });
  } catch (err) {
    return serverError(res, req, err);
  }
});

function normalizeKind(role: string | null, frameType: string): string {
  if (role === 'dialog') return 'dialog';
  if (role === 'agent_preview') return 'preview';
  if (role === 'topics') return 'topics';
  if (role === 'draft') return 'drafts';
  if (role === 'config_panel') return 'config';
  return frameType || 'unknown';
}

export default kamRouter;



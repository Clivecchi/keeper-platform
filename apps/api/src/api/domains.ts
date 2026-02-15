import { Router } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { writeDomainAudit } from '../lib/audit/domainAudit.js';
import { ensureDomainAgentPolicy } from '../governance/index.js';
import { domainsManagementRouter } from './domains.management.js';
import { ensureDomainTableShape } from '../lib/db-guards.js';

// Minimal flat list for Admin screens and health checks
const domainsRouter = Router();
domainsRouter.use(authMiddlewareCompat);

// H3: avoid shadowing nested management-board route by mounting under /admin
domainsRouter.use('/admin', domainsManagementRouter);

// GET /api/domains – flat array, minimal fields
domainsRouter.get('/', async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted || '0').toLowerCase() === '1';
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const q = (req.query.q ? String(req.query.q) : '').trim();

    const where: any = {};
    if (!includeDeleted) (where as any).deletedAt = null;
    if (q) {
      (where as any).OR = [
        { id: q },
        { name: { contains: q, mode: 'insensitive' } },
        { customDomain: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      const rows = await prisma.domain.findMany({
        where,
        select: { id: true, name: true, customDomain: true, createdAt: true, updatedAt: true, deletedAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return res.json(rows);
    } catch (e: any) {
      // Fallback if deletedAt column not present yet
      const message = String(e?.message || '');
      if (message.includes('column') && message.includes('deletedAt')) {
        const rows = await prisma.domain.findMany({
          where: q
            ? {
                OR: [
                  { id: q },
                  { name: { contains: q, mode: 'insensitive' } },
                  { customDomain: { contains: q, mode: 'insensitive' } },
                ],
              }
            : {},
          select: { id: true, name: true, customDomain: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        return res.json(rows);
      }
      throw e;
    }
  } catch (err) {
    console.error('[flat-domains] error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/my – robust resolution with guard and membership fallbacks
domainsRouter.get('/my', async (req, res) => {
  try {
    await ensureDomainTableShape();

    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    const ctxDomainId = (req as any).context?.domainId as string | undefined;

    async function pickActive(where: Record<string, unknown>): Promise<any | null> {
      try {
        return await prisma.domain.findFirst({ where: { ...where, deletedAt: null } as any });
      } catch (e: any) {
        const message = String(e?.message || '');
        if (message.includes('column') && message.includes('deletedAt')) {
          return await prisma.domain.findFirst({ where: where as any });
        }
        throw e;
      }
    }

    let domain: any | null = null;

    // 1) Prefer context domain if middleware set it (and not soft-deleted)
    if (ctxDomainId) {
      domain = await prisma.domain.findUnique({ where: { id: ctxDomainId } });
      if (domain && (domain as any).deletedAt) {
        domain = null;
      }
    }

    // 2) User primaryDomainId
    if (!domain) {
      const user = await prisma.users.findUnique({ where: { id: userId }, select: { primaryDomainId: true } });
      if (user?.primaryDomainId) {
        domain = await pickActive({ id: user.primaryDomainId });
      }
    }

    // 3) Membership via DomainPermission
    if (!domain) {
      const membership = await prisma.domainPermission.findFirst({
        where: { userId },
        include: { Domain: true },
        orderBy: { grantedAt: 'asc' }
      });
      const d = membership?.Domain as any | undefined;
      if (d && (!('deletedAt' in d) || (d as any).deletedAt == null)) {
        domain = d;
      }
    }

    // 4) Ownership fallback
    if (!domain) {
      domain = await pickActive({ ownerId: userId });
    }

    // 5) Absolute fallback: any active domain
    if (!domain) {
      domain = await pickActive({});
    }

    if (!domain) return res.status(404).json({ error: 'DOMAIN_NOT_FOUND' });

    return res.json({
      id: domain.id,
      name: domain.name,
      customDomain: (domain as any).customDomain ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'DOMAINS_MY_EXCEPTION', message: String(err?.message || err) });
  }
});

// POST /api/domains – create and audit
domainsRouter.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent']?.toString();
    const { name, customDomain } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    const baseSlug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const slug = baseSlug || `domain-${Date.now()}`;
    const created = await prisma.domain.create({ data: { name, slug, ownerId: user.id, customDomain } });

    await ensureDomainAgentPolicy(created.id).catch((err) =>
      console.warn('[domains] Failed to ensure domain agent policy:', err)
    );

    await writeDomainAudit({
      action: 'create',
      domainId: created.id,
      actorUserId: user?.id,
      actorEmail: user?.email,
      ip, userAgent: ua,
      before: null,
      after: created,
    });
    res.json(created);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/domains/:id – update and audit
domainsRouter.put('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent']?.toString();
    const id = req.params.id;
    const before = await prisma.domain.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Domain not found' });
    const updated = await prisma.domain.update({ where: { id }, data: req.body ?? {} });
    await writeDomainAudit({
      action: 'update',
      domainId: id,
      actorUserId: user?.id,
      actorEmail: user?.email,
      ip, userAgent: ua,
      before,
      after: updated
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/domains/:id – soft delete and audit
domainsRouter.delete('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent']?.toString();
    const id = req.params.id;
    const before = await prisma.domain.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Domain not found' });
    const updated = await prisma.domain.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeDomainAudit({
      action: 'delete',
      domainId: id,
      actorUserId: user?.id,
      actorEmail: user?.email,
      ip, userAgent: ua,
      before,
      after: updated
    });
    res.json({ ok: true, id, deletedAt: updated.deletedAt });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains/:id/restore – restore and audit
domainsRouter.post('/:id/restore', async (req, res) => {
  try {
    const user = (req as any).user;
    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent']?.toString();
    const id = req.params.id;
    const before = await prisma.domain.findUnique({ where: { id } });
    if (!before) return res.status(404).json({ error: 'Domain not found' });
    const updated = await prisma.domain.update({ where: { id }, data: { deletedAt: null } });
    await writeDomainAudit({
      action: 'restore',
      domainId: id,
      actorUserId: user?.id,
      actorEmail: user?.email,
      ip, userAgent: ua,
      before,
      after: updated
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default domainsRouter;



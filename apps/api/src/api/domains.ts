import { Router } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { writeDomainAudit } from '../lib/audit/domainAudit.js';

// Minimal flat list for Admin screens and health checks
const domainsRouter = Router();
domainsRouter.use(authMiddlewareCompat);

// GET /api/domains – flat array, minimal fields
domainsRouter.get('/', async (req, res) => {
  try {
    const includeDeleted = String(req.query.includeDeleted || '0') === '1';
    try {
      const rows = await prisma.domain.findMany({
        where: includeDeleted ? {} : { deletedAt: null },
        select: { id: true, name: true, customDomain: true, createdAt: true, updatedAt: true, deletedAt: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(rows);
    } catch (e: any) {
      // Fallback if deletedAt column not present yet
      const message = String(e?.message || '');
      if (message.includes('column') && message.includes('deletedAt')) {
        const rows = await prisma.domain.findMany({
          select: { id: true, name: true, customDomain: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' }
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

// GET /api/domains/my – unchanged logic here, but ignore soft-deleted
domainsRouter.get('/my', async (req, res) => {
  try {
    try {
      const domain = await prisma.domain.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' }
      });
      if (!domain) return res.status(404).json({ error: 'No domain' });
      return res.json(domain);
    } catch (e: any) {
      const message = String(e?.message || '');
      if (message.includes('column') && message.includes('deletedAt')) {
        const domain = await prisma.domain.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!domain) return res.status(404).json({ error: 'No domain' });
        return res.json(domain);
      }
      throw e;
    }
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
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



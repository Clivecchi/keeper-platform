/**
 * Domain-Integrated Path API Routes
 * Path endpoints that respect domain permissions and boundaries
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { queryValidationMiddleware, validationMiddleware } from '../../middleware/validationMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

const pathQuerySchema = z.object({
  search: z.string().optional(),
  domainId: z.string().uuid().optional(),
  journeyId: z.string().uuid().optional(),
  keeperId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const createPathSchema = z.object({
  name: z.string().min(1).max(200),
  prelude: z.string().max(1000).optional(),
  domainId: z.string().uuid(),
  journeyId: z.string().uuid(),
  keeperId: z.string().uuid(),
});

const updatePathSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  prelude: z.string().max(1000).optional(),
});

/**
 * GET /api/paths - Get paths with filtering
 */
router.get(
  '/',
  authMiddlewareCompat,
  requireDomainReadCompat,
  queryValidationMiddleware(pathQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { search, domainId, journeyId, keeperId, limit = 20, offset = 0 } = req.query as {
        search?: string;
        domainId?: string;
        journeyId?: string;
        keeperId?: string;
        limit?: number;
        offset?: number;
      };

      const where: Record<string, unknown> = {};

      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      if (journeyId) {
        where.journeyId = journeyId;
      }

      if (keeperId) {
        where.keeperId = keeperId;
      }

      if (domainId) {
        const hasPermission = await (req as any).domainScope?.canAccessDomain(domainId);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied to domain' });
        }
        where.Journey = { domainId };
      } else {
        const domains = (req as any).domainScope?.userDomains;
        if (Array.isArray(domains) && domains.length > 0) {
          where.Journey = { domainId: { in: domains } };
        }
      }

      const [paths, total] = await Promise.all([
        prisma.path.findMany({
          where,
          orderBy: { name: 'asc' },
          take: Number(limit),
          skip: Number(offset),
          include: {
            Journey: {
              select: { id: true, name: true, domainId: true },
            },
            Keeper: {
              select: { id: true, title: true, domainId: true },
            },
          },
        }),
        prisma.path.count({ where }),
      ]);

      return res.json({
        paths,
        total,
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
      });
    } catch (error) {
      console.error('Error fetching paths:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/paths/:id - Get specific path
 */
router.get(
  '/:id',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const path = await prisma.path.findUnique({
        where: { id: req.params.id },
        include: {
          Journey: { select: { id: true, name: true, domainId: true } },
          Keeper: { select: { id: true, title: true, domainId: true } },
          Moment: { select: { id: true, title: true, narrative: true } },
        },
      });

      if (!path) {
        return res.status(404).json({ error: 'Path not found' });
      }

      return res.json({ path });
    } catch (error) {
      console.error('Error fetching path:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/paths - Create new path
 */
router.post(
  '/',
  authMiddlewareCompat,
  validationMiddleware(createPathSchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId, journeyId, keeperId, ...payload } = req.body as {
        domainId: string;
        journeyId: string;
        keeperId: string;
        name: string;
        prelude?: string;
      };

      const hasPermission = await (req as any).domainScope?.canAccessDomain(domainId);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied to domain' });
      }

      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        select: { id: true, domainId: true, keeperId: true },
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      if (journey.domainId && journey.domainId !== domainId) {
        return res.status(400).json({ error: 'Journey does not belong to the domain' });
      }

      if (journey.keeperId !== keeperId) {
        return res.status(400).json({ error: 'Journey is not linked to the keeper' });
      }

      const keeper = await prisma.keeper.findUnique({
        where: { id: keeperId },
        select: { domainId: true },
      });

      if (!keeper) {
        return res.status(404).json({ error: 'Keeper not found' });
      }

      if (keeper.domainId && keeper.domainId !== domainId) {
        return res.status(400).json({ error: 'Keeper does not belong to the domain' });
      }

      const path = await prisma.path.create({
        data: {
          id: randomUUID(),
          name: payload.name,
          prelude: payload.prelude || '',
          journeyId,
          keeperId,
          ownerId: (req as any).user?.id,
        },
      });

      return res.status(201).json({ path });
    } catch (error) {
      console.error('Error creating path:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/paths/:id - Update path
 */
router.put(
  '/:id',
  authMiddlewareCompat,
  validationMiddleware(updatePathSchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const path = await prisma.path.update({
        where: { id: req.params.id },
        data: req.body,
      });

      return res.json({ path });
    } catch (error) {
      console.error('Error updating path:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/paths/:id - Delete path
 */
router.delete(
  '/:id',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const momentCount = await prisma.moment.count({ where: { pathId: req.params.id } });
      if (momentCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete path with dependent moments',
          momentCount,
        });
      }

      await prisma.path.delete({ where: { id: req.params.id } });
      return res.json({ message: 'Path deleted successfully' });
    } catch (error) {
      console.error('Error deleting path:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

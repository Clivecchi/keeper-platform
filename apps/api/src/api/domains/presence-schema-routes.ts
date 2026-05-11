/**
 * Presence Schema Routes
 * ======================
 * GET  /api/domains/:domainId/presence-schema/:objectType — read domain schema
 * PUT  /api/domains/:domainId/presence-schema/:objectType — upsert domain schema
 *
 * These routes read/write the PresenceSchema table. The Design Board uses PUT to
 * save customised field layouts. Chronicle clients use GET and fall back to
 * platform defaults on 404.
 */

import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@keeper/database'
import { AuthenticatedRequest, authMiddlewareCompat } from '../../middleware/authMiddleware.js'
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js'

const router: Router = Router()
const prisma = new PrismaClient()

const VALID_OBJECT_TYPES = ['journey', 'moment', 'keeper', 'agent', 'draft', 'dialog', 'service', 'domain'] as const
type ValidObjectType = (typeof VALID_OBJECT_TYPES)[number]

function isValidObjectType(v: string): v is ValidObjectType {
  return VALID_OBJECT_TYPES.includes(v as ValidObjectType)
}

const fieldDefinitionSchema = z.object({
  role: z.enum(['primary', 'secondary', 'ambient', 'quiet']),
  always: z.boolean().optional(),
  minDensity: z.enum(['always', 'standard', 'comfortable']).optional(),
  editable: z.boolean().optional(),
  label: z.string().optional(),
})

const putBodySchema = z.object({
  fields: z.record(fieldDefinitionSchema),
})

// ── GET ───────────────────────────────────────────────────────────────────────

router.get(
  '/:domainId/presence-schema/:objectType',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' })
      }

      const { domainId, objectType } = req.params

      if (!isValidObjectType(objectType)) {
        return res.status(400).json({ error: 'INVALID_OBJECT_TYPE', objectType })
      }

      const record = await prisma.presenceSchema.findUnique({
        where: { domainId_objectType: { domainId, objectType } },
      })

      if (!record) {
        return res.status(404).json({ error: 'NOT_FOUND' })
      }

      return res.json({
        objectType: record.objectType,
        fields: record.fields,
        updatedAt: record.updatedAt,
      })
    } catch (error) {
      console.error('[presence-schema:get:error]', error)
      return res.status(500).json({ error: 'INTERNAL_ERROR' })
    }
  },
)

// ── PUT ───────────────────────────────────────────────────────────────────────

router.put(
  '/:domainId/presence-schema/:objectType',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED' })
      }

      const { domainId, objectType } = req.params

      if (!isValidObjectType(objectType)) {
        return res.status(400).json({ error: 'INVALID_OBJECT_TYPE', objectType })
      }

      const parsed = putBodySchema.safeParse(req.body ?? {})
      if (!parsed.success) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      }

      const record = await prisma.presenceSchema.upsert({
        where: { domainId_objectType: { domainId, objectType } },
        create: {
          domainId,
          objectType,
          fields: parsed.data.fields,
        },
        update: {
          fields: parsed.data.fields,
          updatedAt: new Date(),
        },
      })

      return res.json({
        objectType: record.objectType,
        fields: record.fields,
        updatedAt: record.updatedAt,
      })
    } catch (error) {
      console.error('[presence-schema:put:error]', error)
      return res.status(500).json({ error: 'INTERNAL_ERROR' })
    }
  },
)

export default router

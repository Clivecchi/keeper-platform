/**
 * Entities API Routes - Phase 2 Implementation
 * Minimal entity data for Board context integration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

const entityScopeSchema = z.enum(['keeper', 'domain', 'journey', 'people', 'custom']);
const entityIdSchema = z.string().uuid();

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/entities/:scope/:id/min → minimal entity data
 */
router.get('/:scope/:id/min', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const scope = entityScopeSchema.parse(req.params.scope);
    const entityId = entityIdSchema.parse(req.params.id);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let entity = null;

    switch (scope) {
      case 'keeper':
        entity = await prisma.keeper.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            title: true,
            purpose: true,
            keeperType: true,
            createdAt: true,
            updatedAt: true,
          }
        });
        
        if (entity) {
          entity = {
            id: entity.id,
            name: entity.title,
            icon: '📖', // Default keeper icon
            metrics: {
              purpose: entity.purpose,
              type: entity.keeperType || 'Unknown',
              created: entity.createdAt,
              updated: entity.updatedAt
            }
          };
        }
        break;

      case 'domain':
        const domain = await prisma.domain.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            description: true,
            isPublic: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                keepers: true,
                permissions: true
              }
            }
          }
        });
        
        if (domain) {
          entity = {
            id: domain.id,
            name: domain.name,
            icon: '🏠', // Default domain icon
            metrics: {
              description: domain.description,
              visibility: domain.isPublic ? 'Public' : 'Private',
              keepers: domain._count.keepers,
              members: domain._count.permissions,
              created: domain.createdAt,
              updated: domain.updatedAt
            }
          };
        }
        break;

      case 'journey':
        const journey = await prisma.journey.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            forward: true,
            keeperId: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                Path: true
              }
            }
          }
        });
        
        if (journey) {
          entity = {
            id: journey.id,
            name: journey.name,
            icon: '🗺️', // Default journey icon
            metrics: {
              forward: journey.forward,
              keeperId: journey.keeperId,
              paths: journey._count.Path,
              created: journey.createdAt,
              updated: journey.updatedAt
            }
          };
        }
        break;

      case 'people':
        // For people scope, we might aggregate user data or return a placeholder
        entity = {
          id: entityId,
          name: 'People Overview',
          icon: '👥',
          metrics: {
            scope: 'people',
            description: 'People management and collaboration',
            created: new Date(),
            updated: new Date()
          }
        };
        break;

      case 'custom':
        // For custom scope, return a generic entity
        entity = {
          id: entityId,
          name: 'Custom Entity',
          icon: '⚙️',
          metrics: {
            scope: 'custom',
            description: 'Custom entity configuration',
            created: new Date(),
            updated: new Date()
          }
        };
        break;

      default:
        return res.status(400).json({ 
          success: false, 
          error: `Unsupported entity scope: ${scope}` 
        });
    }

    if (!entity) {
      return res.status(404).json({ 
        success: false, 
        error: `Entity not found: ${scope}/${entityId}` 
      });
    }

    return res.json({
      success: true,
      data: entity
    });
  } catch (error) {
    console.error('Error fetching entity:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid parameters', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

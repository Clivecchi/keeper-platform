/**
 * Engagement Template Execution API
 * 
 * Endpoint for executing engagement templates from the frontend
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { engagementExecutor } from '../../services/EngagementTemplateExecutor.js';

const router = Router();

// Validation schema
const ExecuteTemplateSchema = z.object({
  templateSlug: z.string().min(1),
  context: z.object({
    entityType: z.enum(['domain', 'keeper', 'journey', 'agent', 'board']),
    entityId: z.string().uuid(),
    domainId: z.string().uuid().optional(),
  }),
  inputs: z.record(z.any()).default({})
});

/**
 * POST /api/engagement/execute
 * 
 * Execute an engagement template
 * 
 * Body:
 * {
 *   templateSlug: "domain.admin.update",
 *   context: {
 *     entityType: "domain",
 *     entityId: "domain-uuid",
 *     domainId: "domain-uuid"
 *   },
 *   inputs: {
 *     name: "New Name",
 *     description: "New Description"
 *   }
 * }
 */
router.post('/execute', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate request
    const validatedData = ExecuteTemplateSchema.parse(req.body);

    // Execute template
    const result = await engagementExecutor.execute(
      validatedData.templateSlug,
      {
        userId,
        ...validatedData.context
      },
      validatedData.inputs,
      req
    );

    // Return result with appropriate status code
    const statusCode = result.success ? 200 : 400;
    
    return res.status(statusCode).json(result);
  } catch (error) {
    console.error('Engagement execution API error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/engagement/templates/:slug
 * 
 * Get template definition (for UI to know what fields to show)
 */
router.get('/templates/:slug', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const template = await engagementExecutor.getTemplate(slug);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    return res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get template error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/engagement/templates/type/:keeperTypeName
 * 
 * Get all templates for a KeeperType
 */
router.get('/templates/type/:keeperTypeName', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { keeperTypeName } = req.params;

    const templates = await engagementExecutor.getTemplatesForType(keeperTypeName);

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get templates for type error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;


/**
 * Engagement Templates API
 * ========================
 * Read-only endpoint for fetching template definitions
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/engagement/templates/:key
 * Fetch a single engagement template by slug/key
 */
router.get('/:key', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const template = await prisma.engagement_templates.findUnique({
      where: { slug: key },
      include: {
        engagement_fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check visibility - if template requires admin role, ensure user has it
    const config = template.config as any;
    if (config?.visibility === 'admin') {
      // Check if user has domain permission (this is a simplified check)
      // In production, you'd want more sophisticated role checking
      if (!req.user) {
        return res.status(403).json({ error: 'Authentication required' });
      }
    }

    // Transform to client format
    const clientTemplate = {
      key: template.slug,
      label: template.label,
      scope: config?.visibility === 'public' ? 'public' : 'admin',
      endpoint: extractEndpoint(template.slug, config),
      method: extractMethod(config),
      fields: template.engagement_fields.map(field => ({
        name: field.name,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder || undefined,
        required: (field.config as any)?.required || false,
        options: (field.config as any)?.options || undefined,
        min: (field.config as any)?.min || undefined,
        max: (field.config as any)?.max || undefined,
        minLength: (field.config as any)?.minLength || undefined,
        maxLength: (field.config as any)?.maxLength || undefined,
        pattern: (field.config as any)?.pattern || undefined,
        defaultValue: (field.config as any)?.defaultValue || undefined,
      })),
      requiredRole: config?.visibility === 'admin' ? 'admin' : undefined,
      meta: config || {}
    };

    return res.json(clientTemplate);
  } catch (error) {
    console.error('Error fetching template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Extract endpoint from template config
 */
function extractEndpoint(slug: string, config: any): string {
  if (config?.action?.endpoint) {
    return config.action.endpoint;
  }

  // Map known slugs to endpoints
  const endpointMap: Record<string, string> = {
    'domain.board.setViewerMode': '/api/boards/:boardId/viewer-mode',
    'domain.board.addFrame': '/api/boards/:boardId/frames',
    'domain.board.updateFrame': '/api/boards/frames/:frameId',
    'domain.board.setCover': '/api/boards/:boardId/cover',
    'domain.board.upsertPathwayNav': '/api/boards/:boardId/nav',
    'domain.board.publish': '/api/boards/:boardId/publish',
    'domain.public.contact': '/api/domains/:domainId/contact',
    'domain.admin.update': '/api/domains/:domainId',
    'domain.admin.verify': '/api/domains/:domainId/custom-domain/verify',
    'domain.admin.addCustomDomain': '/api/domains/:domainId/custom-domain',
    'domain.admin.editApiKey': '/api/kip/user-keys',
    'domain.admin.assignAgent': '/api/domains/:domainId',
  };

  return endpointMap[slug] || slug;
}

/**
 * Extract HTTP method from template config
 */
function extractMethod(config: any): string {
  if (config?.action?.method) {
    return config.action.method;
  }
  return 'POST'; // default
}

export default router;


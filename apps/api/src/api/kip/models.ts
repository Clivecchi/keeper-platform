/**
 * KIP Models API
 * ==============
 *
 * Exposes the model catalog for frontend model selection.
 */

import { Router, type Request, type Response } from 'express';
import {
  MODEL_CATALOG,
  DEFAULT_MODEL_BY_PROVIDER,
  PROVIDERS,
  type ModelCatalogEntry,
} from '../../config/modelCatalog.js';
import type { ModelProvider } from '@keeper/database';

const router = Router();

/**
 * GET /api/kip/models
 *
 * Query params:
 *   provider (optional) - Filter by provider (openai, anthropic, together, elevenlabs)
 *
 * Returns:
 *   providers: string[]
 *   models: ModelCatalogEntry[]
 *   defaults: Record<provider, modelId>
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const providerParam = typeof req.query.provider === 'string' ? req.query.provider : undefined;
    const provider = providerParam as ModelProvider | undefined;

    const validProviders = PROVIDERS as readonly ModelProvider[];
    if (provider && !validProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider. Must be one of: ${validProviders.join(', ')}`,
      });
    }

    const providers = provider ? [provider] : [...PROVIDERS];
    const models: ModelCatalogEntry[] = providers.flatMap((p) => MODEL_CATALOG[p] ?? []);

    const defaults: Record<string, string> = {};
    for (const p of providers) {
      defaults[p] = DEFAULT_MODEL_BY_PROVIDER[p];
    }

    return res.json({
      success: true,
      data: {
        providers,
        models,
        defaults,
      },
    });
  } catch (error) {
    console.error('[kip/models] GET error', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load model catalog',
    });
  }
});

export default router;

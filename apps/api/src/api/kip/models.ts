/**
 * KIP Models API
 * ==============
 *
 * Exposes the model catalog for frontend model selection.
 * Primary source: cached catalog on connected Integration records (Connected Gateway pattern).
 * Fallback: static entries in modelCatalog.ts when no connected integration or empty cache.
 */

import { Router, type Request, type Response } from 'express';
import {
  DEFAULT_MODEL_BY_PROVIDER,
  PROVIDERS,
} from '../../config/modelCatalog.js';
import type { ModelProvider } from '@keeper/database';
import { resolveModelsForProvider } from '../../lib/integrationCatalog.js';

const router = Router();

/**
 * GET /api/kip/models
 *
 * Query params:
 *   provider (optional) - Filter by provider (openai, anthropic, together-ai, elevenlabs).
 *
 * Returns:
 *   providers: string[]
 *   models: Array<{ id, label, provider, source }>
 *   defaults: Record<provider, modelId>
 */
router.get('/', async (req: Request, res: Response) => {
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

    const modelGroups = await Promise.all(
      providers.map((p) => resolveModelsForProvider(p)),
    );
    const models = modelGroups.flat().map((m) => ({
      id: m.id,
      label: m.label,
      provider: m.provider,
      source: m.source,
      ...(m.capabilities ? { capabilities: m.capabilities } : {}),
      ...(m.defaultSettings ? { defaultSettings: m.defaultSettings } : {}),
    }));

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

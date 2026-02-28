/**
 * KIP Models API
 * ==============
 *
 * Exposes the model catalog for frontend model selection.
 * When provider is specified, fetches models dynamically from the provider's API
 * (OpenAI, Anthropic) using stored API keys. Results cached 1 hour.
 * Falls back to static catalog on fetch failure.
 */

import { Router, type Request, type Response } from 'express';
import {
  MODEL_CATALOG,
  DEFAULT_MODEL_BY_PROVIDER,
  PROVIDERS,
  type ModelCatalogEntry,
} from '../../config/modelCatalog.js';
import type { ModelProvider } from '@keeper/database';
import {
  fetchProviderModels,
  getDefaultModelForProvider,
} from '../../services/ProviderModelsFetcher.js';

const router = Router();

/**
 * GET /api/kip/models
 *
 * Query params:
 *   provider (optional) - Filter by provider (openai, anthropic, together, elevenlabs).
 *     When set, fetches models from provider API; otherwise returns static catalog.
 *
 * Returns:
 *   providers: string[]
 *   models: Array<{ id, displayName, provider }>
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

    let models: Array<{ id: string; label: string; provider: string }>;

    if (provider) {
      const dynamic = await fetchProviderModels(provider);
      models = dynamic.map((m) => ({
        id: m.id,
        label: m.displayName,
        provider: m.provider,
      }));
    } else {
      const staticModels: ModelCatalogEntry[] = providers.flatMap(
        (p) => MODEL_CATALOG[p] ?? []
      );
      models = staticModels.map((m) => ({
        id: m.id,
        label: m.label,
        provider: m.provider,
      }));
    }

    const defaults: Record<string, string> = {};
    for (const p of providers) {
      defaults[p] = provider
        ? getDefaultModelForProvider(p)
        : DEFAULT_MODEL_BY_PROVIDER[p];
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

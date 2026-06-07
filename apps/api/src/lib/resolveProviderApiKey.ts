/**
 * Resolve provider API keys using the same order as ModelProviderService:
 * environment → user → platform.
 */

import type { ModelProvider } from '@keeper/database';
import { KipUserKeyService } from '../services/KipUserKeyService.js';
import { PlatformApiKeyService } from '../services/PlatformApiKeyService.js';

function validKey(key: string | null | undefined): string | null {
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}

function envKeyForProvider(provider: ModelProvider): string | null {
  switch (provider) {
    case 'openai':
      return validKey(process.env.OPENAI_API_KEY);
    case 'anthropic':
      return validKey(process.env.ANTHROPIC_API_KEY);
    case 'together-ai':
      return validKey(process.env.TOGETHER_API_KEY);
    case 'elevenlabs':
      return validKey(process.env.ELEVENLABS_API_KEY);
    default:
      return null;
  }
}

export async function resolveProviderApiKey(
  provider: ModelProvider,
  userId?: string | null,
): Promise<string | null> {
  let apiKey = envKeyForProvider(provider);
  if (apiKey) return apiKey;

  if (userId) {
    apiKey = validKey(await KipUserKeyService.getUserKey(provider, userId));
    if (apiKey) return apiKey;
  }

  return validKey(await PlatformApiKeyService.getKeyForProvider(provider));
}

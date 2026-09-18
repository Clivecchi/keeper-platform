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

export function envVarNameForProvider(provider: ModelProvider): string {
  switch (provider) {
    case 'openai':
      return 'OPENAI_API_KEY';
    case 'anthropic':
      return 'ANTHROPIC_API_KEY';
    case 'together-ai':
      return 'TOGETHER_API_KEY';
    case 'elevenlabs':
      return 'ELEVENLABS_API_KEY';
    case 'typesafe':
      return 'TYPESAFE_API_KEY';
  }
}

export function envKeyForProvider(provider: ModelProvider): string | null {
  return validKey(process.env[envVarNameForProvider(provider)]);
}

export type ProviderKeySource = 'env' | 'user' | 'platform' | 'none';

export type ResolvedProviderKey = {
  key: string | null;
  source: ProviderKeySource;
};

export async function resolveProviderApiKeyWithSource(
  provider: ModelProvider,
  userId?: string | null,
): Promise<ResolvedProviderKey> {
  const envKey = envKeyForProvider(provider);
  if (envKey) {
    return { key: envKey, source: 'env' };
  }

  if (userId) {
    const userKey = validKey(await KipUserKeyService.getUserKey(provider, userId));
    if (userKey) {
      return { key: userKey, source: 'user' };
    }
  }

  const platformKey = validKey(await PlatformApiKeyService.getKeyForProvider(provider));
  if (platformKey) {
    return { key: platformKey, source: 'platform' };
  }

  return { key: null, source: 'none' };
}

export async function resolveProviderApiKey(
  provider: ModelProvider,
  userId?: string | null,
): Promise<string | null> {
  const resolved = await resolveProviderApiKeyWithSource(provider, userId);
  return resolved.key;
}

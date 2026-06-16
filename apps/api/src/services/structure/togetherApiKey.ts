import { PlatformApiKeyService } from '../PlatformApiKeyService.js';
import { KipUserKeyService } from '../KipUserKeyService.js';

function validKey(k: string | null | undefined): string | null {
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : null;
}

/** TOGETHER_API_KEY env → user key → platform DB key. */
export async function resolveTogetherApiKey(userId?: string): Promise<string | null> {
  let apiKey = validKey(process.env.TOGETHER_API_KEY);
  if (apiKey) return apiKey;

  if (userId) {
    apiKey = validKey(await KipUserKeyService.getUserKey('together-ai', userId));
    if (apiKey) return apiKey;
  }

  return validKey(await PlatformApiKeyService.getKeyForProvider('together-ai'));
}

/**
 * AI Model integration connect verification (API key probe).
 */

import type { ModelProvider } from '@keeper/database';

export type AiModelConnectVerifyResult =
  | { ok: true }
  | { ok: false; error: string; hint?: string };

export async function verifyAIModelConnect(
  provider: ModelProvider,
  apiKey: string,
): Promise<AiModelConnectVerifyResult> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: 'API key is required' };
  }

  switch (provider) {
    case 'together-ai':
      return verifyTogetherKey(key);
    case 'openai':
      return verifyOpenAIKey(key);
    case 'anthropic':
      return verifyAnthropicKey(key);
    case 'elevenlabs':
      return verifyElevenLabsKey(key);
    default:
      return { ok: false, error: `Unsupported AI Model provider: ${provider}` };
  }
}

async function verifyTogetherKey(apiKey: string): Promise<AiModelConnectVerifyResult> {
  try {
    const res = await fetch('https://api.together.xyz/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: 'Together AI API key is invalid',
        hint: 'Verify TOGETHER_API_KEY or the platform key for together-ai.',
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: `Together AI API returned HTTP ${res.status}`,
        hint: 'Check network access to api.together.xyz.',
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Together AI',
      hint: 'Check network connectivity from the API host.',
    };
  }
}

async function verifyOpenAIKey(apiKey: string): Promise<AiModelConnectVerifyResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401) {
      return { ok: false, error: 'OpenAI API key is invalid' };
    }
    if (!res.ok) {
      return { ok: false, error: `OpenAI API returned HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach OpenAI',
    };
  }
}

async function verifyAnthropicKey(apiKey: string): Promise<AiModelConnectVerifyResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (res.status === 401) {
      return { ok: false, error: 'Anthropic API key is invalid' };
    }
    if (!res.ok) {
      return { ok: false, error: `Anthropic API returned HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Anthropic',
    };
  }
}

async function parseElevenLabsError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      detail?: { status?: string; message?: string };
    };
    const status = body.detail?.status;
    const message = body.detail?.message;
    if (status === 'invalid_api_key') {
      return 'ElevenLabs API key is invalid';
    }
    if (status === 'missing_permissions') {
      return message ?? 'ElevenLabs API key is missing required permissions';
    }
    if (message) return message;
  } catch {
    /* non-JSON body */
  }
  return `ElevenLabs API returned HTTP ${res.status}`;
}

/** Verify via /v1/voices — matches TTS usage; restricted keys often lack user_read on /v1/user. */
async function verifyElevenLabsKey(apiKey: string): Promise<AiModelConnectVerifyResult> {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    if (res.ok) {
      return { ok: true };
    }
    const error = await parseElevenLabsError(res);
    if (res.status === 401) {
      return {
        ok: false,
        error,
        hint: error.includes('invalid')
          ? 'Create a new API key in ElevenLabs and copy the full key at creation time.'
          : 'Enable Voices Read (or turn off Restrict Key) in your ElevenLabs API key settings.',
      };
    }
    return {
      ok: false,
      error,
      hint: `ElevenLabs API returned HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach ElevenLabs',
    };
  }
}

/**
 * Model Provider Service
 * ======================
 * 
 * Abstraction layer for AI model providers (OpenAI, Anthropic, Together, ElevenLabs)
 * Handles dynamic provider resolution, retry logic, and unified response format
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ModelProvider, ModelSettings } from '@keeper/database';
import { KipUserKeyService } from './KipUserKeyService.js';
import { PlatformApiKeyService } from './PlatformApiKeyService.js';
import { MODEL_CATALOG, getDefaultSettingsForProvider } from '../config/modelCatalog.js';
import { getModelCapabilities } from '../config/index.js';

const DEFAULT_ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

function validProviderKey(k: string | null | undefined): string | null {
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : null;
}

async function readableStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

/** OpenAI-style content part for multimodal messages (text + images) */
export type ModelContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  /** String for text-only; array for multimodal (text + image_url) */
  content: string | ModelContentPart[];
}

export interface ModelResponse {
  success: boolean;
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  provider: ModelProvider;
  error?: string;
  retries_used: number;
  execution_time_ms: number;
  errorCode?: ModelProviderErrorCode;
  retryable?: boolean;
  providerStatus?: number;
  keySource?: ModelProviderKeySource;
}

export type ModelProviderErrorCode = 'MISSING_API_KEY' | 'INVALID_MODEL' | 'PROVIDER_UNAVAILABLE' | 'TIMEOUT' | 'QUOTA_EXCEEDED';
export type ModelProviderKeySource = 'env' | 'user' | 'platform' | 'none';

class ModelProviderException extends Error {
  code: ModelProviderErrorCode;
  retryable: boolean;
  status?: number;

  constructor(code: ModelProviderErrorCode, message: string, options?: { retryable?: boolean; status?: number }) {
    super(message);
    this.name = 'ModelProviderException';
    this.code = code;
    this.retryable = options?.retryable ?? code === 'PROVIDER_UNAVAILABLE';
    this.status = options?.status;
  }
}

export interface ModelCallOptions {
  messages: ModelMessage[];
  settings: ModelSettings;
  provider: ModelProvider;
  userId?: string; // Optional user ID for user-scoped API keys
  environment?: Record<string, unknown> | null;
  /** When true, request JSON object output (OpenAI response_format) for structured responses */
  jsonMode?: boolean;
}

export interface ImageGenerationBrief {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  /** The image_style hint from domain JSON — informational context used when assembling the prompt, not sent to FLUX directly */
  domain_context?: string;
}

export interface ImageGenerationResult {
  url: string;
  model: string;
  prompt: string;
}

export interface VoiceSynthesisBrief {
  text: string;
  voiceId?: string;
  model?: string;
}

export interface VoiceSynthesisResult {
  audio: Buffer;
  contentType: string;
  voiceId: string;
  model: string;
  text: string;
}

const RETRY_TEMPLATE = Object.freeze({
  max_retries: 3,
  retry_delay_ms: 1000
});


/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider {
  static async callModel(
    messages: ModelMessage[], 
    settings: ModelSettings, 
    apiKey?: string,
    jsonMode?: boolean
  ): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    // Use provided API key or fall back to system key
    const rawKey = apiKey || process.env.OPENAI_API_KEY;
    const finalApiKey = typeof rawKey === 'string' && rawKey.trim().length > 0 ? rawKey.trim() : null;
    if (!finalApiKey) {
      throw new ModelProviderException(
        'MISSING_API_KEY',
        'OpenAI API key is not configured. Add OPENAI_API_KEY to your Railway environment variables.',
        { retryable: false }
      );
    }

    try {
      // Dynamic import to avoid bundling issues if not installed
      const { OpenAI } = await import('openai');
      
      // 30-second timeout to prevent indefinite hangs
      const MODEL_TIMEOUT_MS = 30_000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

      const openai = new OpenAI({ apiKey: finalApiKey });

      let response;
      try {
        const createParams: Record<string, unknown> = {
          model: settings.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          top_p: settings.top_p,
          frequency_penalty: settings.frequency_penalty,
          presence_penalty: settings.presence_penalty,
        };
        const capabilities = getModelCapabilities('openai', settings.model);
        if (jsonMode && capabilities.jsonMode) {
          (createParams as any).response_format = { type: 'json_object' };
        }
        response = await openai.chat.completions.create(
          createParams as any,
          { signal: controller.signal },
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response content from OpenAI');
      }

      return {
        success: true,
        content: choice.message.content,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined,
        model: response.model
      };
    } catch (error) {
      // Detect AbortController timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('OpenAI API timeout after 30s');
        throw new ModelProviderException('TIMEOUT', 'AI model request timed out after 30 seconds', { retryable: false });
      }
      console.error('OpenAI API error:', error);
      throw normalizeProviderError('openai', error);
    }
  }

  static getMockResponse(messages: ModelMessage[], settings: ModelSettings): Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'> {
    const raw = messages.find(m => m.role === 'user')?.content;
    const userMessage = typeof raw === 'string' ? raw : (Array.isArray(raw) ? raw.find(p => p.type === 'text')?.text ?? '[image(s) attached]' : 'Hello');
    
    return {
      success: true,
      content: `[MOCK OpenAI Response] I understand you said: "${userMessage}". This is a simulated response from ${settings.model} with temperature ${settings.temperature}. In production, this would be a real AI-generated response.`,
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150
      },
      model: settings.model
    };
  }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider {
  static async callModel(
    messages: ModelMessage[],
    settings: ModelSettings,
    apiKey?: string,
    jsonMode?: boolean
  ): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    const rawKey = apiKey || process.env.ANTHROPIC_API_KEY;
    const finalApiKey = typeof rawKey === 'string' && rawKey.trim().length > 0 ? rawKey.trim() : null;
    if (!finalApiKey) {
      throw new ModelProviderException(
        'MISSING_API_KEY',
        'Anthropic API key is not configured. Add ANTHROPIC_API_KEY to your Railway environment variables.',
        { retryable: false }
      );
    }

    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');

      const { anthropicMessages, systemPrompt } = convertToAnthropicFormat(messages);

      const MODEL_TIMEOUT_MS = 60_000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

      const client = new Anthropic({ apiKey: finalApiKey });

      const createParams: Record<string, unknown> = {
        model: settings.model,
        max_tokens: settings.max_tokens ?? 4000,
        temperature: settings.temperature ?? 0.7,
        messages: anthropicMessages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
      };
      // Anthropic does not support a json_object output_config shorthand.
      // JSON output is enforced via system prompt instructions in the agent layer.
      // Do NOT add output_config here — it causes a 400 invalid_request_error.

      const response = await client.messages.create(createParams as any, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentBlocks = (response as any).content ?? [];
      const textContent = contentBlocks
        .filter((b: { type?: string }) => b.type === 'text')
        .map((b: { text?: string }) => b.text ?? '')
        .join('');

      const usage = (response as any).usage;

      return {
        success: true,
        content: textContent || '[No response content]',
        usage: usage
          ? {
              prompt_tokens: usage.input_tokens ?? 0,
              completion_tokens: usage.output_tokens ?? 0,
              total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
            }
          : undefined,
        model: (response as any).model ?? settings.model,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Anthropic API timeout');
        throw new ModelProviderException('TIMEOUT', 'Anthropic model request timed out', { retryable: false });
      }
      console.error('Anthropic API error:', error);
      throw normalizeProviderError('anthropic', error);
    }
  }
}

function parseDataUrlImage(url: string): { mediaType: string; data: string } | null {
  const match = url.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

type AnthropicMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      | { type: 'image'; source: { type: 'url'; url: string } }
    >;

function convertModelContentToAnthropic(content: string | ModelContentPart[]): AnthropicMessageContent {
  if (typeof content === 'string') return content;

  const blocks: Exclude<AnthropicMessageContent, string> = [];
  for (const part of content) {
    if (part.type === 'text') {
      if (part.text.trim()) blocks.push({ type: 'text', text: part.text });
      continue;
    }
    if (part.type === 'image_url') {
      const parsed = parseDataUrlImage(part.image_url.url);
      if (parsed) {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: parsed.mediaType,
            data: parsed.data,
          },
        });
      } else {
        blocks.push({
          type: 'image',
          source: { type: 'url', url: part.image_url.url },
        });
      }
    }
  }

  if (blocks.length === 0) return '[Empty]';
  if (blocks.length === 1 && blocks[0].type === 'text') return blocks[0].text;
  return blocks;
}

function convertToAnthropicFormat(messages: ModelMessage[]): {
  anthropicMessages: Array<{ role: 'user' | 'assistant'; content: AnthropicMessageContent }>;
  systemPrompt: string | null;
} {
  const systemParts: string[] = [];
  const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: AnthropicMessageContent }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      const text = typeof msg.content === 'string' ? msg.content : extractTextFromContent(msg.content);
      if (text) systemParts.push(text);
      continue;
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') continue;

    anthropicMessages.push({
      role: msg.role,
      content: convertModelContentToAnthropic(msg.content),
    });
  }

  return {
    anthropicMessages,
    systemPrompt: systemParts.length > 0 ? systemParts.join('\n\n') : null,
  };
}

function extractTextFromContent(content: ModelContentPart[]): string {
  const parts: string[] = [];
  for (const p of content) {
    if (p.type === 'text') parts.push(p.text);
    else if (p.type === 'image_url') parts.push('[Image attached]');
  }
  return parts.join('\n');
}

/**
 * Together AI Provider Implementation
 * Chat completions via OpenAI-compatible API; image generation via FLUX is live.
 */
class TogetherProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  static async callModel(
    messages: ModelMessage[],
    settings: ModelSettings,
    apiKey?: string,
    jsonMode?: boolean
  ): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    const rawKey = apiKey || process.env.TOGETHER_API_KEY;
    const finalApiKey = typeof rawKey === 'string' && rawKey.trim().length > 0 ? rawKey.trim() : null;
    if (!finalApiKey) {
      throw new ModelProviderException(
        'MISSING_API_KEY',
        'Together AI API key is not configured. Add TOGETHER_API_KEY to your Railway environment variables.',
        { retryable: false }
      );
    }

    try {
      const { OpenAI } = await import('openai');

      const MODEL_TIMEOUT_MS = 60_000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

      const together = new OpenAI({
        apiKey: finalApiKey,
        baseURL: 'https://api.together.xyz/v1',
      });

      let response;
      try {
        const createParams: Record<string, unknown> = {
          model: settings.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          top_p: settings.top_p,
          frequency_penalty: settings.frequency_penalty,
          presence_penalty: settings.presence_penalty,
          stream: false,
        };
        const capabilities = getModelCapabilities('together-ai', settings.model);
        if (jsonMode && capabilities.jsonMode) {
          (createParams as any).response_format = { type: 'json_object' };
        }
        response = await together.chat.completions.create(
          createParams as any,
          { signal: controller.signal },
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response content from Together AI');
      }

      return {
        success: true,
        content: choice.message.content,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined,
        model: response.model
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Together AI API timeout');
        throw new ModelProviderException('TIMEOUT', 'Together AI model request timed out', { retryable: false });
      }
      console.error('Together AI API error:', error);
      throw normalizeProviderError('together-ai', error);
    }
  }

  async generateImage(brief: ImageGenerationBrief): Promise<ImageGenerationResult> {
    const model = brief.model ?? 'black-forest-labs/FLUX.1-schnell';
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: brief.prompt,
        width: brief.width ?? 1024,
        height: brief.height ?? 1024,
        steps: brief.steps ?? 4,
        n: 1,
        response_format: 'url',
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Together AI API error: ${response.status} ${err}`);
    }
    const data = await response.json();
    const url = data.data?.[0]?.url;
    if (!url) throw new Error('No image URL returned from Together AI');
    return { url, model, prompt: brief.prompt };
  }
}

/**
 * ElevenLabs Provider — text-to-speech via @elevenlabs/elevenlabs-js
 */
class ElevenLabsProvider {
  static resolveVoiceId(voiceId?: string): string {
    return (
      validProviderKey(voiceId) ||
      validProviderKey(process.env.ELEVENLABS_DEFAULT_VOICE_ID) ||
      DEFAULT_ELEVENLABS_VOICE_ID
    );
  }

  static async synthesize(
    brief: VoiceSynthesisBrief,
    apiKey: string,
  ): Promise<VoiceSynthesisResult> {
    const text = brief.text.trim();
    if (!text) {
      throw new ModelProviderException('PROVIDER_UNAVAILABLE', 'Text is required for voice synthesis.', {
        retryable: false,
      });
    }

    const voiceId = this.resolveVoiceId(brief.voiceId);
    const model = validProviderKey(brief.model) || 'eleven_multilingual_v2';
    const client = new ElevenLabsClient({ apiKey });
    const stream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: model,
      outputFormat: 'mp3_44100_128',
    });
    const audio = await readableStreamToBuffer(stream);

    return {
      audio,
      contentType: 'audio/mpeg',
      voiceId,
      model,
      text,
    };
  }

  static async callModel(
    messages: ModelMessage[],
    settings: ModelSettings,
    apiKey?: string,
  ): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    const rawKey = apiKey || process.env.ELEVENLABS_API_KEY;
    const finalApiKey = validProviderKey(rawKey);
    if (!finalApiKey) {
      throw new ModelProviderException(
        'MISSING_API_KEY',
        'ElevenLabs API key is not configured. Add ELEVENLABS_API_KEY to your Railway environment variables.',
        { retryable: false },
      );
    }

    const raw = messages.find((m) => m.role === 'user')?.content;
    const userMessage =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
          ? (raw.find((p) => p.type === 'text')?.text ?? '')
          : 'Hello';

    const result = await this.synthesize(
      { text: userMessage, model: settings.model },
      finalApiKey,
    );

    return {
      success: true,
      content: result.audio.toString('base64'),
      usage: {
        prompt_tokens: userMessage.length,
        completion_tokens: 0,
        total_tokens: userMessage.length,
      },
      model: result.model,
    };
  }
}

/**
 * Main Model Provider Service
 */
export class ModelProviderService {
  // Track last key source for debugging
  private static lastKeySource: { provider: ModelProvider; keySource: ModelProviderKeySource; timestamp: string } | null = null;

  /**
   * Get the last key source used (for debugging)
   */
  static getLastKeySource() {
    return this.lastKeySource;
  }

  /**
   * Call a model with the specified options and retry logic
   */
  static async callModel(options: ModelCallOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    const { messages, settings, provider, userId } = options;
    const retryConfig = settings.retry || { max_retries: 3, retry_delay_ms: 1000 };
    
    // Helper: treat empty/whitespace keys as invalid
    const validKey = (k: string | null | undefined): string | null =>
      typeof k === 'string' && k.trim().length > 0 ? k.trim() : null;

    // Implement key resolution hierarchy: environment key → platform key → user key
    // NEW ORDER: Prefer ENV over DB for long-term reliability
    let apiKey: string | null = null;
    let keySource: ModelProviderKeySource = 'none';

    // When stabilization mode is enabled, force env-only keys for runtime
    if (process.env.STABILIZE_MODE === '1') {
      if (provider === 'openai') {
        apiKey = validKey(process.env.OPENAI_API_KEY);
        keySource = apiKey ? 'env' : 'none';
      } else if (provider === 'anthropic') {
        apiKey = validKey(process.env.ANTHROPIC_API_KEY);
        keySource = apiKey ? 'env' : 'none';
      } else if (provider === 'together-ai') {
        apiKey = validKey(process.env.TOGETHER_API_KEY);
        keySource = apiKey ? 'env' : 'none';
      } else if (provider === 'elevenlabs') {
        apiKey = validKey(process.env.ELEVENLABS_API_KEY);
        keySource = apiKey ? 'env' : 'none';
      }
    } else {
      // 1. Try environment key first (highest priority, recommended long-term)
      if (provider === 'openai') {
        apiKey = validKey(process.env.OPENAI_API_KEY);
        if (apiKey) keySource = 'env';
      }
      if (provider === 'anthropic') {
        apiKey = validKey(process.env.ANTHROPIC_API_KEY);
        if (apiKey) keySource = 'env';
      }
      if (provider === 'together-ai') {
        apiKey = validKey(process.env.TOGETHER_API_KEY);
        if (apiKey) keySource = 'env';
      }
      if (provider === 'elevenlabs') {
        apiKey = validKey(process.env.ELEVENLABS_API_KEY);
        if (apiKey) keySource = 'env';
      }

      // 2. Fall back to user's personal API key if env not set
      if (!apiKey && userId) {
        apiKey = validKey(await KipUserKeyService.getUserKey(provider, userId));
        if (apiKey) keySource = 'user';
      }

      // 3. Fall back to platform key from DB as last resort
      if (!apiKey) {
        apiKey = validKey(await PlatformApiKeyService.getKeyForProvider(provider));
        if (apiKey) keySource = 'platform';
      }
    }
    
    // Track key source for debugging
    this.lastKeySource = {
      provider,
      keySource,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[ModelProvider] Using ${keySource} key for ${provider} (user: ${userId || 'none'})`);

    // Error taxonomy representative: surface MISSING_API_KEY before we ever hit the SDK.
    const requiresExplicitKey =
      provider === 'openai' ||
      provider === 'anthropic' ||
      provider === 'together-ai' ||
      provider === 'elevenlabs';
    if (requiresExplicitKey && !apiKey) {
      const envVar =
        provider === 'anthropic'
          ? 'ANTHROPIC_API_KEY'
          : provider === 'together-ai'
            ? 'TOGETHER_API_KEY'
            : provider === 'elevenlabs'
              ? 'ELEVENLABS_API_KEY'
              : 'OPENAI_API_KEY';
      const message = `Add ${envVar} to your Railway environment variables, or configure a platform/user key.`;
      return {
        success: false,
        content: '',
        error: message,
        model: settings.model,
        provider,
        retries_used: 0,
        execution_time_ms: Date.now() - startTime,
        errorCode: 'MISSING_API_KEY',
        retryable: false,
        keySource
      };
    }
    
    let lastError: ModelProviderException | Error | null = null;
    let attemptsUsed = 0;
    
    for (let attempt = 0; attempt <= retryConfig.max_retries; attempt++) {
      attemptsUsed = attempt;
      try {
        const response = await this.callProviderModel(provider, messages, settings, apiKey, options.jsonMode);
        
        return {
          ...response,
          provider,
          retries_used: attempt,
          execution_time_ms: Date.now() - startTime,
          keySource
        };
      } catch (error) {
        const normalizedError = error instanceof ModelProviderException
          ? error
          : normalizeProviderError(provider, error);

        lastError = normalizedError;
        console.warn(
          `Attempt ${attempt + 1}/${retryConfig.max_retries + 1} failed for ${provider}:`,
          normalizedError.message
        );

        if (!normalizedError.retryable || attempt >= retryConfig.max_retries) {
          break;
        }

        await this.delay(retryConfig.retry_delay_ms);
      }
    }
    
    // All retries failed. Keep provider key-source details in logs/metadata, not the user-facing error text.
    const fallbackErrorMessage = lastError
      ? lastError.message
      : 'Unknown model provider error';

    return {
      success: false,
      content: '',
      error: fallbackErrorMessage,
      model: settings.model,
      provider,
      retries_used: attemptsUsed,
      execution_time_ms: Date.now() - startTime,
      errorCode: lastError instanceof ModelProviderException ? lastError.code : undefined,
      retryable: lastError instanceof ModelProviderException ? lastError.retryable : true,
      providerStatus: lastError instanceof ModelProviderException ? lastError.status : undefined,
      keySource
    };
  }

  /**
   * Route to the appropriate provider implementation
   */
  private static async callProviderModel(
    provider: ModelProvider, 
    messages: ModelMessage[], 
    settings: ModelSettings,
    apiKey?: string | null,
    jsonMode?: boolean
  ): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    switch (provider) {
      case 'openai':
        return OpenAIProvider.callModel(messages, settings, apiKey || undefined, jsonMode);
      case 'anthropic':
        return AnthropicProvider.callModel(messages, settings, apiKey || undefined, jsonMode);
      case 'together-ai':
        return TogetherProvider.callModel(messages, settings, apiKey || undefined, jsonMode);
      case 'elevenlabs':
        return ElevenLabsProvider.callModel(messages, settings, apiKey || undefined);
      default:
        throw new Error(`Unsupported model provider: ${provider}`);
    }
  }

  /**
   * Utility function for retry delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available models for a provider
   */
  static getAvailableModels(provider: ModelProvider): string[] {
    const catalog = MODEL_CATALOG[provider];
    return catalog ? catalog.map((m) => m.id) : [];
  }

  /**
   * Get default settings for a provider
   */
  static getDefaultSettings(provider: ModelProvider): ModelSettings {
    return getDefaultSettingsForProvider(provider);
  }

  /**
   * Generate an image via Together AI FLUX models.
   * Resolves the Together API key using the same priority chain as callModel:
   * TOGETHER_API_KEY env var → user key → platform DB key.
   */
  static async generateImage(brief: ImageGenerationBrief, userId?: string): Promise<ImageGenerationResult> {
    const validKey = (k: string | null | undefined): string | null =>
      typeof k === 'string' && k.trim().length > 0 ? k.trim() : null;

    let apiKey: string | null = validKey(process.env.TOGETHER_API_KEY);
    let keySource = 'none';
    if (apiKey) keySource = 'env';

    if (!apiKey && userId) {
      apiKey = validKey(await KipUserKeyService.getUserKey('together-ai', userId));
      if (apiKey) keySource = 'user';
    }

    if (!apiKey) {
      apiKey = validKey(await PlatformApiKeyService.getKeyForProvider('together-ai'));
      if (apiKey) keySource = 'platform';
    }

    console.log(`[ModelProvider] Using ${keySource} key for together-ai (user: ${userId ?? 'none'})`);

    if (!apiKey) {
      throw new Error('Together AI API key not configured. Add TOGETHER_API_KEY to your Railway environment variables.');
    }

    const provider = new TogetherProvider(apiKey);
    return provider.generateImage(brief);
  }

  /**
   * Synthesize speech via ElevenLabs.
   * Resolves the ElevenLabs API key using the same priority chain as callModel:
   * ELEVENLABS_API_KEY env var → user key → platform DB key.
   */
  static async synthesizeVoice(brief: VoiceSynthesisBrief, userId?: string): Promise<VoiceSynthesisResult> {
    let apiKey: string | null = validProviderKey(process.env.ELEVENLABS_API_KEY);
    let keySource = 'none';
    if (apiKey) keySource = 'env';

    if (!apiKey && userId) {
      apiKey = validProviderKey(await KipUserKeyService.getUserKey('elevenlabs', userId));
      if (apiKey) keySource = 'user';
    }

    if (!apiKey) {
      apiKey = validProviderKey(await PlatformApiKeyService.getKeyForProvider('elevenlabs'));
      if (apiKey) keySource = 'platform';
    }

    console.log(`[ModelProvider] Using ${keySource} key for elevenlabs (user: ${userId ?? 'none'})`);

    if (!apiKey) {
      throw new Error(
        'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to your Railway environment variables.',
      );
    }

    return ElevenLabsProvider.synthesize(brief, apiKey);
  }
} 

function normalizeProviderError(provider: ModelProvider, error: unknown): ModelProviderException {
  if (error instanceof ModelProviderException) {
    return error;
  }

  const err = error as any;
  const message = error instanceof Error ? error.message : 'Unknown provider error';
  const providerCode = err?.error?.code || err?.error?.type || err?.code || err?.type;
  const statusMatch = typeof message === 'string' ? message.match(/\b(4\d\d|5\d\d)\b/) : null;
  const statusFromMessage = statusMatch ? Number(statusMatch[1]) : undefined;
  const status = err?.status || err?.response?.status || statusFromMessage;
  const lowerMessage = typeof message === 'string' ? message.toLowerCase() : '';
  const providerLabel = getProviderDisplayName(provider);

  if (
    err?.name === 'AbortError' ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out')
  ) {
    return new ModelProviderException(
      'TIMEOUT',
      `${providerLabel} did not respond before Kip's timeout. Try again in a moment; if it keeps happening, switch Kip to another model or check provider status.`,
      { retryable: true, status }
    );
  }

  // Detect quota / rate-limit errors (HTTP 429 or message containing quota keywords)
  if (
    status === 429 ||
    lowerMessage.includes('quota') ||
    lowerMessage.includes('exceeded your current') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('billing') ||
    providerCode === 'insufficient_quota'
  ) {
    const friendlyMessage =
      'The AI model provider has run out of credits. ' +
      'Please check the API key billing at https://platform.openai.com/account/billing ' +
      'or contact your administrator.';
    console.error(`[ModelProvider] ${provider} quota exceeded:`, message);
    return new ModelProviderException('QUOTA_EXCEEDED', friendlyMessage, { retryable: false, status });
  }

  if (status === 401 || lowerMessage.includes('api key')) {
    return new ModelProviderException('MISSING_API_KEY', message, { retryable: false, status });
  }

  if (providerCode === 'model_not_found' || (lowerMessage.includes('model') && lowerMessage.includes('not'))) {
    return new ModelProviderException('INVALID_MODEL', message, { retryable: false, status });
  }

  if (
    status === 529 ||
    status === 503 ||
    status === 502 ||
    status === 504 ||
    providerCode === 'overloaded_error' ||
    lowerMessage.includes('overloaded') ||
    lowerMessage.includes('temporarily unavailable') ||
    lowerMessage.includes('service unavailable')
  ) {
    return new ModelProviderException(
      'PROVIDER_UNAVAILABLE',
      `${providerLabel} is temporarily overloaded or unavailable. Kip retried the request and the provider still failed. Try again in a moment; if it continues, switch Kip to another model in Cockpit or check provider status.`,
      { retryable: true, status }
    );
  }

  return new ModelProviderException(
    'PROVIDER_UNAVAILABLE',
    `${providerLabel} could not complete Kip's request. Try again shortly; if it continues, switch Kip to another model or check provider status.`,
    { retryable: true, status }
  );
}

function getProviderDisplayName(provider: ModelProvider): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'together':
      return 'Together AI';
    case 'elevenlabs':
      return 'ElevenLabs';
    default:
      return 'The model provider';
  }
}
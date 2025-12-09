/**
 * Model Provider Service
 * ======================
 * 
 * Abstraction layer for AI model providers (OpenAI, Anthropic, Together, ElevenLabs)
 * Handles dynamic provider resolution, retry logic, and unified response format
 */

import { ModelProvider, ModelSettings } from '@keeper/database';
import { KipUserKeyService } from './KipUserKeyService.js';
import { PlatformApiKeyService } from './PlatformApiKeyService.js';

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
}

export type ModelProviderErrorCode = 'MISSING_API_KEY' | 'INVALID_MODEL' | 'PROVIDER_UNAVAILABLE';

class ModelProviderException extends Error {
  code: ModelProviderErrorCode;
  retryable: boolean;

  constructor(code: ModelProviderErrorCode, message: string, options?: { retryable?: boolean }) {
    super(message);
    this.name = 'ModelProviderException';
    this.code = code;
    this.retryable = options?.retryable ?? code === 'PROVIDER_UNAVAILABLE';
  }
}

export interface ModelCallOptions {
  messages: ModelMessage[];
  settings: ModelSettings;
  provider: ModelProvider;
  userId?: string; // Optional user ID for user-scoped API keys
}

const RETRY_TEMPLATE = Object.freeze({
  max_retries: 3,
  retry_delay_ms: 1000
});

const createRetryConfig = () => ({
  ...RETRY_TEMPLATE
});

const PROVIDER_MODEL_CATALOG: Record<ModelProvider, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ],
  together: [
    'meta-llama/Llama-2-70b-chat-hf',
    'meta-llama/Llama-2-13b-chat-hf',
    'meta-llama/Llama-2-7b-chat-hf',
    'mistralai/Mixtral-8x7B-Instruct-v0.1'
  ],
  elevenlabs: [
    'eleven_monolingual_v1',
    'eleven_multilingual_v2',
    'eleven_turbo_v2'
  ]
};

const DEFAULT_SETTINGS_FACTORY: Record<ModelProvider, () => ModelSettings> = {
  openai: () => ({
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 1.0,
    frequency_penalty: 0,
    presence_penalty: 0,
    retry: createRetryConfig()
  }),
  anthropic: () => ({
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    max_tokens: 4000,
    retry: createRetryConfig()
  }),
  together: () => ({
    model: 'meta-llama/Llama-2-70b-chat-hf',
    temperature: 0.7,
    max_tokens: 2000,
    retry: createRetryConfig()
  }),
  elevenlabs: () => ({
    model: 'eleven_multilingual_v2',
    temperature: 0.5,
    max_tokens: 1000,
    retry: createRetryConfig()
  })
};

const createFallbackSettings = (): ModelSettings => ({
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 2000,
  retry: createRetryConfig()
});

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider {
  static async callModel(
    messages: ModelMessage[], 
    settings: ModelSettings, 
    apiKey?: string
  ): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    // Use provided API key or fall back to system key
    const finalApiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!finalApiKey) {
      throw new ModelProviderException('MISSING_API_KEY', 'OpenAI API key is not configured', { retryable: false });
    }

    try {
      // Dynamic import to avoid bundling issues if not installed
      const { OpenAI } = await import('openai');
      
      const openai = new OpenAI({ apiKey: finalApiKey });

      const response = await openai.chat.completions.create({
        model: settings.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        top_p: settings.top_p,
        frequency_penalty: settings.frequency_penalty,
        presence_penalty: settings.presence_penalty,
      });

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
      console.error('OpenAI API error:', error);
      throw normalizeProviderError('openai', error);
    }
  }

  static getMockResponse(messages: ModelMessage[], settings: ModelSettings): Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'> {
    const userMessage = messages.find(m => m.role === 'user')?.content || 'Hello';
    
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
 * Anthropic Provider Implementation (Stubbed)
 */
class AnthropicProvider {
  static async callModel(messages: ModelMessage[], settings: ModelSettings): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    console.log(`[ANTHROPIC STUB] Would call ${settings.model} with ${messages.length} messages`);
    
    // TODO: Implement Anthropic SDK integration
    const userMessage = messages.find(m => m.role === 'user')?.content || 'Hello';
    
    return {
      success: true,
      content: `[MOCK Anthropic Response] I understand you said: "${userMessage}". This is a simulated response from ${settings.model}. The Anthropic integration is planned for future implementation.`,
      usage: {
        prompt_tokens: 45,
        completion_tokens: 95,
        total_tokens: 140
      },
      model: settings.model
    };
  }
}

/**
 * Together AI Provider Implementation (Stubbed)
 */
class TogetherProvider {
  static async callModel(messages: ModelMessage[], settings: ModelSettings): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    console.log(`[TOGETHER STUB] Would call ${settings.model} with ${messages.length} messages`);
    
    // TODO: Implement Together AI SDK integration
    const userMessage = messages.find(m => m.role === 'user')?.content || 'Hello';
    
    return {
      success: true,
      content: `[MOCK Together Response] I understand you said: "${userMessage}". This is a simulated response from ${settings.model}. The Together AI integration is planned for future implementation.`,
      usage: {
        prompt_tokens: 40,
        completion_tokens: 90,
        total_tokens: 130
      },
      model: settings.model
    };
  }
}

/**
 * ElevenLabs Provider Implementation (Stubbed)
 */
class ElevenLabsProvider {
  static async callModel(messages: ModelMessage[], settings: ModelSettings): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    console.log(`[ELEVENLABS STUB] Would call ${settings.model} with ${messages.length} messages`);
    
    // TODO: Implement ElevenLabs SDK integration for voice synthesis
    const userMessage = messages.find(m => m.role === 'user')?.content || 'Hello';
    
    return {
      success: true,
      content: `[MOCK ElevenLabs Response] Voice synthesis would be generated for: "${userMessage}". This would return audio data or transcribed speech using ${settings.model}.`,
      usage: {
        prompt_tokens: 30,
        completion_tokens: 60,
        total_tokens: 90
      },
      model: settings.model
    };
  }
}

/**
 * Main Model Provider Service
 */
export class ModelProviderService {
  // Track last key source for debugging
  private static lastKeySource: { provider: ModelProvider; keySource: string; timestamp: string } | null = null;

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
    
    // Implement key resolution hierarchy: environment key → platform key → user key
    // NEW ORDER: Prefer ENV over DB for long-term reliability
    let apiKey: string | null = null;
    let keySource = 'none';
    
    // When stabilization mode is enabled, force env-only keys for runtime
    if (process.env.STABILIZE_MODE === '1') {
      if (provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || null;
        keySource = apiKey ? 'env' : 'none';
      }
    } else {
      // 1. Try environment key first (highest priority, recommended long-term)
      if (provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || null;
        if (apiKey) {
          keySource = 'env';
        }
      }
      
      // 2. Fall back to user's personal API key if env not set
      if (!apiKey && userId) {
        apiKey = await KipUserKeyService.getUserKey(provider, userId);
        if (apiKey) {
          keySource = 'user';
        }
      }
      
      // 3. Fall back to platform key from DB as last resort
      if (!apiKey) {
        apiKey = await PlatformApiKeyService.getKeyForProvider(provider);
        if (apiKey) {
          keySource = 'platform';
        }
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
    const requiresExplicitKey = provider === 'openai'; // extend as additional providers go live
    if (requiresExplicitKey && !apiKey) {
      const message = userId
        ? `No ${provider} API key is configured for user ${userId}, platform storage, or env`
        : `No ${provider} API key is configured for the platform or environment`;
      return {
        success: false,
        content: '',
        error: message,
        model: settings.model,
        provider,
        retries_used: 0,
        execution_time_ms: Date.now() - startTime,
        errorCode: 'MISSING_API_KEY'
      };
    }
    
    let lastError: ModelProviderException | Error | null = null;
    let attemptsUsed = 0;
    
    for (let attempt = 0; attempt <= retryConfig.max_retries; attempt++) {
      attemptsUsed = attempt;
      try {
        const response = await this.callProviderModel(provider, messages, settings, apiKey);
        
        return {
          ...response,
          provider,
          retries_used: attempt,
          execution_time_ms: Date.now() - startTime
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
    
    // All retries failed - include key source in error for debugging
    const fallbackErrorMessage = lastError
      ? lastError.message
      : 'Unknown model provider error';

    return {
      success: false,
      content: '',
      error: `${fallbackErrorMessage} (key source: ${keySource})`,
      model: settings.model,
      provider,
      retries_used: attemptsUsed,
      execution_time_ms: Date.now() - startTime,
      errorCode: lastError instanceof ModelProviderException ? lastError.code : undefined
    };
  }

  /**
   * Route to the appropriate provider implementation
   */
  private static async callProviderModel(
    provider: ModelProvider, 
    messages: ModelMessage[], 
    settings: ModelSettings,
    apiKey?: string | null
  ): Promise<Omit<ModelResponse, 'provider' | 'retries_used' | 'execution_time_ms'>> {
    switch (provider) {
      case 'openai':
        return OpenAIProvider.callModel(messages, settings, apiKey || undefined);
      case 'anthropic':
        return AnthropicProvider.callModel(messages, settings);
      case 'together':
        return TogetherProvider.callModel(messages, settings);
      case 'elevenlabs':
        return ElevenLabsProvider.callModel(messages, settings);
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
    const catalog = PROVIDER_MODEL_CATALOG[provider];
    return catalog ? [...catalog] : [];
  }

  /**
   * Get default settings for a provider
   */
  static getDefaultSettings(provider: ModelProvider): ModelSettings {
    const factory = DEFAULT_SETTINGS_FACTORY[provider];
    return factory ? factory() : createFallbackSettings();
  }
} 

function normalizeProviderError(provider: ModelProvider, error: unknown): ModelProviderException {
  if (error instanceof ModelProviderException) {
    return error;
  }

  const err = error as any;
  const message = error instanceof Error ? error.message : 'Unknown provider error';
  const providerCode = err?.error?.code || err?.code;
  const status = err?.status || err?.response?.status;
  const lowerMessage = typeof message === 'string' ? message.toLowerCase() : '';

  if (status === 401 || lowerMessage.includes('api key')) {
    return new ModelProviderException('MISSING_API_KEY', message, { retryable: false });
  }

  if (providerCode === 'model_not_found' || (lowerMessage.includes('model') && lowerMessage.includes('not'))) {
    return new ModelProviderException('INVALID_MODEL', message, { retryable: false });
  }

  return new ModelProviderException('PROVIDER_UNAVAILABLE', message, { retryable: true });
}
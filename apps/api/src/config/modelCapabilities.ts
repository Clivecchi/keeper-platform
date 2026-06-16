/**
 * Model Capability Map
 * ====================
 *
 * Authoritative declarations of what each model supports.
 * ModelProviderService consults this map before constructing provider call parameters.
 */

export type ModelCapabilities = {
  jsonMode: boolean;
  functionCalling: boolean;
  vision: boolean;
  streaming: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
};

export type ModelCapabilityProviderEntry = {
  [modelId: string]: ModelCapabilities;
  _default: ModelCapabilities;
};

export type ModelCapabilityMap = {
  [provider: string]: ModelCapabilityProviderEntry;
};

const SAFE_UNKNOWN_PROVIDER_DEFAULT: ModelCapabilities = {
  jsonMode: false,
  functionCalling: false,
  vision: false,
  streaming: true,
  maxContextTokens: 4096,
  maxOutputTokens: 1024,
};

const ANTHROPIC_DEFAULT: ModelCapabilities = {
  jsonMode: false,
  functionCalling: true,
  vision: true,
  streaming: true,
  maxContextTokens: 200_000,
  maxOutputTokens: 8192,
};

const OPENAI_DEFAULT: ModelCapabilities = {
  jsonMode: false,
  functionCalling: true,
  vision: false,
  streaming: true,
  maxContextTokens: 8192,
  maxOutputTokens: 4096,
};

const TOGETHER_DEFAULT: ModelCapabilities = {
  jsonMode: false,
  functionCalling: false,
  vision: false,
  streaming: true,
  maxContextTokens: 8192,
  maxOutputTokens: 2048,
};

const ELEVENLABS_DEFAULT: ModelCapabilities = {
  jsonMode: false,
  functionCalling: false,
  vision: false,
  streaming: false,
  maxContextTokens: 0,
  maxOutputTokens: 0,
};

export const MODEL_CAPABILITY_MAP: ModelCapabilityMap = {
  anthropic: {
    'claude-opus-4-6': { ...ANTHROPIC_DEFAULT },
    'claude-sonnet-4-6': { ...ANTHROPIC_DEFAULT },
    'claude-haiku-4-5': { ...ANTHROPIC_DEFAULT },
    'claude-3-5-sonnet-20241022': { ...ANTHROPIC_DEFAULT },
    'claude-3-5-haiku-20241022': { ...ANTHROPIC_DEFAULT },
    'claude-3-opus-20240229': { ...ANTHROPIC_DEFAULT },
    'claude-3-sonnet-20240229': { ...ANTHROPIC_DEFAULT },
    'claude-3-haiku-20240307': { ...ANTHROPIC_DEFAULT },
    _default: ANTHROPIC_DEFAULT,
  },
  openai: {
    'gpt-4o': {
      jsonMode: true,
      functionCalling: true,
      vision: true,
      streaming: true,
      maxContextTokens: 128_000,
      maxOutputTokens: 16_384,
    },
    'gpt-4o-mini': {
      jsonMode: true,
      functionCalling: true,
      vision: true,
      streaming: true,
      maxContextTokens: 128_000,
      maxOutputTokens: 16_384,
    },
    'gpt-4-turbo': {
      jsonMode: true,
      functionCalling: true,
      vision: true,
      streaming: true,
      maxContextTokens: 128_000,
      maxOutputTokens: 4096,
    },
    'gpt-4': {
      jsonMode: false,
      functionCalling: true,
      vision: false,
      streaming: true,
      maxContextTokens: 8192,
      maxOutputTokens: 8192,
    },
    'gpt-3.5-turbo': {
      jsonMode: false,
      functionCalling: true,
      vision: false,
      streaming: true,
      maxContextTokens: 16_385,
      maxOutputTokens: 4096,
    },
    _default: OPENAI_DEFAULT,
  },
  'together-ai': {
    'meta-llama/Llama-2-70b-chat-hf': { ...TOGETHER_DEFAULT },
    'meta-llama/Llama-2-13b-chat-hf': { ...TOGETHER_DEFAULT },
    'meta-llama/Llama-2-7b-chat-hf': { ...TOGETHER_DEFAULT },
    'mistralai/Mixtral-8x7B-Instruct-v0.1': { ...TOGETHER_DEFAULT },
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': {
      jsonMode: true,
      functionCalling: false,
      vision: false,
      streaming: true,
      maxContextTokens: 8192,
      maxOutputTokens: 4096,
    },
    'black-forest-labs/FLUX.1-schnell': { ...TOGETHER_DEFAULT },
    'black-forest-labs/FLUX.1-dev': { ...TOGETHER_DEFAULT },
    _default: TOGETHER_DEFAULT,
  },
  elevenlabs: {
    eleven_monolingual_v1: { ...ELEVENLABS_DEFAULT },
    eleven_multilingual_v2: { ...ELEVENLABS_DEFAULT },
    eleven_turbo_v2: { ...ELEVENLABS_DEFAULT },
    _default: ELEVENLABS_DEFAULT,
  },
};

/**
 * Returns capabilities for a provider/model pair.
 * Falls back to provider _default, then safe all-false default. Never throws.
 */
export function getModelCapabilities(provider: string, modelId: string): ModelCapabilities {
  const providerEntry = MODEL_CAPABILITY_MAP[provider];
  if (!providerEntry) {
    return { ...SAFE_UNKNOWN_PROVIDER_DEFAULT };
  }

  const modelEntry = providerEntry[modelId];
  if (modelEntry && modelId !== '_default') {
    return { ...modelEntry };
  }

  return { ...providerEntry._default };
}

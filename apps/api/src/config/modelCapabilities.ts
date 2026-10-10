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
  /**
   * When false, do not send `temperature`. Claude Sonnet 5 rejects it with HTTP 400.
   * GPT-6 chat models ignore or reject sampling. Omitted means the provider still accepts it.
   */
  acceptsTemperature?: boolean;
  /**
   * Chat Completions output cap. GPT-6 and other reasoning models require
   * `max_completion_tokens`. Omitted means `max_tokens`.
   */
  completionTokenParam?: 'max_tokens' | 'max_completion_tokens';
  /**
   * Sent as `reasoning_effort` when set. GPT-6.1 Sol cannot use `none`.
   * Luna can. Omitted means the provider default (medium on GPT-6, which can
   * spend a small token budget before any reply is written).
   */
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Floor for the output cap so reasoning cannot consume the whole reply. */
  minCompletionTokens?: number;
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

/** Unknown GPT-5+ / o-series ids. Do not send classic sampling or `max_tokens`. */
const OPENAI_REASONING_SAFE: ModelCapabilities = {
  jsonMode: true,
  functionCalling: true,
  vision: true,
  streaming: true,
  maxContextTokens: 1_050_000,
  maxOutputTokens: 128_000,
  acceptsTemperature: false,
  completionTokenParam: 'max_completion_tokens',
  reasoningEffort: 'low',
  minCompletionTokens: 16_000,
};

const GPT6_SOL: ModelCapabilities = {
  jsonMode: true,
  functionCalling: true,
  vision: true,
  streaming: true,
  maxContextTokens: 1_050_000,
  maxOutputTokens: 128_000,
  acceptsTemperature: false,
  completionTokenParam: 'max_completion_tokens',
  reasoningEffort: 'low',
  minCompletionTokens: 16_000,
};

const GPT6_LUNA: ModelCapabilities = {
  ...GPT6_SOL,
  reasoningEffort: 'none',
  minCompletionTokens: 2_000,
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

const TYPESAFE_DEFAULT: ModelCapabilities = {
  jsonMode: true,
  functionCalling: false,
  vision: false,
  streaming: false,
  maxContextTokens: 64_000,
  maxOutputTokens: 1024,
};

export const MODEL_CAPABILITY_MAP: ModelCapabilityMap = {
  anthropic: {
    'claude-opus-4-6': { ...ANTHROPIC_DEFAULT },
    'claude-sonnet-5': {
      ...ANTHROPIC_DEFAULT,
      maxContextTokens: 1_000_000,
      maxOutputTokens: 128_000,
      acceptsTemperature: false,
    },
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
    'gpt-6.1-sol': GPT6_SOL,
    'gpt-6-luna': GPT6_LUNA,
    'gpt-6-astra': GPT6_SOL,
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
  typesafe: {
    'jev-latest': { ...TYPESAFE_DEFAULT },
    'jev-1.13.0': { ...TYPESAFE_DEFAULT },
    'jev-preview': { ...TYPESAFE_DEFAULT },
    _default: TYPESAFE_DEFAULT,
  },
};

/**
 * Claude Sonnet 5 rejects sampling temperature. Older Claude models still accept it.
 * Omitted capability means the provider still accepts temperature.
 */
export function modelAcceptsTemperature(provider: string, modelId: string): boolean {
  return getModelCapabilities(provider, modelId).acceptsTemperature !== false;
}

function looksLikeOpenAIReasoningModel(modelId: string): boolean {
  return /^(gpt-[5-9](?:\.\d+)?|o\d)/.test(modelId);
}

export type OpenAIChatSampling = {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
};

/** Chat Completions body. Omits sampling and `max_tokens` when the model rejects them. */
export function buildOpenAIChatParams(args: {
  model: string;
  messages: unknown;
  sampling: OpenAIChatSampling;
  jsonMode?: boolean;
  stream?: boolean;
}): Record<string, unknown> {
  const caps = getModelCapabilities('openai', args.model);
  const requested = args.sampling.max_tokens ?? caps.maxOutputTokens;
  const budget = Math.max(requested, caps.minCompletionTokens ?? 0);
  const params: Record<string, unknown> = {
    model: args.model,
    messages: args.messages,
  };
  if (caps.completionTokenParam === 'max_completion_tokens') {
    params.max_completion_tokens = budget;
  } else {
    params.max_tokens = budget;
  }
  if (caps.acceptsTemperature !== false) {
    if (args.sampling.temperature != null) params.temperature = args.sampling.temperature;
    if (args.sampling.top_p != null) params.top_p = args.sampling.top_p;
    if (args.sampling.frequency_penalty != null) params.frequency_penalty = args.sampling.frequency_penalty;
    if (args.sampling.presence_penalty != null) params.presence_penalty = args.sampling.presence_penalty;
  }
  if (caps.reasoningEffort) params.reasoning_effort = caps.reasoningEffort;
  if (args.jsonMode && caps.jsonMode) params.response_format = { type: 'json_object' };
  if (args.stream) params.stream = true;
  return params;
}

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

  if (provider === 'openai' && looksLikeOpenAIReasoningModel(modelId)) {
    return { ...OPENAI_REASONING_SAFE };
  }

  return { ...providerEntry._default };
}

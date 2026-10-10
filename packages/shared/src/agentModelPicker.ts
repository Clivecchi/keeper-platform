/**
 * Agent chat picker.
 *
 * One list for Chronicle Config and Cockpit. Edit this file when a chat model
 * should be offered. OpenAI and Anthropic have no live catalog. Together's
 * live catalog is large and changes often — it stays on the Together
 * integration, and is not this menu.
 *
 * Picture generation (FLUX) is not an agent chat model.
 */

export const AGENT_CHAT_PROVIDERS = ['openai', 'anthropic', 'together-ai'] as const;

export type AgentChatProvider = (typeof AGENT_CHAT_PROVIDERS)[number];

export type AgentChatModel = {
  id: string;
  label: string;
  provider: AgentChatProvider;
};

export const AGENT_CHAT_MODELS: readonly AgentChatModel[] = [
  { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', provider: 'openai' },
  { id: 'gpt-6-luna', label: 'GPT-6 Luna', provider: 'openai' },
  { id: 'gpt-6-astra', label: 'GPT-6 Astra', provider: 'openai' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    label: 'Llama 3.3 70B',
    provider: 'together-ai',
  },
];

export const AGENT_CHAT_DEFAULTS: Record<AgentChatProvider, string> = {
  openai: 'gpt-6.1-sol',
  anthropic: 'claude-sonnet-5',
  'together-ai': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
};

/**
 * Chat ids Keeper used to store. OpenAI still lists some of them, and they are
 * no longer offered in Cockpit. Execution substitutes the current chat model.
 * Mini and 3.5 land on Luna. The rest land on Sol.
 */
const RETIRED_OPENAI_CHAT: Record<string, string> = {
  'gpt-4o': 'gpt-6.1-sol',
  'gpt-4o-2024-05-13': 'gpt-6.1-sol',
  'gpt-4o-2024-08-06': 'gpt-6.1-sol',
  'gpt-4o-2024-11-20': 'gpt-6.1-sol',
  'chatgpt-4o-latest': 'gpt-6.1-sol',
  'gpt-4-turbo': 'gpt-6.1-sol',
  'gpt-4-turbo-2024-04-09': 'gpt-6.1-sol',
  'gpt-4': 'gpt-6.1-sol',
  'gpt-4-0613': 'gpt-6.1-sol',
  'gpt-4o-mini': 'gpt-6-luna',
  'gpt-3.5-turbo': 'gpt-6-luna',
};

export function retiredOpenAIChatReplacement(modelId: string): string | null {
  const trimmed = modelId.trim();
  return RETIRED_OPENAI_CHAT[trimmed] ?? null;
}

/** Model id the chat menu can actually select for this provider. */
export function selectableAgentChatModel(provider: string, modelId: string): string {
  const trimmed = modelId.trim();
  if (isAgentChatProvider(provider) && agentChatModelsFor(provider).some((model) => model.id === trimmed)) {
    return trimmed;
  }
  return retiredOpenAIChatReplacement(trimmed) ?? agentChatDefaultFor(provider) ?? trimmed;
}

export const AGENT_CHAT_PROVIDER_LABELS: Record<AgentChatProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  'together-ai': 'Together AI',
};

export function isAgentChatProvider(provider: string): provider is AgentChatProvider {
  return (AGENT_CHAT_PROVIDERS as readonly string[]).includes(provider);
}

export function agentChatModelsFor(provider: string): AgentChatModel[] {
  if (!isAgentChatProvider(provider)) return [];
  return AGENT_CHAT_MODELS.filter((model) => model.provider === provider);
}

export function agentChatDefaultFor(provider: string): string | null {
  if (!isAgentChatProvider(provider)) return null;
  return AGENT_CHAT_DEFAULTS[provider];
}

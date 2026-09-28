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
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    label: 'Llama 3.3 70B',
    provider: 'together-ai',
  },
];

export const AGENT_CHAT_DEFAULTS: Record<AgentChatProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-5',
  'together-ai': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
};

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

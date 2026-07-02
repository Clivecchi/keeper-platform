import { DOMAIN_FRAME_FALLBACK } from './domainFrameFallback.js';

export interface BuildInitialDomainFrameInput {
  name: string;
  slug: string;
  description?: string | null;
  leadAgentSlug: string;
}

/** Personal domain frame_json — domain wordmark, not platform KE3P defaults. */
export function buildInitialDomainFrameJson(input: BuildInitialDomainFrameInput): Record<string, unknown> {
  const domainName = input.name.trim();
  const tagline = input.description?.trim() || '';
  const greeting = tagline
    ? `Welcome to ${domainName}. ${tagline}`
    : `Welcome to ${domainName}. What would you like to keep here?`;

  const base = DOMAIN_FRAME_FALLBACK as Record<string, unknown>;
  const baseTheme = (base.theme ?? {}) as Record<string, unknown>;
  const baseKip = (base.kip ?? {}) as Record<string, unknown>;
  const baseCover = (base.cover ?? {}) as Record<string, unknown>;
  const baseCard = ((baseCover.card ?? {}) as Record<string, unknown>);
  const baseInteractionBar = (base.interaction_bar ?? {}) as Record<string, unknown>;
  const baseInteractionLabels = ((baseInteractionBar.labels ?? {}) as Record<string, string>);
  const baseAgentBoard = (base.agent_board ?? {}) as Record<string, unknown>;
  const baseAgentMessaging = ((baseAgentBoard.messaging ?? {}) as Record<string, unknown>);
  const baseDialogue = ((baseAgentMessaging.dialogue ?? {}) as Record<string, string>);

  return {
    ...base,
    domain: input.slug,
    keeper_type: 'domain',
    theme: {
      ...baseTheme,
      wordmark: domainName,
      tagline,
    },
    kip: {
      ...baseKip,
      agent_id: input.leadAgentSlug,
      greeting,
    },
    cover: {
      ...baseCover,
      card: {
        ...baseCard,
        tagLine: tagline || undefined,
      },
    },
    kip_context: {
      guest: `A guest visiting ${domainName}. Warm welcome. Orient to what this domain keeps.`,
      keeper: `An authenticated keeper in ${domainName}. Orient to journeys, moments, and domain purpose.`,
      admin: `Domain admin for ${domainName}. Full configuration and governance context available.`,
    },
    interaction_bar: {
      ...baseInteractionBar,
      labels: {
        ...baseInteractionLabels,
        kip: domainName,
      },
    },
    agent_board: {
      ...baseAgentBoard,
      messaging: {
        ...baseAgentMessaging,
        signin: {
          title: domainName,
          subtitle: `Sign in to chat in ${domainName}`,
          body: `Sign in to continue in ${domainName}.`,
        },
        empty_states: {
          start_conversation: `Start a conversation in ${domainName}.`,
        },
        dialogue: {
          ...baseDialogue,
          start_prompt: `Say hello to {agent_name} to start the conversation.`,
          thinking: '{agent_name} is thinking…',
        },
      },
    },
    arrival: {
      completed: false,
    },
  };
}

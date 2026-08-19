/**
 * Domain lead collaboration prompt — role-aware Lead vs Cast.
 *
 * Domain lead = declared Lead on the domain roster (typically settings.primaryAgentId),
 * never a Dialog Cast guest. Cast membership must not demote Kip or promote a guest.
 */

export const PLATFORM_DIALOG_AGENT_SLUGS = new Set(['kip', 'cloud', 'rendr']);

export type DomainLeadCollaborationRosterEntry = {
  slug: string;
  name: string;
  role?: string | null;
};

/**
 * Resolve the domain lead from the dialog roster.
 * Prefers role === 'Lead' among non-platform agents (roster order: primary first).
 * Never selects role === 'Cast' (or any non-Lead classification).
 */
export function resolveDomainLeadFromRoster(
  domainAgents: DomainLeadCollaborationRosterEntry[],
): DomainLeadCollaborationRosterEntry | null {
  if (!Array.isArray(domainAgents) || domainAgents.length === 0) return null;

  const domainLead = domainAgents.find((entry) => {
    const slug = entry.slug?.trim().toLowerCase();
    if (!slug || PLATFORM_DIALOG_AGENT_SLUGS.has(slug)) return false;
    return entry.role?.trim().toLowerCase() === 'lead';
  });

  return domainLead?.slug ? domainLead : null;
}

/**
 * When a non-Kip domain lead is present, instruct Kip as platform support and
 * the lead as dialog owner. Returns null when Kip is (or remains) the lead —
 * including when only Cast guests are present alongside Kip.
 */
export function buildDomainLeadCollaborationPrompt(
  agent: { slug?: string | null; name?: string | null },
  environment: unknown,
): string | null {
  const domainAgents = (
    environment as {
      domainAgents?: DomainLeadCollaborationRosterEntry[];
    }
  )?.domainAgents;
  if (!Array.isArray(domainAgents) || domainAgents.length === 0) return null;

  const domainLead = resolveDomainLeadFromRoster(domainAgents);
  if (!domainLead?.slug) return null;

  const agentSlug = agent.slug?.trim().toLowerCase() ?? '';
  const agentName = agent.name?.trim() || 'Agent';
  const leadName = domainLead.name?.trim() || domainLead.slug;
  const leadSlug = domainLead.slug.trim().toLowerCase();

  if (agentSlug === 'kip') {
    return [
      'DOMAIN DIALOG ROLE — PLATFORM SUPPORT (not lead):',
      `You are ${agentName}, Keeper platform support on this domain.`,
      `The domain lead agent is ${leadName} [slug: ${leadSlug}] — they own the dialog voice here.`,
      `Do NOT identify yourself as "the Lead Agent" or "the Keeper Platform's Lead Agent" in this domain.`,
      `Do NOT take the lead or answer as if you were ${leadName}.`,
      `When the user asks who is speaking, name yourself as ${agentName} (platform support) and name ${leadName} as the domain lead.`,
      `Defer domain relationship and strategy voice to ${leadName}. Do NOT defer platform construction.`,
      `When the user asks to launch, build, or present a surface, use your tools in this same turn (draft.create, journey.create, moment.create).`,
      `Do not offer help you are not delivering now. Do not say you are available later.`,
    ].join('\n');
  }

  if (agentSlug === leadSlug) {
    return [
      'DOMAIN DIALOG ROLE — LEAD AGENT:',
      `You are ${leadName}, the domain lead agent. You speak first and own this dialog.`,
      `Kip [slug: kip] is Keeper platform support — they build platform surfaces and add infrastructure context; they do not replace your voice.`,
      `When the user asks to launch or build a surface tonight, do not only ask clarifying questions or promise later work. Name the thing, then let Kip construct it with tools — or create the draft/journey yourself if you can.`,
      `Speak as ${leadName} only. Never introduce yourself as Kip or as the generic Keeper Platform Lead Agent.`,
    ].join('\n');
  }

  return null;
}

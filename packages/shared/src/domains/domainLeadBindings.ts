/**
 * Canonical domain → lead agent slug bindings.
 * Synthetic `{slug}-lead` frame placeholders are repaired to these slugs.
 */
export const CANONICAL_DOMAIN_LEAD_BINDINGS: Readonly<Record<string, string>> = {
  "chuck-livecchi": "ceox",
  ke3p: "kip",
  default: "kip",
} as const

export const PLACEHOLDER_FRAME_AGENT_IDS = new Set<string>(["kip-default", ""])

/** Provision placeholder or empty frame agent_id — not a real lead. */
export function isSyntheticLeadAgentSlug(slug: string | null | undefined): boolean {
  const trimmed = slug?.trim().toLowerCase() ?? ""
  if (!trimmed || PLACEHOLDER_FRAME_AGENT_IDS.has(trimmed)) return true
  return trimmed.endsWith("-lead")
}

export function resolveCanonicalLeadAgentSlug(
  domainSlug: string,
  frameAgentId: string | null | undefined,
): string | null {
  const normalizedDomain = domainSlug.trim().toLowerCase()
  const canonical = CANONICAL_DOMAIN_LEAD_BINDINGS[normalizedDomain]
  if (canonical) return canonical

  const trimmedFrame = frameAgentId?.trim() ?? ""
  if (!trimmedFrame || isSyntheticLeadAgentSlug(trimmedFrame)) return null
  return trimmedFrame
}

/** Human-facing agent star name on Playbill — never the domain name. */
export function resolvePlaybillStarName(input: {
  domainName: string
  agentDisplayName: string | null | undefined
  isUncast: boolean
  isLoading: boolean
}): string {
  if (input.isLoading && !input.isUncast) return "…"
  if (input.isUncast) return "Agent"

  const name = input.agentDisplayName?.trim() ?? ""
  if (!name) return "Agent"

  const domainLower = input.domainName.trim().toLowerCase()
  if (name.toLowerCase() === domainLower) return "Agent"
  if (isSyntheticLeadAgentSlug(name)) return "Agent"
  if (name.toLowerCase().endsWith(" lead") && name.includes("-")) return "Agent"

  return name
}

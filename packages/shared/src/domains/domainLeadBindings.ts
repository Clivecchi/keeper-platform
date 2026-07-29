/**
 * Platform provisioning placeholders — not used for identity resolution.
 * Identity: settings.primaryAgentId → kip_agents. frame_json.kip.agent_id is a mirror only.
 */
export const PLACEHOLDER_FRAME_AGENT_IDS = new Set<string>(["kip-default", ""])

/** Provision placeholder or empty frame agent_id — mirror stale; never authoritative alone. */
export function isSyntheticLeadAgentSlug(slug: string | null | undefined): boolean {
  const trimmed = slug?.trim().toLowerCase() ?? ""
  if (!trimmed || PLACEHOLDER_FRAME_AGENT_IDS.has(trimmed)) return true
  return trimmed.endsWith("-lead")
}

export function readPrimaryAgentIdFromSettings(
  settings: unknown,
): string | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null
  const raw = (settings as Record<string, unknown>).primaryAgentId
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

/**
 * Sync read helper when API has already resolved lead from DB.
 * Never uses per-domain slug maps — only enriched DB fields.
 */
export function resolveDomainLeadAgentSlugSync(input: {
  primaryAgentSlug?: string | null
}): string | null {
  const dbSlug = input.primaryAgentSlug?.trim()
  return dbSlug || null
}

/** Human-facing agent star name on Playbill — never the domain name. */
export function resolvePlaybillStarName(input: {
  domainName: string
  agentDisplayName: string | null | undefined
  isUncast: boolean
  isLoading: boolean
}): string {
  const name = input.agentDisplayName?.trim() ?? ""
  // Only show ellipsis when we truly have nothing to paint yet.
  if (input.isLoading && !input.isUncast && !name) return "…"
  if (input.isUncast) return "Agent"

  if (!name) return "Agent"

  const domainLower = input.domainName.trim().toLowerCase()
  if (name.toLowerCase() === domainLower) return "Agent"
  if (name.toLowerCase().endsWith(" lead") && name.includes("-")) return "Agent"

  return name
}

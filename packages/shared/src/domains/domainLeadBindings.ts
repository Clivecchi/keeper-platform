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

/**
 * True when `name` is a short prefix of `host` — e.g. "Liv" vs "livecchi.biz".
 * That clip is not a domain identity; Playbill should use the host.
 */
export function nameLooksLikeHostClip(name: string, host: string): boolean {
  const n = name.trim().toLowerCase()
  const h = host.trim().toLowerCase()
  if (!n || !h || n === h) return false
  return h.startsWith(n) && n.length <= 4 && h.length >= n.length + 3
}

/** Public Playbill billing label — never a three-letter clip of the slug. */
export function resolvePlaybillDomainLabel(input: {
  domainName: string
  domainSlug: string
}): string {
  const name = input.domainName.trim()
  const slug = input.domainSlug.trim()
  if (nameLooksLikeHostClip(name, slug)) return slug
  return name || slug
}

function isPlaceholderPlaybillAgentName(
  agentName: string,
  domainName: string,
  domainLabel: string,
): boolean {
  const name = agentName.trim()
  if (!name) return true
  const lower = name.toLowerCase()
  if (lower === domainLabel.toLowerCase()) return true
  if (lower === domainName.trim().toLowerCase()) return true
  if (lower.endsWith(" lead") && name.includes("-")) return true
  if (nameLooksLikeHostClip(name, domainLabel)) return true
  return false
}

/**
 * Human-facing Playbill star. A real, distinct lead keeps the marquee.
 * Uncast / provisioned / name-equals-domain falls back to the domain label —
 * never the generic word "Agent".
 */
export function resolvePlaybillStarName(input: {
  domainName: string
  domainSlug?: string
  agentDisplayName: string | null | undefined
  isUncast: boolean
  isLoading: boolean
}): string {
  const domainLabel = resolvePlaybillDomainLabel({
    domainName: input.domainName,
    domainSlug: input.domainSlug?.trim() || input.domainName,
  })
  const name = input.agentDisplayName?.trim() ?? ""
  // Only show ellipsis when we truly have nothing to paint yet.
  if (input.isLoading && !input.isUncast && !name) return "…"

  if (
    input.isUncast ||
    isPlaceholderPlaybillAgentName(name, input.domainName, domainLabel)
  ) {
    return domainLabel || "Domain"
  }

  return name
}

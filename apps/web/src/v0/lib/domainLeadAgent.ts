import { resolveDomainLeadAgentSlugSync } from "@keeper/shared"

/** Authoritative lead fields from GET /api/domains/by-slug or /my enrichment. */
export interface DomainLeadRecord {
  leadAgentId?: string | null
  leadAgentSlug?: string | null
  leadAgentName?: string | null
}

export interface ResolvedDomainLeadContext {
  id: string | null
  slug: string | null
  name: string | null
  isUncast: boolean
}

/**
 * Single web read path for domain lead identity.
 * Uses API-enriched DB fields only — never frame_json alone.
 */
export function resolveDomainLeadContext(
  domainRecord?: DomainLeadRecord | null,
): ResolvedDomainLeadContext {
  const slug = resolveDomainLeadAgentSlugSync({
    primaryAgentSlug: domainRecord?.leadAgentSlug,
  })
  const id =
    typeof domainRecord?.leadAgentId === "string" ? domainRecord.leadAgentId.trim() : null
  const name =
    typeof domainRecord?.leadAgentName === "string" ? domainRecord.leadAgentName.trim() : null

  if (!slug) {
    return { id, slug: null, name: name || null, isUncast: true }
  }

  return {
    id,
    slug,
    name: name || null,
    isUncast: false,
  }
}

/** Dialog bootstrap slug — platform kip when uncast. */
export function resolveDialogLeadSlug(
  domainRecord?: DomainLeadRecord | null,
  fallbackSlug = "kip",
): string {
  return resolveDomainLeadContext(domainRecord).slug ?? fallbackSlug
}

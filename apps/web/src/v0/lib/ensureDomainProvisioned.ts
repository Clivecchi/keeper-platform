import { apiFetch } from "../../lib/api"

const sessionOkKey = (domainId: string) => `keeper:provision-ok:${domainId}`

export interface EnsureDomainProvisionedResult {
  provisioned: boolean
  leadAgentSlug?: string | null
}

/**
 * Idempotent repair for domains created before Step 1.2 seeding.
 * Seeds frame_json, domain lead agent, keeper, primaryDomainId, home board.
 */
export async function ensureDomainProvisioned(
  domainId: string,
): Promise<EnsureDomainProvisionedResult> {
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(sessionOkKey(domainId))) {
    return { provisioned: false }
  }

  try {
    const res = (await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/provision`, {
      method: "POST",
    })) as {
      domain?: unknown
      provision?: { leadAgentSlug?: string | null }
    }

    if (!res?.domain) {
      return { provisioned: false }
    }

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(sessionOkKey(domainId), "1")
    }

    return {
      provisioned: true,
      leadAgentSlug: res.provision?.leadAgentSlug ?? null,
    }
  } catch (error) {
    console.warn("[ensureDomainProvisioned] failed:", error)
    return { provisioned: false }
  }
}

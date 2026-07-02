import { apiFetch } from "../../lib/api"

const sessionOkKey = (domainId: string) => `keeper:provision-ok:${domainId}`

export interface EnsureDomainProvisionedResult {
  provisioned: boolean
  frameWritten?: boolean
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
      provision?: { leadAgentSlug?: string | null; frameWritten?: boolean }
    }

    if (!res?.domain) {
      return { provisioned: false }
    }

    const frameWritten = res.provision?.frameWritten === true

    return {
      provisioned: true,
      frameWritten,
      leadAgentSlug: res.provision?.leadAgentSlug ?? null,
    }
  } catch (error) {
    console.warn("[ensureDomainProvisioned] failed:", error)
    return { provisioned: false }
  }
}

export function markDomainProvisionSessionOk(domainId: string): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(sessionOkKey(domainId), "1")
}

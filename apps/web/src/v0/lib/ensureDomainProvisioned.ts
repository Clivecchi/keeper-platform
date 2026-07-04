import { apiFetch } from "../../lib/api"

const sessionOkKey = (domainId: string) => `keeper:provision-ok:${domainId}`
const PROVISION_COOLDOWN_MS = 5 * 60 * 1000
const lastProvisionAttempt = new Map<string, number>()

export interface EnsureDomainProvisionedResult {
  provisioned: boolean
  frameWritten?: boolean
  leadAgentSlug?: string | null
}

export function clearDomainProvisionSessionOk(domainId: string): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.removeItem(sessionOkKey(domainId))
  lastProvisionAttempt.delete(domainId)
}

/**
 * Idempotent repair for domains created before Step 1.2 seeding.
 * Seeds frame_json, domain lead agent, keeper, primaryDomainId, home board.
 */
export async function ensureDomainProvisioned(
  domainId: string,
  options?: { force?: boolean },
): Promise<EnsureDomainProvisionedResult> {
  const now = Date.now()
  const lastAttempt = lastProvisionAttempt.get(domainId) ?? 0
  if (!options?.force && now - lastAttempt < PROVISION_COOLDOWN_MS) {
    return { provisioned: false }
  }

  lastProvisionAttempt.set(domainId, now)

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

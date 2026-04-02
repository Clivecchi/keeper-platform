/**
 * Guest Cover companion → login handoff: issue Key after first persisted turn,
 * redeem after auth. localStorage holds only the Key id until redemption.
 */

import { apiFetch } from "./api"
import { getApiBase } from "./apiFetch"

const HANDOFF_KEY_ID = "keeper.kip.handoffKeyId"
const HANDOFF_NOTICE = "keeper.kip.handoffNotice"

export async function issueGuestHandoffKey(domainId: string, sessionId: string): Promise<void> {
  if (typeof window === "undefined") return
  if (!domainId || !sessionId) return
  if (localStorage.getItem(HANDOFF_KEY_ID)) return

  try {
    const base = getApiBase()
    const res = await fetch(`${base}/api/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain_id: domainId, session_id: sessionId }),
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      key?: { id?: string }
    } | null
    if (res.ok && data?.success && data.key?.id) {
      localStorage.setItem(HANDOFF_KEY_ID, data.key.id)
    }
  } catch {
    /* silent — companion still works */
  }
}

/** Call after successful login/register once auth token is stored. */
export async function redeemGuestHandoffKeyIfPresent(): Promise<boolean> {
  if (typeof window === "undefined") return false
  const keyId = localStorage.getItem(HANDOFF_KEY_ID)
  if (!keyId) return false

  try {
    const res = (await apiFetch(`/api/keys/${encodeURIComponent(keyId)}/redeem`, {
      method: "POST",
    })) as { success?: boolean }
    localStorage.removeItem(HANDOFF_KEY_ID)
    if (res?.success) {
      sessionStorage.setItem(HANDOFF_NOTICE, "1")
      return true
    }
  } catch {
    localStorage.removeItem(HANDOFF_KEY_ID)
  }
  return false
}

const SESSION_KEY = "keeper:playbill-greet.v1"
const GREET_TTL_MS = 5 * 60 * 1000

export interface PlaybillGreetSeal {
  domainSlug: string
  leadAgentSlug: string | null
  sealedAt: number
}

function readSeal(): PlaybillGreetSeal | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PlaybillGreetSeal
    if (!parsed?.domainSlug || typeof parsed.sealedAt !== "number") return null
    if (Date.now() - parsed.sealedAt > GREET_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Seal the innkeeper chosen on the Playbill wall for greet continuity on arrival. */
export function sealPlaybillGreet(domainSlug: string, leadAgentSlug: string | null): void {
  if (typeof sessionStorage === "undefined") return
  const normalized = domainSlug.trim().toLowerCase()
  if (!normalized) return
  try {
    const payload: PlaybillGreetSeal = {
      domainSlug: normalized,
      leadAgentSlug: leadAgentSlug?.trim() || null,
      sealedAt: Date.now(),
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

/**
 * Read a fresh Playbill greet seal for the landing domain (non-destructive).
 * Returns `undefined` when no seal applies; `null` when the domain lead is uncast (Agent).
 */
export function getPlaybillGreet(domainSlug: string): string | null | undefined {
  const normalized = domainSlug.trim().toLowerCase()
  if (!normalized) return undefined
  const seal = readSeal()
  if (!seal || seal.domainSlug !== normalized) return undefined
  return seal.leadAgentSlug
}

/** Clear greet seal after frame confirms the same lead agent. */
export function clearPlaybillGreet(): void {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** @deprecated Use getPlaybillGreet — kept for transitional imports. */
export function consumePlaybillGreet(domainSlug: string): string | null | undefined {
  return getPlaybillGreet(domainSlug)
}

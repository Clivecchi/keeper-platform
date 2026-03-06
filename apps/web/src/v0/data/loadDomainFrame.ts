/**
 * loadDomainFrame
 *
 * Loads the domain frame JSON object for the given domain slug.
 * Fetches from GET /api/domains/:slug/frame (database-driven, per-domain).
 * Falls back to the static default if the fetch fails.
 *
 * Returns a Promise — call-sites required no changes (already async).
 */

import type { DomainFrameJson } from "./domain-frame.types"
import { getApiBase } from "../../lib/apiFetch"

export async function loadDomainFrame(domainSlug: string): Promise<DomainFrameJson> {
  try {
    const base = getApiBase()
    const response = await fetch(`${base}/api/domains/${domainSlug}/frame`)
    if (!response.ok) {
      console.warn(`[DomainFrame] API fetch failed (${response.status}), falling back to static default`)
      const { DEFAULT_DOMAIN_FRAME } = await import("./domain-frame.default")
      return DEFAULT_DOMAIN_FRAME
    }
    const frame = await response.json() as DomainFrameJson
    console.log(`[DomainFrame] Loaded for domain: ${domainSlug}`)
    return frame
  } catch (err) {
    console.warn("[DomainFrame] Fetch error, falling back to static default", err)
    const { DEFAULT_DOMAIN_FRAME } = await import("./domain-frame.default")
    return DEFAULT_DOMAIN_FRAME
  }
}

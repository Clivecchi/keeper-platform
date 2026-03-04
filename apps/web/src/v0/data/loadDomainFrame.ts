/**
 * loadDomainFrame
 *
 * Loads the domain frame JSON object for the given domain slug.
 *
 * Current implementation: returns the static default for all slugs.
 * Migration path: swap the body for an API call to /api/domains/:slug/frame
 * after the six-step build is confirmed working.
 *
 * Returns a Promise so callers are already written for async resolution —
 * the switch to a real fetch requires no call-site changes.
 */

import type { DomainFrameJson } from "./domain-frame.types"
import { DEFAULT_DOMAIN_FRAME } from "./domain-frame.default"

export async function loadDomainFrame(domainSlug: string): Promise<DomainFrameJson> {
  // Static resolution for now. Replace with:
  //   return apiFetch(`/api/domains/${domainSlug}/frame`) as Promise<DomainFrameJson>
  void domainSlug
  return DEFAULT_DOMAIN_FRAME
}

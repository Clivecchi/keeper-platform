/**
 * Warm V0Shell data for a domain before navigation (hover on domain switcher).
 */

import { apiFetch } from "../../../lib/api"
import { loadDomainFrame } from "../../data/loadDomainFrame"

const inflight = new Set<string>()

export function prefetchDomainShell(slug: string): void {
  const normalized = slug.trim()
  if (!normalized || inflight.has(normalized)) return
  inflight.add(normalized)
  void Promise.all([
    loadDomainFrame(normalized),
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(normalized)}`).catch(
      () => null,
    ),
  ]).finally(() => {
    inflight.delete(normalized)
  })
}

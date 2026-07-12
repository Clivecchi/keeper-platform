/**
 * Domain shell bootstrap — single orchestrator for cold-load readiness.
 * Powers DomainShellGate (first visit) and scene-change prefetch warm-skip.
 */

import { loadDomainFrame, peekDomainFrame } from "../../data/loadDomainFrame"
import {
  fetchDomainAudience,
  fetchDomainBySlug,
  getCachedDomainAudience,
  getCachedDomainBySlug,
  type DomainAudienceRecord,
  type DomainBySlugRecord,
} from "./domainShellCache"
import type { DomainFrameJson } from "../../data/domain-frame.types"

export const DOMAIN_SHELL_MIN_HOLD_MS = 480
export const DOMAIN_SHELL_WARM_SKIP_MS = 280

export function isResolvedDomainId(id: string | null | undefined): id is string {
  return !!id && !String(id).startsWith("fallback-")
}

export interface DomainShellReadyOptions {
  requireAudience?: boolean
}

/** True when cached shell data is sufficient to reveal the board without a curtain. */
export function isDomainShellReady(
  slug: string,
  options?: DomainShellReadyOptions,
): boolean {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return false

  const domain = getCachedDomainBySlug(normalized)
  if (!domain?.id || !isResolvedDomainId(domain.id)) return false

  const frame = peekDomainFrame(normalized)
  if (!frame) return false

  if (options?.requireAudience && !getCachedDomainAudience(normalized)) {
    return false
  }

  return true
}

export interface DomainShellBootstrapResult {
  domain: DomainBySlugRecord | null
  audience: DomainAudienceRecord | null
  frame: DomainFrameJson | null
  elapsedMs: number
  fast: boolean
}

/** Parallel shell fetch — deduped via domainShellCache inflight maps. */
export async function bootstrapDomainShell(
  slug: string,
  options?: DomainShellReadyOptions,
): Promise<DomainShellBootstrapResult> {
  const startedAt = Date.now()
  const normalized = slug.trim()
  if (!normalized) {
    return {
      domain: null,
      audience: null,
      frame: null,
      elapsedMs: 0,
      fast: true,
    }
  }

  const [domain, audience, frame] = await Promise.all([
    fetchDomainBySlug(normalized).catch(() => null),
    options?.requireAudience
      ? fetchDomainAudience(normalized).catch(() => null)
      : Promise.resolve(null),
    loadDomainFrame(normalized).catch(() => null),
  ])

  const elapsedMs = Date.now() - startedAt
  return {
    domain,
    audience,
    frame,
    elapsedMs,
    fast: elapsedMs < DOMAIN_SHELL_WARM_SKIP_MS,
  }
}

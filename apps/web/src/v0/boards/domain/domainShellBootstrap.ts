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
  resolveDomainCoverUrl,
  resolveDomainShellDisplayName,
  type DomainAudienceRecord,
  type DomainBySlugRecord,
} from "./domainShellCache"
import type { DomainFrameJson } from "../../data/domain-frame.types"

export const DOMAIN_SHELL_MIN_HOLD_MS = 480
export const DOMAIN_SHELL_WARM_SKIP_MS = 280

/** Prefer cover decode during curtain; never block forever. */
export const DOMAIN_SHELL_COVER_WAIT_MS = 1200

/** Travel curtain already branded this slug — boot gate should not double-curtain. */
let travelCurtainSkipSlug: string | null = null

export function markTravelCurtainShown(slug: string): void {
  const normalized = slug.trim().toLowerCase()
  travelCurtainSkipSlug = normalized || null
}

export function consumeTravelCurtainSkip(slug: string): boolean {
  const normalized = slug.trim().toLowerCase()
  if (!normalized || travelCurtainSkipSlug !== normalized) return false
  travelCurtainSkipSlug = null
  return true
}

export function isResolvedDomainId(id: string | null | undefined): id is string {
  return !!id && !String(id).startsWith("fallback-")
}

export interface DomainShellReadyOptions {
  requireAudience?: boolean
  forceRefresh?: boolean
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

  if (!resolveDomainShellDisplayName(normalized)) return false

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
  ready: boolean
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
      ready: false,
    }
  }

  const force = options?.forceRefresh === true
  const [domain, audience, frame] = await Promise.all([
    fetchDomainBySlug(normalized, force ? { forceRefresh: true } : undefined).catch(
      () => null,
    ),
    options?.requireAudience
      ? fetchDomainAudience(
          normalized,
          force ? { forceRefresh: true } : undefined,
        ).catch(() => null)
      : Promise.resolve(null),
    loadDomainFrame(normalized, force ? { forceRefresh: true } : undefined).catch(
      () => null,
    ),
  ])

  const elapsedMs = Date.now() - startedAt
  const ready = isDomainShellReady(normalized, options)
  return {
    domain,
    audience,
    frame,
    elapsedMs,
    fast: elapsedMs < DOMAIN_SHELL_WARM_SKIP_MS,
    ready,
  }
}

/**
 * Prefer waiting for cover image decode when the domain has one.
 * Resolves on load, error, or timeout — never blocks forever.
 */
export function waitForDomainCoverDecode(
  slug: string,
  timeoutMs = DOMAIN_SHELL_COVER_WAIT_MS,
): Promise<void> {
  const coverUrl = resolveDomainCoverUrl(slug)
  if (!coverUrl || typeof Image === "undefined") {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const timer = window.setTimeout(finish, timeoutMs)
    img.onload = () => {
      window.clearTimeout(timer)
      finish()
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      finish()
    }
    img.src = coverUrl
  })
}

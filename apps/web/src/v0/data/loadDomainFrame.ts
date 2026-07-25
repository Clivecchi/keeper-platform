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
import { DEFAULT_DOMAIN_FRAME } from "./domain-frame.default"
import { isPlatformDomainSlugAlias } from "@keeper/shared"

function frameFallbackForSlug(domainSlug: string): DomainFrameJson {
  if (isPlatformDomainSlugAlias(domainSlug)) {
    return DEFAULT_DOMAIN_FRAME
  }
  return {
    ...DEFAULT_DOMAIN_FRAME,
    domain: domainSlug,
    theme: {
      ...DEFAULT_DOMAIN_FRAME.theme,
      wordmark: "",
      tagline: "",
    },
  } as DomainFrameJson
}

const frameCache = new Map<string, { fetchedAt: number; frame: DomainFrameJson }>()
const FRAME_CACHE_TTL_MS = 5 * 60 * 1000

function normalizeFrameSlug(domainSlug: string): string {
  return domainSlug.trim().toLowerCase()
}

export function getCachedDomainFrame(domainSlug: string): DomainFrameJson | null {
  const cached = frameCache.get(normalizeFrameSlug(domainSlug))
  if (!cached) return null
  if (Date.now() - cached.fetchedAt >= FRAME_CACHE_TTL_MS) return null
  return cached.frame
}

/** Stale-allowed read for soft domain switch (prefetch may have just populated). */
export function peekDomainFrame(domainSlug: string): DomainFrameJson | null {
  return frameCache.get(normalizeFrameSlug(domainSlug))?.frame ?? null
}

function normalizeDomainFrame(frame: DomainFrameJson): DomainFrameJson {
  return {
    ...frame,
    interaction_bar: {
      ...frame.interaction_bar,
      labels: {
        ...DEFAULT_DOMAIN_FRAME.interaction_bar.labels,
        ...frame.interaction_bar?.labels,
      },
    },
  }
}

export async function loadDomainFrame(
  domainSlug: string,
  options?: { forceRefresh?: boolean },
): Promise<DomainFrameJson> {
  const key = normalizeFrameSlug(domainSlug)
  const now = Date.now()
  const cached = frameCache.get(key)
  if (!options?.forceRefresh && cached && now - cached.fetchedAt < FRAME_CACHE_TTL_MS) {
    return cached.frame
  }

  try {
    const base = getApiBase()
    const response = await fetch(`${base}/api/domains/${encodeURIComponent(domainSlug)}/frame`)
    if (!response.ok) {
      console.warn(`[DomainFrame] API fetch failed (${response.status}), falling back to static default`)
      return frameFallbackForSlug(domainSlug)
    }
    const frame = normalizeDomainFrame(await response.json() as DomainFrameJson)
    frameCache.set(key, { fetchedAt: Date.now(), frame })
    console.log(`[DomainFrame] Loaded for domain: ${domainSlug}`)
    return frame
  } catch (err) {
    console.warn("[DomainFrame] Fetch error, falling back to static default", err)
    return frameFallbackForSlug(domainSlug)
  }
}

/**
 * Per-slug domain shell cache — by-slug record, audience, and frame prefetch.
 * Powers soft domain switch (stale-while-revalidate, no full board remount).
 */

import { apiFetch } from "../../../lib/api"
import type { DomainAudienceRole } from "@keeper/shared"
import { loadDomainFrame, peekDomainFrame } from "../../data/loadDomainFrame"

export const DOMAIN_SHELL_CACHE_TTL_MS = 5 * 60 * 1000

export type DomainBySlugRecord = {
  id: string
  slug: string
  name: string
  description?: string | null
  ownerId?: string
  displayName?: string
  /** Resolved from settings.primaryAgentId on GET /api/domains/by-slug/:slug */
  leadAgentSlug?: string | null
  leadAgentName?: string | null
  theme?: {
    coverImage?: string | null
    coverImageMode?: "cover" | "tile"
  }
  [key: string]: unknown
}

export type DomainAudienceRecord = {
  audience: DomainAudienceRole | null
  domainRole: string | null
  isOwner: boolean
}

interface TimedEntry<T> {
  fetchedAt: number
  data: T
}

const domainStore = new Map<string, TimedEntry<DomainBySlugRecord>>()
const audienceStore = new Map<string, TimedEntry<DomainAudienceRecord>>()
const domainInflight = new Map<string, Promise<DomainBySlugRecord>>()
const audienceInflight = new Map<string, Promise<DomainAudienceRecord>>()
const prefetchInflight = new Set<string>()

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase()
}

function isFresh(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt < DOMAIN_SHELL_CACHE_TTL_MS
}

export function getCachedDomainBySlug(slug: string): DomainBySlugRecord | null {
  const entry = domainStore.get(normalizeSlug(slug))
  if (!entry || !isFresh(entry.fetchedAt)) return null
  return entry.data
}

export function getCachedDomainAudience(slug: string): DomainAudienceRecord | null {
  const entry = audienceStore.get(normalizeSlug(slug))
  if (!entry || !isFresh(entry.fetchedAt)) return null
  return entry.data
}

export function setCachedDomainBySlug(slug: string, data: DomainBySlugRecord): void {
  domainStore.set(normalizeSlug(slug), { fetchedAt: Date.now(), data })
}

export function setCachedDomainAudience(slug: string, data: DomainAudienceRecord): void {
  audienceStore.set(normalizeSlug(slug), { fetchedAt: Date.now(), data })
}

async function loadDomainBySlug(slug: string, attempt = 0): Promise<DomainBySlugRecord> {
  try {
    const response = (await apiFetch(`/api/domains/by-slug/${encodeURIComponent(slug)}`)) as DomainBySlugRecord
    if (!response?.id) {
      throw new Error(`Domain not found: ${slug}`)
    }
    const record = { ...response, slug: response.slug ?? slug }
    setCachedDomainBySlug(slug, record)
    return record
  } catch (error) {
    if (attempt < 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 400))
      return loadDomainBySlug(slug, attempt + 1)
    }
    throw error
  }
}

async function loadDomainAudience(slug: string): Promise<DomainAudienceRecord> {
  const response = (await apiFetch(
    `/api/domains/by-slug/${encodeURIComponent(slug)}/audience`,
  )) as {
    audience?: DomainAudienceRole
    domainRole?: string | null
    isOwner?: boolean
  }
  const record: DomainAudienceRecord = {
    audience: response.audience ?? null,
    domainRole: response.domainRole ?? null,
    isOwner: !!response.isOwner,
  }
  setCachedDomainAudience(slug, record)
  return record
}

export async function fetchDomainBySlug(
  slug: string,
  options?: { forceRefresh?: boolean },
): Promise<DomainBySlugRecord> {
  if (!slug) throw new Error("Domain slug is required")

  if (!options?.forceRefresh) {
    const cached = getCachedDomainBySlug(slug)
    if (cached) return cached
  }

  const key = normalizeSlug(slug)
  const pending = domainInflight.get(key)
  if (pending && !options?.forceRefresh) return pending

  const promise = loadDomainBySlug(slug).finally(() => {
    domainInflight.delete(key)
  })
  domainInflight.set(key, promise)
  return promise
}

export async function fetchDomainAudience(
  slug: string,
  options?: { forceRefresh?: boolean },
): Promise<DomainAudienceRecord> {
  if (!slug) throw new Error("Domain slug is required")

  if (!options?.forceRefresh) {
    const cached = getCachedDomainAudience(slug)
    if (cached) return cached
  }

  const key = normalizeSlug(slug)
  const pending = audienceInflight.get(key)
  if (pending && !options?.forceRefresh) return pending

  const promise = loadDomainAudience(slug).finally(() => {
    audienceInflight.delete(key)
  })
  audienceInflight.set(key, promise)
  return promise
}

export function invalidateDomainShellCache(slug?: string): void {
  if (slug) {
    const key = normalizeSlug(slug)
    domainStore.delete(key)
    audienceStore.delete(key)
    domainInflight.delete(key)
    audienceInflight.delete(key)
    prefetchInflight.delete(slug.trim())
  } else {
    domainStore.clear()
    audienceStore.clear()
    domainInflight.clear()
    audienceInflight.clear()
    prefetchInflight.clear()
  }
}

/** Warm shell data before navigation (hover / select on domain switcher). */
export function prefetchDomainShell(slug: string): void {
  const normalized = slug.trim()
  if (!normalized || prefetchInflight.has(normalized)) return
  prefetchInflight.add(normalized)
  void Promise.all([
    fetchDomainBySlug(normalized).catch(() => null),
    fetchDomainAudience(normalized).catch(() => null),
    loadDomainFrame(normalized).catch(() => null),
  ]).finally(() => {
    prefetchInflight.delete(normalized)
  })
}

/** Sync read for soft switch bootstrap (includes slightly stale frame). */
export function peekDomainShellFrame(slug: string) {
  return peekDomainFrame(slug)
}

/** True when cached shell data is warm enough to skip the scene curtain. */
export function isDomainShellWarm(
  slug: string,
  options?: { requireAudience?: boolean },
): boolean {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return false
  const hasDomain = !!getCachedDomainBySlug(normalized)
  const hasFrame = !!peekDomainFrame(normalized)
  const hasAudience =
    !options?.requireAudience || !!getCachedDomainAudience(normalized)
  return hasDomain && hasFrame && hasAudience
}

/** Await shell prefetch with warm-skip threshold for scene-change travel. */
export async function prefetchDomainShellForTravel(
  slug: string,
  options?: { requireAudience?: boolean },
): Promise<boolean> {
  const startedAt = Date.now()
  prefetchDomainShell(slug)
  await Promise.all([
    fetchDomainBySlug(slug).catch(() => null),
    options?.requireAudience
      ? fetchDomainAudience(slug).catch(() => null)
      : Promise.resolve(null),
    import("../../data/loadDomainFrame").then((m) => m.loadDomainFrame(slug).catch(() => null)),
  ])
  return Date.now() - startedAt < 280
}

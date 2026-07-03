/**
 * In-memory cache for guest public journey list + detail (per domain slug).
 * Cover Forward, Present, and Journeys browse share one fetch.
 */

import { getApiBase } from "../../lib/apiFetch"
import type { Frame } from "../../worlds/shared/patternUtils"

export const PUBLIC_JOURNEY_CACHE_TTL_MS = 5 * 60 * 1000

export type PublicJourneySummary = {
  id: string
  name: string
  createdAt: string
}

export type PublicJourneyDetail = {
  journey: {
    id: string
    name: string
    forward: string
    createdAt: string
    updatedAt: string
  }
  paths: { id: string; name: string; prelude: string }[]
  moments: { id: string; title: string; narrative: string; createdAt: string }[]
}

interface ListEntry {
  fetchedAt: number
  journeys: PublicJourneySummary[]
}

interface DetailEntry {
  fetchedAt: number
  detail: PublicJourneyDetail
}

const listStore = new Map<string, ListEntry>()
const detailStore = new Map<string, DetailEntry>()
const listInflight = new Map<string, Promise<PublicJourneySummary[]>>()
const detailInflight = new Map<string, Promise<PublicJourneyDetail>>()

function listKey(domainSlug: string): string {
  return domainSlug.trim().toLowerCase()
}

function detailKey(domainSlug: string, journeyId: string): string {
  return `${listKey(domainSlug)}:${journeyId}`
}

function isFresh(fetchedAt: number, now = Date.now()): boolean {
  return now - fetchedAt < PUBLIC_JOURNEY_CACHE_TTL_MS
}

export function getCachedPublicJourneyList(domainSlug: string): PublicJourneySummary[] | null {
  const entry = listStore.get(listKey(domainSlug))
  if (!entry || !isFresh(entry.fetchedAt)) return null
  return entry.journeys
}

export function getCachedPublicJourneyDetail(
  domainSlug: string,
  journeyId: string,
): PublicJourneyDetail | null {
  const entry = detailStore.get(detailKey(domainSlug, journeyId))
  if (!entry || !isFresh(entry.fetchedAt)) return null
  return entry.detail
}

export function setCachedPublicJourneyList(
  domainSlug: string,
  journeys: PublicJourneySummary[],
): void {
  listStore.set(listKey(domainSlug), { fetchedAt: Date.now(), journeys })
}

export function setCachedPublicJourneyDetail(
  domainSlug: string,
  detail: PublicJourneyDetail,
): void {
  detailStore.set(detailKey(domainSlug, detail.journey.id), {
    fetchedAt: Date.now(),
    detail,
  })
}

export function mapPublicJourneyToNarrative(
  json: PublicJourneyDetail,
  domainSlug: string,
): { frame: Frame; domain: Record<string, unknown> } {
  const j = json.journey
  const paths = json.paths ?? []
  const moments = json.moments ?? []
  const props: Frame["props"] = [
    {
      id: `${j.id}-journey-title`,
      type: "heading",
      config: { content: j.name },
      orderIndex: 0,
    },
  ]
  let order = 1
  if (j.forward?.trim()) {
    props.push({
      id: `${j.id}-forward`,
      type: "text",
      config: { content: j.forward },
      orderIndex: order++,
    })
  }

  for (const p of paths) {
    props.push({
      id: `${p.id}-path-title`,
      type: "heading",
      config: { content: p.name },
      orderIndex: order++,
    })
    if (p.prelude?.trim()) {
      props.push({
        id: `${p.id}-path-prelude`,
        type: "text",
        config: { content: p.prelude },
        orderIndex: order++,
      })
    }
  }

  for (const m of moments) {
    props.push({
      id: `${m.id}-moment-title`,
      type: "heading",
      config: { content: m.title || "Moment" },
      orderIndex: order++,
    })
    props.push({
      id: `${m.id}-moment-body`,
      type: "text",
      config: { content: m.narrative || "" },
      orderIndex: order++,
    })
  }

  return {
    frame: {
      id: j.id,
      name: j.name,
      pattern: "canvas",
      visibility: "public",
      props,
    },
    domain: {
      id: domainSlug,
      slug: domainSlug,
      name: j.name,
    },
  }
}

async function loadPublicJourneyList(domainSlug: string): Promise<PublicJourneySummary[]> {
  const base = getApiBase()
  const res = await fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
  if (!res.ok) {
    throw new Error(`Public journeys could not be loaded (${res.status})`)
  }
  const body = (await res.json()) as { journeys?: PublicJourneySummary[] }
  const journeys = body.journeys ?? []
  setCachedPublicJourneyList(domainSlug, journeys)
  return journeys
}

async function loadPublicJourneyDetail(
  domainSlug: string,
  journeyId: string,
): Promise<PublicJourneyDetail> {
  const base = getApiBase()
  const res = await fetch(
    `${base}/api/public/${encodeURIComponent(domainSlug)}/journeys/${encodeURIComponent(journeyId)}`,
  )
  if (!res.ok) {
    throw new Error(`Journey could not be loaded (${res.status})`)
  }
  const detail = (await res.json()) as PublicJourneyDetail
  setCachedPublicJourneyDetail(domainSlug, detail)
  return detail
}

/** List with stale-while-revalidate semantics. */
export async function fetchPublicJourneyList(
  domainSlug: string,
  options?: { forceRefresh?: boolean },
): Promise<PublicJourneySummary[]> {
  if (!domainSlug) return []

  if (!options?.forceRefresh) {
    const cached = getCachedPublicJourneyList(domainSlug)
    if (cached) return cached
  }

  const key = listKey(domainSlug)
  const pending = listInflight.get(key)
  if (pending && !options?.forceRefresh) return pending

  const promise = loadPublicJourneyList(domainSlug).finally(() => {
    listInflight.delete(key)
  })
  listInflight.set(key, promise)
  return promise
}

/** Detail with stale-while-revalidate semantics. */
export async function fetchPublicJourneyDetail(
  domainSlug: string,
  journeyId: string,
  options?: { forceRefresh?: boolean },
): Promise<PublicJourneyDetail> {
  if (!domainSlug || !journeyId) {
    throw new Error("Domain slug and journey id are required")
  }

  if (!options?.forceRefresh) {
    const cached = getCachedPublicJourneyDetail(domainSlug, journeyId)
    if (cached) return cached
  }

  const key = detailKey(domainSlug, journeyId)
  const pending = detailInflight.get(key)
  if (pending && !options?.forceRefresh) return pending

  const promise = loadPublicJourneyDetail(domainSlug, journeyId).finally(() => {
    detailInflight.delete(key)
  })
  detailInflight.set(key, promise)
  return promise
}

/** Prefetch first journey detail after list resolve (Cover Forward). */
export function prefetchFirstPublicJourneyDetail(
  domainSlug: string,
  journeys: PublicJourneySummary[],
): void {
  const first = journeys[0]
  if (!first) return
  if (getCachedPublicJourneyDetail(domainSlug, first.id)) return
  void fetchPublicJourneyDetail(domainSlug, first.id).catch(() => {
    // Prefetch is best-effort
  })
}

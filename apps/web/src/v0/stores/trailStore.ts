import { useSyncExternalStore } from "react"

export type TrailEventType = "navigation" | "action"

export interface TrailEntry {
  id: string
  label: string
  type: TrailEventType
  timestamp: number
  href?: string
}

interface TrailState {
  entriesByDomain: Record<string, TrailEntry[]>
}

const MAX_ENTRIES = 5
const listeners = new Set<() => void>()
let state: TrailState = { entriesByDomain: {} }

const getDomainKey = (domainSlug?: string) => domainSlug?.trim() || "global"

const notify = () => {
  listeners.forEach((listener) => listener())
}

const getEntries = (domainSlug?: string) => {
  const key = getDomainKey(domainSlug)
  return state.entriesByDomain[key] ?? []
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useTrailEntries = (domainSlug?: string) => {
  return useSyncExternalStore(subscribe, () => getEntries(domainSlug))
}

export const recordTrailEvent = (
  domainSlug: string | undefined,
  entry: Omit<TrailEntry, "id" | "timestamp"> & { timestamp?: number }
) => {
  const key = getDomainKey(domainSlug)
  const nextEntry: TrailEntry = {
    id: `trail_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    label: entry.label,
    type: entry.type,
    href: entry.href,
    timestamp: entry.timestamp ?? Date.now(),
  }

  const existing = state.entriesByDomain[key] ?? []
  const nextEntries = [nextEntry, ...existing].slice(0, MAX_ENTRIES)

  state = {
    ...state,
    entriesByDomain: {
      ...state.entriesByDomain,
      [key]: nextEntries,
    },
  }
  notify()
}

export const clearTrail = (domainSlug?: string) => {
  const key = getDomainKey(domainSlug)
  if (!state.entriesByDomain[key]) return
  state = {
    ...state,
    entriesByDomain: {
      ...state.entriesByDomain,
      [key]: [],
    },
  }
  notify()
}

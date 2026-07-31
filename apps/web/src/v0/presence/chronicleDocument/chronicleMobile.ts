import type { ChronicleEvent } from "@keeper/shared"

export const chronicleViewedStorageKey = (dialogId: string): string =>
  `keeper.chronicle.viewed.${dialogId}`

export function markChronicleViewed(dialogId: string, viewedAt = Date.now()): void {
  if (typeof window === "undefined" || !dialogId) return
  try {
    window.localStorage.setItem(chronicleViewedStorageKey(dialogId), String(viewedAt))
  } catch {
    // Local storage is an optional enhancement (private browsing, quota, etc.).
  }
}

export function hasUnreadChronicle(
  dialogId: string,
  updatedAt?: string | null,
  latestEventTimestamp?: string | null,
): boolean {
  if (typeof window === "undefined" || !dialogId) return false
  const latest = Date.parse(latestEventTimestamp ?? updatedAt ?? "")
  if (!Number.isFinite(latest)) return false
  try {
    const viewed = Number(window.localStorage.getItem(chronicleViewedStorageKey(dialogId)))
    return !Number.isFinite(viewed) || latest > viewed
  } catch {
    return false
  }
}

export function scrollToChroniclePoint(pointId: string): boolean {
  if (typeof document === "undefined" || !pointId) return false
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(pointId) : pointId.replace(/"/g, '\\"')
  const element =
    document.getElementById(pointId) ??
    document.querySelector<HTMLElement>(`[data-chronicle-anchor="${escaped}"]`)
  if (!element) return false
  element.scrollIntoView({ behavior: "smooth", block: "start" })
  return true
}

export type ChronicleEventGroup = ChronicleEvent & { children: ChronicleEvent[] }

export function groupChronicleEvents(events: readonly ChronicleEvent[]): ChronicleEventGroup[] {
  const byId = new Map(events.map((event) => [event.id, { ...event, children: [] as ChronicleEvent[] }]))
  const roots: ChronicleEventGroup[] = []
  for (const event of byId.values()) {
    const parent = event.parentEventId ? byId.get(event.parentEventId) : undefined
    if (parent) parent.children.push(event)
    else roots.push(event)
  }
  return roots
}

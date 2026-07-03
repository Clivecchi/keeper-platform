/**
 * Shared resolver for keeper/journey display names — uses board nav cache first.
 */

import { apiFetch } from "../../lib/api"
import {
  fetchBoardNavSlice,
  loadJourneys,
  loadKeepers,
  lookupJourneyNameFromCache,
  lookupKeeperTitleFromCache,
} from "./boardNavDataCache"

export async function resolveKeeperDisplayTitle(
  domainId: string | null,
  keeperId: string,
): Promise<string | null> {
  if (domainId) {
    const cached = lookupKeeperTitleFromCache(domainId, keeperId)
    if (cached) return cached

    const list = await fetchBoardNavSlice(domainId, "keepers", () =>
      loadKeepers(domainId),
    )
    const fromList = (list as Array<{ id: string; title?: string; display_label?: string | null }>)
      .find((row) => row.id === keeperId)
    const title = (fromList?.display_label ?? fromList?.title)?.trim()
    if (title) return title
  }

  const res = await apiFetch(`/api/keepers/${encodeURIComponent(keeperId)}`)
  const keeper =
    (res as { keeper?: { title?: string } })?.keeper ??
    (res as { data?: { title?: string } })?.data
  return (keeper as { title?: string } | undefined)?.title?.trim() || null
}

export async function resolveJourneyDisplayName(
  domainId: string | null,
  journeyId: string,
): Promise<string | null> {
  if (domainId) {
    const cached = lookupJourneyNameFromCache(domainId, journeyId)
    if (cached) return cached

    await fetchBoardNavSlice(domainId, "journeys", () => loadJourneys(domainId))
    const afterFetch = lookupJourneyNameFromCache(domainId, journeyId)
    if (afterFetch) return afterFetch
  }

  const res = await apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`)
  const journey =
    (res as { journey?: { name?: string } })?.journey ??
    (res as { data?: { name?: string } })?.data
  return (journey as { name?: string } | undefined)?.name?.trim() || null
}

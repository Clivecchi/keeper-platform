import type { RelatedItem, RelatedSection } from "../presenceEnrichment"

/** Canonical Domain Cover terrain — judged order, not a warehouse dump. */
export const DOMAIN_COVER_TERRAIN_TITLES = [
  "Recent Moments",
  "Moving",
  "Present",
] as const

export type DomainCoverTerrainTitle = (typeof DOMAIN_COVER_TERRAIN_TITLES)[number]

export const DOMAIN_COVER_TERRAIN_LIMITS: Record<DomainCoverTerrainTitle, number> = {
  "Recent Moments": 3,
  Moving: 3,
  Present: 2,
}

export type DomainCoverTerrainProminence = "alive" | "path" | "settled"

export interface DomainCoverTerrainSection {
  title: DomainCoverTerrainTitle
  prominence: DomainCoverTerrainProminence
  items: RelatedItem[]
}

const TERRAIN_PROMINENCE: Record<DomainCoverTerrainTitle, DomainCoverTerrainProminence> = {
  "Recent Moments": "alive",
  Moving: "path",
  Present: "settled",
}

function isDomainCoverTerrainTitle(title: string): title is DomainCoverTerrainTitle {
  return (DOMAIN_COVER_TERRAIN_TITLES as readonly string[]).includes(title)
}

/**
 * Cover is the map. Keep only the judged Domain terrain, in prominence order,
 * sliced so Chronicle does not become a journey warehouse.
 */
export function judgeDomainCoverTerrain(
  sections: RelatedSection[],
): DomainCoverTerrainSection[] {
  const byTitle = new Map(
    sections
      .filter((section) => isDomainCoverTerrainTitle(section.title))
      .map((section) => [section.title, section] as const),
  )

  return DOMAIN_COVER_TERRAIN_TITLES.flatMap((title) => {
    const section = byTitle.get(title)
    if (!section) return []
    const items = section.items
      .filter((item) => Boolean(item.id?.trim()) && Boolean(item.navigateKind))
      .slice(0, DOMAIN_COVER_TERRAIN_LIMITS[title])
    if (items.length === 0) return []
    return [
      {
        title,
        prominence: TERRAIN_PROMINENCE[title],
        items,
      },
    ]
  })
}

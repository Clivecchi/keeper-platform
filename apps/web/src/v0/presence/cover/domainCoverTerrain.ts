import type { RelatedItem, RelatedSection } from "../presenceEnrichment"

/** Canonical Domain Cover terrain — judged order, not a warehouse dump. */
export const DOMAIN_COVER_TERRAIN_TITLES = [
  "Recent Moments",
  "Moving",
  "Present",
] as const

export type DomainCoverTerrainTitle = (typeof DOMAIN_COVER_TERRAIN_TITLES)[number]

export const DOMAIN_COVER_TERRAIN_LIMITS: Record<DomainCoverTerrainTitle, number> = {
  "Recent Moments": 2,
  Moving: 2,
  Present: 2,
}

export type DomainCoverTerrainProminence = "alive" | "path" | "settled"

/** Narrative role on the living path — not a warehouse section header. */
export type DomainCoverRole = "now" | "needsYou" | "becoming" | "present"

export const DOMAIN_COVER_ROLE_LABEL: Record<DomainCoverRole, string> = {
  now: "Now",
  needsYou: "Needs you",
  becoming: "Becoming",
  present: "Present",
}

export interface DomainCoverTerrainSection {
  title: DomainCoverTerrainTitle
  prominence: DomainCoverTerrainProminence
  items: RelatedItem[]
}

export interface DomainCoverReach {
  role: DomainCoverRole
  prominence: DomainCoverTerrainProminence
  item: RelatedItem
}

const TERRAIN_PROMINENCE: Record<DomainCoverTerrainTitle, DomainCoverTerrainProminence> = {
  "Recent Moments": "alive",
  Moving: "path",
  Present: "settled",
}

const ROLE_LIMITS: Record<DomainCoverRole, number> = {
  now: 2,
  needsYou: 1,
  becoming: 2,
  present: 1,
}

function isDomainCoverTerrainTitle(title: string): title is DomainCoverTerrainTitle {
  return (DOMAIN_COVER_TERRAIN_TITLES as readonly string[]).includes(title)
}

function hasDirection(item: RelatedItem): boolean {
  return Boolean(item.preview?.trim())
}

function roleForItem(title: DomainCoverTerrainTitle, item: RelatedItem): DomainCoverRole {
  if (title === "Recent Moments") return "now"
  if (title === "Moving") return "becoming"
  return hasDirection(item) ? "present" : "needsYou"
}

function prominenceForRole(role: DomainCoverRole): DomainCoverTerrainProminence {
  if (role === "now") return "alive"
  if (role === "becoming" || role === "needsYou") return "path"
  return "settled"
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

/**
 * One living path under Place. Roles are per reach, not warehouse bands.
 * Needs-you is a journey without a Forward. Imagery stays optional on the item.
 */
export function judgeDomainCoverPath(sections: RelatedSection[]): DomainCoverReach[] {
  const seen = new Set<string>()
  const counts: Record<DomainCoverRole, number> = {
    now: 0,
    needsYou: 0,
    becoming: 0,
    present: 0,
  }

  const path: DomainCoverReach[] = []

  for (const section of judgeDomainCoverTerrain(sections)) {
    for (const item of section.items) {
      const role = roleForItem(section.title, item)
      if (counts[role] >= ROLE_LIMITS[role]) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      counts[role] += 1
      path.push({
        role,
        prominence: prominenceForRole(role),
        item,
      })
    }
  }

  const order: DomainCoverRole[] = ["now", "needsYou", "becoming", "present"]
  return path.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
}

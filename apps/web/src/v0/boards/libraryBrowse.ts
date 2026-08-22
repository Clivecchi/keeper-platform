/**
 * Library browse — kind, category, and rail grouping for the media selector.
 * Categories on LibraryItem are tags (not a hierarchy). Kinds are inferred
 * from source so a flat list can still be walked like a media shelf.
 */

import type { LibraryNavRow } from "../presence/integrationChronicle/libraryNavUtils"
import { libraryItemChronicleTitle } from "../presence/integrationChronicle/libraryNavUtils"

export const LIBRARY_BROWSE_KINDS = [
  "image",
  "video",
  "document",
  "link",
  "writing",
  "github",
] as const

export type LibraryBrowseKind = (typeof LIBRARY_BROWSE_KINDS)[number]

export type LibraryBrowseFacet =
  | { type: "all" }
  | { type: "kind"; kind: LibraryBrowseKind }
  | { type: "category"; tag: string }
  | { type: "archive" }

export type LibraryBrowseChip = {
  id: string
  label: string
  facet: LibraryBrowseFacet
}

export type LibraryBrowseRailDef = {
  id: string
  title: string
  rows: LibraryNavRow[]
}

const IMAGE_EXT_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i
const VIDEO_EXT_PATTERN = /\.(mp4|webm|mov|m4v|avi)(\?|#|$)/i
const ARCHIVE_TAG = "archive"
const RECENT_RAIL_LIMIT = 12

function refPath(sourceRef: string): string {
  return sourceRef.split("?")[0]?.split("#")[0] ?? sourceRef
}

export function isLibraryArchived(row: Pick<LibraryNavRow, "category">): boolean {
  return (row.category ?? []).includes(ARCHIVE_TAG)
}

export function isLibraryImageSource(
  row: Pick<LibraryNavRow, "source_type" | "source_ref">,
): boolean {
  return IMAGE_EXT_PATTERN.test(refPath(row.source_ref))
}

export function isLibraryVideoSource(
  row: Pick<LibraryNavRow, "source_type" | "source_ref">,
): boolean {
  return VIDEO_EXT_PATTERN.test(refPath(row.source_ref))
}

export function resolveLibraryBrowseKind(
  row: Pick<LibraryNavRow, "source_type" | "source_ref">,
): LibraryBrowseKind {
  if (row.source_type === "draft") return "writing"
  if (row.source_type === "github") return "github"
  if (isLibraryImageSource(row)) return "image"
  if (isLibraryVideoSource(row)) return "video"
  if (row.source_type === "url") return "link"
  return "document"
}

export function libraryBrowseKindLabel(kind: LibraryBrowseKind, plural = false): string {
  switch (kind) {
    case "image":
      return plural ? "Images" : "Image"
    case "video":
      return plural ? "Videos" : "Video"
    case "document":
      return plural ? "Documents" : "Document"
    case "link":
      return plural ? "Links" : "Link"
    case "writing":
      return plural ? "Writing" : "Writing"
    case "github":
      return "GitHub"
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function formatLibraryCategoryLabel(tag: string): string {
  const trimmed = tag.trim()
  if (!trimmed) return "Untitled"
  if (trimmed === ARCHIVE_TAG) return "Archive"
  return trimmed.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export function listLibraryCategoryTags(rows: LibraryNavRow[]): string[] {
  const tags = new Set<string>()
  for (const row of rows) {
    for (const tag of row.category ?? []) {
      const trimmed = tag.trim()
      if (trimmed && trimmed !== ARCHIVE_TAG) tags.add(trimmed)
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
}

export function listLibraryBrowseChips(rows: LibraryNavRow[]): LibraryBrowseChip[] {
  const chips: LibraryBrowseChip[] = [{ id: "all", label: "All", facet: { type: "all" } }]
  const live = rows.filter((row) => !isLibraryArchived(row))

  for (const kind of LIBRARY_BROWSE_KINDS) {
    if (live.some((row) => resolveLibraryBrowseKind(row) === kind)) {
      chips.push({
        id: `kind:${kind}`,
        label: libraryBrowseKindLabel(kind, true),
        facet: { type: "kind", kind },
      })
    }
  }

  for (const tag of listLibraryCategoryTags(rows)) {
    chips.push({
      id: `category:${tag}`,
      label: formatLibraryCategoryLabel(tag),
      facet: { type: "category", tag },
    })
  }

  if (rows.some(isLibraryArchived)) {
    chips.push({
      id: "archive",
      label: "Archive",
      facet: { type: "archive" },
    })
  }

  return chips
}

function matchesQuery(row: LibraryNavRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const title = libraryItemChronicleTitle(row).toLowerCase()
  const description = (row.description ?? "").toLowerCase()
  const ref = row.source_ref.toLowerCase()
  return title.includes(q) || description.includes(q) || ref.includes(q)
}

export function filterLibraryBrowseRows(
  rows: LibraryNavRow[],
  facet: LibraryBrowseFacet,
  query = "",
): LibraryNavRow[] {
  return rows.filter((row) => {
    if (!matchesQuery(row, query)) return false
    switch (facet.type) {
      case "all":
        return true
      case "archive":
        return isLibraryArchived(row)
      case "kind":
        return !isLibraryArchived(row) && resolveLibraryBrowseKind(row) === facet.kind
      case "category":
        return (row.category ?? []).includes(facet.tag)
      default: {
        const _exhaustive: never = facet
        return _exhaustive
      }
    }
  })
}

function sortByRecency(rows: LibraryNavRow[]): LibraryNavRow[] {
  return [...rows].sort((a, b) => {
    const aTime = a.created_at ? Date.parse(a.created_at) : 0
    const bTime = b.created_at ? Date.parse(b.created_at) : 0
    return bTime - aTime
  })
}

export function buildLibraryBrowseRails(
  rows: LibraryNavRow[],
  query = "",
): LibraryBrowseRailDef[] {
  const visible = rows.filter((row) => matchesQuery(row, query))
  const live = sortByRecency(visible.filter((row) => !isLibraryArchived(row)))
  const rails: LibraryBrowseRailDef[] = []

  if (live.length > 0) {
    rails.push({
      id: "recent",
      title: "Recent",
      rows: live.slice(0, RECENT_RAIL_LIMIT),
    })
  }

  for (const kind of LIBRARY_BROWSE_KINDS) {
    const kindRows = live.filter((row) => resolveLibraryBrowseKind(row) === kind)
    if (kindRows.length === 0) continue
    rails.push({
      id: `kind:${kind}`,
      title: libraryBrowseKindLabel(kind, true),
      rows: kindRows,
    })
  }

  for (const tag of listLibraryCategoryTags(visible)) {
    const tagged = sortByRecency(
      visible.filter((row) => (row.category ?? []).includes(tag)),
    )
    if (tagged.length === 0) continue
    rails.push({
      id: `category:${tag}`,
      title: formatLibraryCategoryLabel(tag),
      rows: tagged,
    })
  }

  const archived = sortByRecency(visible.filter(isLibraryArchived))
  if (archived.length > 0) {
    rails.push({
      id: "archive",
      title: "Archive",
      rows: archived,
    })
  }

  return rails
}

export function libraryLinkHost(sourceRef: string): string | null {
  try {
    return new URL(sourceRef).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

export function facetEquals(a: LibraryBrowseFacet, b: LibraryBrowseFacet): boolean {
  if (a.type !== b.type) return false
  if (a.type === "kind" && b.type === "kind") return a.kind === b.kind
  if (a.type === "category" && b.type === "category") return a.tag === b.tag
  return true
}

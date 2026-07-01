import type { DraftPoint, DraftPointType } from "@keeper/shared"
import { resolveDraftPointStructure } from "@keeper/shared"

export const DRAFT_OPENER_CHAR_LIMIT = 177

export interface DraftPathEmergence {
  id: string
  prelude?: string
  pointIds?: string[]
}

export interface DraftPointBeats {
  prelude: string
  opener: string
  closer: string
  hasMore: boolean
  fullContent: string
  structure: ReturnType<typeof resolveDraftPointStructure>
}

const TYPE_PRELUDE: Record<DraftPointType, string> = {
  moment: "A moment waiting to land",
  decision: "A decision taking shape",
  context: "Background that matters",
  general: "An idea forming",
}

export { resolveDraftPointStructure } from "@keeper/shared"

export function truncateAtWord(text: string, maxChars: number): {
  text: string
  remainder: string
  truncated: boolean
} {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) {
    return { text: trimmed, remainder: "", truncated: false }
  }

  const slice = trimmed.slice(0, maxChars)
  const lastSpace = slice.lastIndexOf(" ")
  const cut = lastSpace > maxChars * 0.55 ? lastSpace : maxChars
  const head = trimmed.slice(0, cut).trimEnd()
  const remainder = trimmed.slice(cut).trimStart()

  return {
    text: head,
    remainder,
    truncated: remainder.length > 0,
  }
}

function lastSentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""
  const parts = trimmed.split(/(?<=[.!?])\s+/)
  return parts[parts.length - 1]?.trim() ?? trimmed
}

export function resolvePointBeats(point: DraftPoint): DraftPointBeats {
  const structure = resolveDraftPointStructure(point)
  const fullContent = point.content.trim()
  const prelude =
    structure.prelude ||
    (structure.isPathSpec ? "" : TYPE_PRELUDE[point.type])

  const bodyForOpener =
    structure.isPathSpec && structure.description
      ? structure.description
      : fullContent

  const { text: opener, remainder, truncated } = truncateAtWord(
    bodyForOpener,
    DRAFT_OPENER_CHAR_LIMIT,
  )
  let closer =
    structure.closer ||
    point.closer?.trim() ||
    (remainder ? lastSentence(remainder) : truncated ? lastSentence(bodyForOpener) : "")

  if (closer && (closer === opener || opener.includes(closer))) {
    closer = ""
  }

  return {
    prelude,
    opener,
    closer,
    hasMore: truncated,
    fullContent: bodyForOpener,
    structure,
  }
}

export function parseDraftPathEmergence(spec: unknown): DraftPathEmergence[] {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return []
  const paths = (spec as Record<string, unknown>).paths
  if (!Array.isArray(paths)) return []

  return paths
    .map((entry): DraftPathEmergence | null => {
      if (!entry || typeof entry !== "object") return null
      const row = entry as Record<string, unknown>
      const id = typeof row.id === "string" ? row.id : null
      if (!id) return null
      const prelude = typeof row.prelude === "string" ? row.prelude : undefined
      const pointIds = Array.isArray(row.pointIds)
        ? row.pointIds.filter((id): id is string => typeof id === "string")
        : Array.isArray(row.point_ids)
          ? row.point_ids.filter((id): id is string => typeof id === "string")
          : undefined
      return { id, prelude, pointIds }
    })
    .filter((row): row is DraftPathEmergence => row !== null)
}

export interface PointCluster {
  pathPrelude?: string
  points: DraftPoint[]
}

export function clusterDraftPoints(
  points: DraftPoint[],
  pathEmergence: DraftPathEmergence[],
): PointCluster[] {
  if (points.length === 0) return []

  const pathById = new Map(pathEmergence.map((path) => [path.id, path]))
  const pointToPath = new Map<string, DraftPathEmergence>()

  for (const path of pathEmergence) {
    for (const pointId of path.pointIds ?? []) {
      pointToPath.set(pointId, path)
    }
  }

  const clusters: PointCluster[] = []
  let current: PointCluster | null = null
  let currentPathId: string | null = null

  for (const point of points) {
    const pathId = point.pathGroupId ?? pointToPath.get(point.id)?.id ?? null
    const path = pathId ? pathById.get(pathId) ?? pointToPath.get(point.id) : undefined

    if (pathId && pathId === currentPathId && current) {
      current.points.push(point)
      continue
    }

    current = {
      pathPrelude: path?.prelude?.trim() || undefined,
      points: [point],
    }
    currentPathId = pathId
    clusters.push(current)
  }

  if (clusters.length <= 1) return clusters

  // Heuristic: cluster consecutive points with matching prelude prefix when no path ids
  const heuristic: PointCluster[] = []
  let hCurrent: PointCluster | null = null
  let hKey: string | null = null

  for (const point of points) {
    const beats = resolvePointBeats(point)
    const key = beats.prelude.slice(0, 24).toLowerCase()
    if (hKey && key === hKey && hCurrent) {
      hCurrent.points.push(point)
      continue
    }
    hCurrent = { points: [point] }
    hKey = key
    heuristic.push(hCurrent)
  }

  const hasPathGrouping = points.some(
    (point) => point.pathGroupId || pointToPath.has(point.id),
  )

  return hasPathGrouping ? clusters : heuristic.length > 1 ? heuristic : clusters
}

export function formatDraftKindLabel(kind: string | undefined): string {
  if (!kind) return "Draft"
  return kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

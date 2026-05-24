/**
 * presenceEnrichment
 * ==================
 * Resolves contextual metadata and related content for Chronicle presence.
 * Inherits the Journeys Frame / Domain Board instincts — journey-first hierarchy,
 * moment threads, keeper context — without duplicating bespoke view logic.
 */

import { apiFetch } from "../../lib/api"
import { KipApi } from "../../lib/kipApi"

export interface RelatedItem {
  id: string
  label: string
  sub?: string
  preview?: string
  navigateKind?: "journey" | "moment" | "keeper"
}

export interface RelatedSection {
  title: string
  items: RelatedItem[]
}

export interface PresenceBreadcrumb {
  journey: string
  path?: string
}

export interface PresenceMeta {
  /** Quiet inline stats under the title — e.g. "17 moments · Created Feb 8" */
  line?: string
  /** Structured header meta for journey focus layout */
  keeper?: { id: string; title: string }
  createdAt?: string
  momentCount?: number
}

export interface EnrichmentResult {
  record: Record<string, unknown>
  breadcrumb?: PresenceBreadcrumb
  meta?: PresenceMeta
  relatedSections: RelatedSection[]
  hiddenFields: string[]
}

function formatWhenShort(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatRelativeKept(
  keptAt: unknown,
  createdAt: unknown,
): string | undefined {
  const keptIso = typeof keptAt === "string" && keptAt ? keptAt : null
  const iso = keptIso ?? (typeof createdAt === "string" ? createdAt : "")
  if (!iso) return undefined

  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined

  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)

  if (days < 30) {
    const rel =
      days === 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`
    return keptIso ? `Kept ${rel}` : rel
  }

  const abs = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return keptIso ? `Kept ${abs}` : abs
}

function normalizeJourneyPaths(raw: Record<string, unknown>) {
  const pathsRaw = (raw.paths ?? raw.Path ?? []) as Array<Record<string, unknown>>
  return pathsRaw.map((p) => ({
    id: String(p.id ?? ""),
    name: String(p.name ?? "Untitled path"),
    prelude: typeof p.prelude === "string" ? p.prelude.trim() : "",
    momentCount:
      typeof p.momentCount === "number"
        ? p.momentCount
        : Array.isArray(p.Moment)
          ? p.Moment.length
          : 0,
  }))
}

function extractJourneyMoments(record: Record<string, unknown>): RelatedItem[] {
  const topLevel = (record.moment ?? record.Moment ?? []) as Array<Record<string, unknown>>
  const fromPaths = normalizeJourneyPaths(record).flatMap((path) => {
    const pathRaw = ((record.paths ?? record.Path ?? []) as Array<Record<string, unknown>>).find(
      (p) => String(p.id) === path.id,
    )
    const nested = (pathRaw?.Moment ?? pathRaw?.moment ?? []) as Array<Record<string, unknown>>
    return nested
  })

  const merged = new Map<string, Record<string, unknown>>()
  for (const m of [...topLevel, ...fromPaths]) {
    const id = String(m.id ?? "")
    if (id) merged.set(id, m)
  }

  return Array.from(merged.values())
    .map((m) => ({
      id: String(m.id),
      label: String(m.title ?? "Untitled moment").trim() || "Untitled moment",
      sub: formatRelativeKept(m.keptAt, m.createdAt ?? m.updatedAt),
      preview:
        typeof m.narrative === "string" && m.narrative.trim()
          ? m.narrative.trim().slice(0, 140)
          : undefined,
      navigateKind: "moment" as const,
    }))
    .slice(0, 12)
}

function formatContextSummary(context: unknown): string {
  if (!context || typeof context !== "object") return ""
  const c = context as Record<string, unknown>
  const parts = [c.board, c.frame, c.subject].filter(
    (v) => typeof v === "string" && v.trim(),
  ) as string[]
  return parts.join(" · ")
}

function mapDraftRecord(found: Record<string, unknown>): Record<string, unknown> {
  const updated =
    found.updatedAt ?? found.updated_at ?? found.created_at ?? null
  return {
    ...found,
    title: found.title ?? "",
    status: found.status ?? "",
    summary: found.summary ?? "",
    updatedAt: updated,
  }
}

function mapDialogRecord(dialog: Record<string, unknown>): Record<string, unknown> {
  const sessions = Array.isArray(dialog.sessions) ? dialog.sessions : []
  return {
    ...dialog,
    title: dialog.title ?? "",
    context: formatContextSummary(dialog.context) || "",
    sessionCount: sessions.length,
    updated_at: dialog.updated_at ?? dialog.updatedAt,
  }
}

function mapKeeperRecord(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    title: raw.title ?? raw.name ?? "",
    purpose: raw.purpose ?? "",
    createdAt: raw.createdAt ?? raw.created_at,
  }
}

async function enrichMoment(
  record: Record<string, unknown>,
  domainSlug?: string,
): Promise<EnrichmentResult> {
  const hiddenFields: string[] = ["journeyName", "pathName"]
  let breadcrumb: PresenceBreadcrumb | undefined

  const journeyName =
    (typeof record.journeyTitle === "string" ? record.journeyTitle : "") ||
    (typeof record.journeyName === "string" ? record.journeyName : "") ||
    ((record.Journey as { name?: string } | undefined)?.name ?? "")

  const pathName =
    (typeof record.pathName === "string" ? record.pathName : "") ||
    ((record.Path as { name?: string } | undefined)?.name ?? "")

  if (journeyName) {
    breadcrumb = { journey: journeyName, path: pathName || undefined }
  } else if (typeof record.journeyId === "string" && record.journeyId) {
    try {
      const jr = await apiFetch(`/api/journeys/${encodeURIComponent(record.journeyId)}`)
      const jRaw =
        (jr as { journey?: Record<string, unknown> })?.journey ??
        (jr as { data?: Record<string, unknown> })?.data ??
        (jr as Record<string, unknown>)
      const paths = normalizeJourneyPaths(jRaw)
      const matchedPath =
        typeof record.pathId === "string"
          ? paths.find((p) => p.id === record.pathId)
          : undefined
      breadcrumb = {
        journey: String(jRaw.name ?? ""),
        path: matchedPath?.name ?? (pathName || undefined),
      }
      record.journeyName = breadcrumb.journey
      if (breadcrumb.path) record.pathName = breadcrumb.path
    } catch {
      if (domainSlug && typeof record.id === "string") {
        try {
          const res = await apiFetch(
            `/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&limit=100`,
          )
          const rows = (res as { data?: Array<Record<string, unknown>> })?.data ?? []
          const found = rows.find((row) => row.id === record.id)
          if (found) {
            const jName =
              typeof found.journeyName === "string" ? found.journeyName : ""
            if (jName) {
              breadcrumb = { journey: jName }
              record.journeyName = jName
              record.title = record.title ?? found.title
              record.narrative =
                record.narrative ?? found.body ?? found.narrative ?? ""
            }
          }
        } catch {
          /* keep partial record */
        }
      }
    }
  }

  if (typeof record.updatedAt !== "string" && typeof record.updated_at === "string") {
    record.updatedAt = record.updated_at
  }

  const meta: PresenceMeta = {
    line: formatRelativeKept(record.keptAt, record.updatedAt ?? record.createdAt),
  }

  return { record, breadcrumb, meta, relatedSections: [], hiddenFields }
}

async function enrichJourney(record: Record<string, unknown>): Promise<EnrichmentResult> {
  const paths = normalizeJourneyPaths(record)
  const moments = extractJourneyMoments(record)
  const stats = record.stats as { totalMoments?: number; totalPaths?: number } | undefined
  const momentCount =
    stats?.totalMoments ??
    (typeof record.momentCount === "number"
      ? record.momentCount
      : moments.length || paths.reduce((sum, p) => sum + (p.momentCount ?? 0), 0))

  if (typeof record.createdAt !== "string" && typeof record.created_at === "string") {
    record.createdAt = record.created_at
  }

  const keeperRaw = record.keeper as { id?: string; title?: string } | null | undefined
  const keeper =
    keeperRaw?.title
      ? {
          id: keeperRaw.id ? String(keeperRaw.id) : "",
          title: String(keeperRaw.title),
        }
      : undefined

  const metaParts = [
    momentCount > 0
      ? `${momentCount} moment${momentCount === 1 ? "" : "s"}`
      : null,
    paths.length > 0 ? `${paths.length} path${paths.length === 1 ? "" : "s"}` : null,
    keeper?.title ? `Keeper · ${keeper.title}` : null,
    typeof record.createdAt === "string"
      ? `Created ${formatWhenShort(record.createdAt)}`
      : null,
  ].filter(Boolean)

  const relatedSections: RelatedSection[] = []

  if (paths.length > 0) {
    relatedSections.push({
      title: "Paths",
      items: paths.map((p) => ({
        id: p.id,
        label: p.name,
        preview: p.prelude || undefined,
        sub:
          p.momentCount != null
            ? `${p.momentCount} moment${p.momentCount === 1 ? "" : "s"}`
            : undefined,
      })),
    })
  }

  if (moments.length > 0) {
    relatedSections.push({
      title: "Moments in this Journey",
      items: moments,
    })
  } else if (momentCount > 0) {
    relatedSections.push({
      title: "Moments in this Journey",
      items: [],
    })
  }

  return {
    record,
    meta: {
      keeper,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
      momentCount,
      line: metaParts.join(" · ") || undefined,
    },
    relatedSections,
    hiddenFields: ["momentCountSummary", "keeperName"],
  }
}

async function enrichKeeper(
  record: Record<string, unknown>,
  keeperId: string,
  domainId: string,
): Promise<EnrichmentResult> {
  const relatedSections: RelatedSection[] = []

  try {
    const journeysRes = await apiFetch(
      `/api/journeys?keeperId=${encodeURIComponent(keeperId)}&limit=20`,
    )
    const journeyList =
      (journeysRes as { data?: { journeys?: Array<Record<string, unknown>> } })?.data
        ?.journeys ?? []
    const mapped = (Array.isArray(journeyList) ? journeyList : [])
      .map((j) => ({
        id: String(j.id ?? ""),
        label: String(j.name ?? "Untitled"),
        sub:
          typeof j.momentCount === "number"
            ? `${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}`
            : undefined,
        navigateKind: "journey" as const,
        updatedAt:
          typeof j.updatedAt === "string"
            ? j.updatedAt
            : typeof j.updated_at === "string"
              ? j.updated_at
              : undefined,
      }))
      .sort((a, b) => {
        const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0
        const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0
        return bTime - aTime
      })

    if (mapped.length > 0) {
      relatedSections.push({
        title: "Recent Sessions",
        items: mapped.slice(0, 6).map(({ id, label, sub, navigateKind }) => ({
          id,
          label,
          sub,
          navigateKind,
        })),
      })
    }
  } catch {
    /* sessions are ambient */
  }

  if (typeof record.createdAt !== "string" && typeof record.created_at === "string") {
    record.createdAt = record.created_at
  }

  const sessionCount = relatedSections[0]?.items.length ?? 0
  const metaParts = [
    sessionCount > 0
      ? `${sessionCount} session${sessionCount === 1 ? "" : "s"}`
      : null,
    typeof record.createdAt === "string"
      ? `Since ${formatWhenShort(record.createdAt)}`
      : null,
  ].filter(Boolean)

  return {
    record,
    meta: { line: metaParts.join(" · ") || undefined },
    relatedSections,
    hiddenFields: ["keeperType"],
  }
}

async function enrichAgent(record: Record<string, unknown>): Promise<EnrichmentResult> {
  const sessions = Array.isArray(record.recent_sessions)
    ? (record.recent_sessions as Array<Record<string, unknown>>)
    : []

  const relatedSections: RelatedSection[] =
    sessions.length > 0
      ? [
          {
            title: "Recent Sessions",
            items: sessions.slice(0, 6).map((s) => ({
              id: String(s.id ?? ""),
              label:
                (typeof s.session_name === "string" && s.session_name.trim()) ||
                String(s.id ?? "").slice(0, 8),
              sub:
                typeof s.created_at === "string"
                  ? formatWhenShort(s.created_at)
                  : undefined,
            })),
          },
        ]
      : []

  if (Array.isArray(record.tools)) {
    record.tools = (record.tools as unknown[]).join(", ")
  }

  const metaParts = [
    typeof record.status === "string" ? String(record.status) : null,
    typeof record.model === "string" ? String(record.model) : null,
  ].filter(Boolean)

  return {
    record,
    meta: { line: metaParts.join(" · ") || undefined },
    relatedSections,
    hiddenFields: [],
  }
}

async function enrichDialog(record: Record<string, unknown>): Promise<EnrichmentResult> {
  const mapped = mapDialogRecord(record)
  const metaParts = [
    typeof mapped.sessionCount === "number" && mapped.sessionCount > 0
      ? `${mapped.sessionCount} session${mapped.sessionCount === 1 ? "" : "s"}`
      : null,
    typeof mapped.updated_at === "string"
      ? formatWhenShort(mapped.updated_at as string)
      : null,
  ].filter(Boolean)

  return {
    record: mapped,
    meta: { line: metaParts.join(" · ") || undefined },
    relatedSections: [],
    hiddenFields: ["sessionCount"],
  }
}

async function enrichDraft(
  record: Record<string, unknown>,
  domainId: string,
  draftId: string,
): Promise<EnrichmentResult> {
  try {
    const found = await KipApi.getDraft(domainId, draftId)
    const mapped = mapDraftRecord(found as unknown as Record<string, unknown>)
    return {
      record: mapped,
      meta: {
        line: [
          typeof mapped.status === "string" ? String(mapped.status) : null,
          typeof mapped.updatedAt === "string"
            ? formatWhenShort(mapped.updatedAt as string)
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      },
      relatedSections: [],
      hiddenFields: ["status", "updatedAt", "kind"],
    }
  } catch {
    const mapped = mapDraftRecord(record)
    return {
      record: mapped,
      relatedSections: [],
      hiddenFields: ["status", "updatedAt", "kind"],
    }
  }
}

async function fetchKeeperRecord(
  objectId: string,
  domainId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await apiFetch(
      `/api/keepers/${encodeURIComponent(objectId)}?domainId=${encodeURIComponent(domainId)}`,
    )
    const keeper =
      (res as { keeper?: Record<string, unknown> })?.keeper ??
      (res as { data?: Record<string, unknown> })?.data ??
      null
    if (keeper && (keeper.id || keeper.title)) {
      return mapKeeperRecord(keeper)
    }
  } catch {
    /* fall through to list */
  }

  try {
    const listRes = await apiFetch(
      `/api/keepers?domainId=${encodeURIComponent(domainId)}&limit=100`,
    )
    const list =
      (listRes as { data?: { keepers?: Array<Record<string, unknown>> } })?.data?.keepers ??
      []
    const found = list.find((k) => k.id === objectId)
    return found ? mapKeeperRecord(found) : null
  } catch {
    return null
  }
}

/** Fetch a record when the generic endpoint is insufficient. */
export async function fetchPresenceRecord(
  objectType: string,
  objectId: string,
  domainId: string,
  domainSlug?: string,
): Promise<Record<string, unknown> | null> {
  switch (objectType) {
    case "draft": {
      try {
        const found = await KipApi.getDraft(domainId, objectId)
        return mapDraftRecord(found as unknown as Record<string, unknown>)
      } catch {
        return null
      }
    }
    case "dialog": {
      try {
        const res = await apiFetch(
          `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(objectId)}`,
        )
        const dialog = (res as { dialog?: Record<string, unknown> })?.dialog
        return dialog ? mapDialogRecord(dialog) : null
      } catch {
        return null
      }
    }
    case "moment": {
      try {
        const res = await apiFetch(`/api/moments/${encodeURIComponent(objectId)}`)
        const data =
          (res as { moment?: Record<string, unknown> })?.moment ??
          (res as { data?: Record<string, unknown> })?.data ??
          (res as Record<string, unknown>)
        return data as Record<string, unknown>
      } catch {
        if (!domainSlug) return null
        try {
          const res = await apiFetch(
            `/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&limit=100`,
          )
          const rows = (res as { data?: Array<Record<string, unknown>> })?.data ?? []
          const found = rows.find((row) => row.id === objectId)
          if (!found) return null
          return {
            id: String(found.id),
            title: String(found.title ?? ""),
            narrative: String(found.body ?? found.narrative ?? ""),
            updatedAt:
              typeof found.updatedAt === "string"
                ? found.updatedAt
                : typeof found.updated_at === "string"
                  ? found.updated_at
                  : undefined,
            journeyName:
              typeof found.journeyName === "string" ? found.journeyName : undefined,
          }
        } catch {
          return null
        }
      }
    }
    case "journey": {
      const res = await apiFetch(`/api/journeys/${encodeURIComponent(objectId)}`)
      const raw =
        (res as { journey?: Record<string, unknown> })?.journey ??
        (res as { data?: Record<string, unknown> })?.data ??
        (res as Record<string, unknown>)
      return raw as Record<string, unknown>
    }
    case "keeper":
      return fetchKeeperRecord(objectId, domainId)
    case "agent": {
      const res = await apiFetch(`/api/agents/${encodeURIComponent(objectId)}`)
      return (
        (res as { agent?: Record<string, unknown> })?.agent ??
        (res as { data?: Record<string, unknown> })?.data ??
        (res as Record<string, unknown>)
      ) as Record<string, unknown>
    }
    default:
      return null
  }
}

export async function enrichPresenceRecord(
  objectType: string,
  objectId: string,
  domainId: string,
  record: Record<string, unknown>,
  domainSlug?: string,
): Promise<EnrichmentResult> {
  switch (objectType) {
    case "moment":
      return enrichMoment(record, domainSlug)
    case "journey":
      return enrichJourney(record)
    case "keeper":
      return enrichKeeper(record, objectId, domainId)
    case "agent":
      return enrichAgent(record)
    case "dialog":
      return enrichDialog(record)
    case "draft":
      return enrichDraft(record, domainId, objectId)
    default:
      return { record, relatedSections: [], hiddenFields: [] }
  }
}

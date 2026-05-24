/**
 * presenceEnrichment
 * ==================
 * Resolves contextual metadata and related content for Chronicle presence.
 * Inherits the Domain Board Chronicle instincts — journey-first hierarchy,
 * source names, timestamps — without duplicating bespoke view logic.
 */

import { apiFetch } from "../../lib/api"
import { KipApi } from "../../lib/kipApi"

export interface RelatedItem {
  id: string
  label: string
  sub?: string
  /** When set, Chronicle can navigate to this related record. */
  navigateKind?: "journey" | "moment"
}

export interface RelatedSection {
  title: string
  items: RelatedItem[]
}

export interface PresenceBreadcrumb {
  journey: string
  path?: string
}

export interface EnrichmentResult {
  record: Record<string, unknown>
  breadcrumb?: PresenceBreadcrumb
  relatedSections: RelatedSection[]
  /** Schema field keys rendered elsewhere (e.g. breadcrumb) — omit from body. */
  hiddenFields: string[]
}

function normalizeJourneyPaths(raw: Record<string, unknown>) {
  const pathsRaw = (raw.paths ?? raw.Path ?? []) as Array<Record<string, unknown>>
  return pathsRaw.map((p) => ({
    id: String(p.id ?? ""),
    name: String(p.name ?? "Untitled path"),
    momentCount:
      typeof p.momentCount === "number"
        ? p.momentCount
        : Array.isArray(p.Moment)
          ? p.Moment.length
          : 0,
  }))
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

async function enrichMoment(
  record: Record<string, unknown>,
  domainSlug?: string,
): Promise<EnrichmentResult> {
  const hiddenFields: string[] = []
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
    hiddenFields.push("journeyName", "pathName")
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
      hiddenFields.push("journeyName", "pathName")
    } catch {
      // v0 moments fallback when primary fetch already failed upstream
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
              hiddenFields.push("journeyName", "pathName")
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

  return { record, breadcrumb, relatedSections: [], hiddenFields }
}

async function enrichJourney(record: Record<string, unknown>): Promise<EnrichmentResult> {
  const paths = normalizeJourneyPaths(record)
  const momentCount =
    typeof record.momentCount === "number"
      ? record.momentCount
      : paths.reduce((sum, p) => sum + (p.momentCount ?? 0), 0)

  if (typeof record.createdAt !== "string" && typeof record.created_at === "string") {
    record.createdAt = record.created_at
  }

  const relatedSections: RelatedSection[] =
    paths.length > 0
      ? [
          {
            title: "Paths",
            items: paths.map((p) => ({
              id: p.id,
              label: p.name,
              sub:
                p.momentCount != null
                  ? `${p.momentCount} moment${p.momentCount === 1 ? "" : "s"}`
                  : undefined,
            })),
          },
        ]
      : []

  if (momentCount > 0) {
    record.momentCountSummary = `${momentCount} moment${momentCount === 1 ? "" : "s"} across all paths`
  }

  return { record, relatedSections, hiddenFields: [] }
}

async function enrichKeeper(
  record: Record<string, unknown>,
  keeperId: string,
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
    /* sessions are ambient — absence is fine */
  }

  if (typeof record.createdAt !== "string" && typeof record.created_at === "string") {
    record.createdAt = record.created_at
  }

  return { record, relatedSections, hiddenFields: [] }
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
                  ? new Date(s.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : undefined,
            })),
          },
        ]
      : []

  if (Array.isArray(record.tools)) {
    record.tools = (record.tools as unknown[]).join(", ")
  }

  return { record, relatedSections, hiddenFields: [] }
}

async function enrichDialog(record: Record<string, unknown>): Promise<EnrichmentResult> {
  return {
    record: mapDialogRecord(record),
    relatedSections: [],
    hiddenFields: [],
  }
}

async function enrichDraft(
  record: Record<string, unknown>,
  domainId: string,
  draftId: string,
): Promise<EnrichmentResult> {
  try {
    const found = await KipApi.getDraft(domainId, draftId)
    return {
      record: mapDraftRecord(found as unknown as Record<string, unknown>),
      relatedSections: [],
      hiddenFields: [],
    }
  } catch {
    return {
      record: mapDraftRecord(record),
      relatedSections: [],
      hiddenFields: [],
    }
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
    case "keeper": {
      const res = await apiFetch(
        `/api/keepers/${encodeURIComponent(objectId)}?domainId=${encodeURIComponent(domainId)}`,
      )
      return (
        (res as { keeper?: Record<string, unknown> })?.keeper ??
        (res as { data?: Record<string, unknown> })?.data ??
        (res as Record<string, unknown>)
      ) as Record<string, unknown>
    }
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
      return enrichKeeper(record, objectId)
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

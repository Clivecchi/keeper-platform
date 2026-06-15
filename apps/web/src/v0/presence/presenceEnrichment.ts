/**
 * presenceEnrichment
 * ==================
 * Resolves contextual metadata and related content for Chronicle presence.
 * Inherits the Journeys Frame / Domain Board instincts — journey-first hierarchy,
 * moment threads, keeper context — without duplicating bespoke view logic.
 */

import { apiFetch } from "../../lib/api"
import { KipApi } from "../../lib/kipApi"
import { BOARD_DEFINITIONS } from "../boards/UniversalBoardDefinition"
import { BOARD_FRAMES } from "../boards/frameCatalog"
import { FRAME_TO_JSON_KEY } from "../shell/frameRegistryMap"
import {
  fetchDomainBoardData,
  normalizeFrameProps,
  resolveFrameInstanceByKey,
} from "./frameProps"

export interface RelatedItem {
  id: string
  label: string
  sub?: string
  preview?: string
  navigateKind?: "journey" | "moment" | "keeper" | "session"
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

/** Optional context passed into enrichment — not stored on the record. */
export interface PresenceEnrichmentContext {
  domainSlug?: string
  domainName?: string
  activeBoardForFrames?: string
  domainId?: string
}

type JourneyBrief = {
  id: string
  name: string
  momentCount?: number
}

type RecentMoment = {
  id: string
  title: string
  keptAt: string | null
  createdAt: string
  journeyName?: string | null
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

type DialogSessionRow = {
  id: string
  session_name?: string | null
  created_at?: string
  updated_at?: string
  kip_messages?: Array<{ role?: string; content?: string; created_at?: string }>
}

function truncatePreview(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1)}…`
}

function dialogSessionLabel(session: DialogSessionRow): string {
  if (typeof session.session_name === "string" && session.session_name.trim()) {
    return session.session_name.trim()
  }
  return `Session ${session.id.slice(0, 8)}`
}

function dialogSessionActivityIso(session: DialogSessionRow): string | undefined {
  const messages = session.kip_messages ?? []
  const lastMessage = messages[messages.length - 1]
  const iso =
    (typeof lastMessage?.created_at === "string" && lastMessage.created_at) ||
    (typeof session.updated_at === "string" && session.updated_at) ||
    (typeof session.created_at === "string" && session.created_at) ||
    undefined
  return iso || undefined
}

function dialogSessionActivityTime(session: DialogSessionRow): number {
  const iso = dialogSessionActivityIso(session)
  return iso ? Date.parse(iso) : 0
}

function normalizeDialogSessions(record: Record<string, unknown>): DialogSessionRow[] {
  const raw = Array.isArray(record.sessions) ? record.sessions : []
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const s = row as Record<string, unknown>
      const id = typeof s.id === "string" ? s.id : ""
      if (!id) return null
      return {
        id,
        session_name: typeof s.session_name === "string" ? s.session_name : null,
        created_at: typeof s.created_at === "string" ? s.created_at : undefined,
        updated_at: typeof s.updated_at === "string" ? s.updated_at : undefined,
        kip_messages: Array.isArray(s.kip_messages)
          ? (s.kip_messages as DialogSessionRow["kip_messages"])
          : [],
      } satisfies DialogSessionRow
    })
    .filter((s): s is DialogSessionRow => s !== null)
    .sort((a, b) => dialogSessionActivityTime(b) - dialogSessionActivityTime(a))
}

function extractDialogExchangePreview(session: DialogSessionRow): string | undefined {
  const messages = session.kip_messages ?? []
  if (messages.length === 0) return undefined

  const lastUser = [...messages]
    .reverse()
    .find((m) => m.role === "user" && typeof m.content === "string" && m.content.trim())
  const lastAgent = [...messages]
    .reverse()
    .find(
      (m) =>
        (m.role === "assistant" || m.role === "agent") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )

  const userText =
    typeof lastUser?.content === "string" ? truncatePreview(lastUser.content, 72) : ""
  const agentText =
    typeof lastAgent?.content === "string" ? truncatePreview(lastAgent.content, 96) : ""

  if (userText && agentText) {
    return `"${userText}" → ${agentText}`
  }
  if (agentText) return agentText
  if (userText) return userText
  return undefined
}

function dialogSessionSub(session: DialogSessionRow): string | undefined {
  const count = session.kip_messages?.length ?? 0
  const activityIso = dialogSessionActivityIso(session)
  const when = activityIso ? formatRelativeKept(null, activityIso) : undefined
  const countLabel =
    count > 0 ? `${count} message${count === 1 ? "" : "s"}` : "No messages yet"
  return when ? `${countLabel} · ${when}` : countLabel
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

function isLeadAgentRecord(record: Record<string, unknown>): boolean {
  const agentRole = typeof record.role === "string" ? record.role : ""
  const slug = typeof record.slug === "string" ? record.slug : ""
  return agentRole === "Lead" || slug === "kip"
}

async function enrichAgent(
  record: Record<string, unknown>,
  domainId: string,
): Promise<EnrichmentResult> {
  const agentId = typeof record.id === "string" ? record.id : ""
  const isLead = isLeadAgentRecord(record)

  if (record.config && typeof record.config === "object" && !Array.isArray(record.config)) {
    const cfg = record.config as Record<string, unknown>
    if (typeof cfg.tagline === "string") {
      record.tagline = cfg.tagline
    }
    if (typeof cfg.personality === "string") {
      record.personality = cfg.personality
    }
    if (typeof cfg.avatar === "string") {
      record.avatar = cfg.avatar
    }
    if (typeof cfg.theme_color === "string") {
      record.theme_color = cfg.theme_color
    }
  }

  if (typeof record.memory_enabled === "boolean") {
    record.memory_enabled = record.memory_enabled ? "true" : "false"
  }
  if (typeof record.model_provider === "string") {
    record.model_provider = record.model_provider
  }
  if (typeof record.visibility === "string") {
    record.visibility = record.visibility
  }

  if (agentId && isLead) {
    try {
      const query = domainId
        ? `?domainId=${encodeURIComponent(domainId)}`
        : ""
      const res = (await apiFetch(
        `/api/agents/${encodeURIComponent(agentId)}/composed-prompt${query}`,
      )) as { composedSystemPrompt?: string }
      if (typeof res.composedSystemPrompt === "string" && res.composedSystemPrompt.trim()) {
        record.composedSystemPrompt = res.composedSystemPrompt
      }
    } catch {
      /* non-fatal — Chronicle still shows other agent fields */
    }
  }

  if (record.config && typeof record.config === "object" && !Array.isArray(record.config)) {
    const cfg = record.config as Record<string, unknown>
    if (typeof cfg.voice_prompt === "string") {
      record.lensSystemPrompt = cfg.voice_prompt
    }
  }

  if (isLead && agentId && domainId) {
    try {
      const modeRes = (await apiFetch(
        `/api/kip/agents/${encodeURIComponent(agentId)}/mode-config?domainId=${encodeURIComponent(domainId)}`,
      )) as {
        success?: boolean
        data?: { resolvedLens?: { id?: string; name?: string } }
      }
      const resolvedLens = modeRes.data?.resolvedLens
      if (typeof resolvedLens?.name === "string") {
        record.lensName = resolvedLens.name
      }
      if (typeof resolvedLens?.id === "string") {
        record.lensId = resolvedLens.id
      }
    } catch {
      /* non-fatal — composed preview still loads */
    }
  }

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
    hiddenFields: isLead
      ? ["lensId", "lensName"]
      : ["lensId", "lensName", "composedSystemPrompt"],
  }
}

async function enrichDialog(record: Record<string, unknown>): Promise<EnrichmentResult> {
  const mapped = mapDialogRecord(record)
  const sessions = normalizeDialogSessions(record)
  const relatedSections: RelatedSection[] = []

  const sessionsWithMessages = sessions.filter((s) => (s.kip_messages?.length ?? 0) > 0)
  const arcItems = sessionsWithMessages.slice(0, 4).map((session) => ({
    id: session.id,
    label: dialogSessionLabel(session),
    sub: dialogSessionSub(session),
    preview: extractDialogExchangePreview(session),
    navigateKind: "session" as const,
  }))

  if (arcItems.length > 0) {
    relatedSections.push({
      title: "Recent Exchanges",
      items: arcItems,
    })
  }

  const sessionItems = sessions.slice(0, 5).map((session) => ({
    id: session.id,
    label: dialogSessionLabel(session),
    sub: dialogSessionSub(session),
    navigateKind: "session" as const,
  }))

  if (sessionItems.length > 0) {
    relatedSections.push({
      title: "Sessions",
      items: sessionItems,
    })
  }

  const metaParts = [
    sessions.length > 0
      ? `${sessions.length} session${sessions.length === 1 ? "" : "s"}`
      : null,
    typeof mapped.updated_at === "string"
      ? formatWhenShort(mapped.updated_at as string)
      : null,
  ].filter(Boolean)

  return {
    record: mapped,
    meta: { line: metaParts.join(" · ") || undefined },
    relatedSections,
    hiddenFields: ["sessionCount", "sessions"],
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

async function enrichDomain(
  record: Record<string, unknown>,
  domainId: string,
  ctx?: PresenceEnrichmentContext,
): Promise<EnrichmentResult> {
  const relatedSections: RelatedSection[] = []

  try {
    const domainRes = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}`)
    const domain = (domainRes as { domain?: Record<string, unknown> })?.domain
    if (domain) {
      record.id = domain.id ?? domainId
      record.name = domain.name ?? record.name
      record.description = domain.description ?? record.description
      record.purpose = domain.description ?? record.purpose
      record.slug = domain.slug ?? record.slug
      record.status = domain.status ?? record.status
      record.visibility = domain.isPublic === true ? "public" : "private"

      const theme =
        domain.theme && typeof domain.theme === "object"
          ? (domain.theme as Record<string, unknown>)
          : {}
      const colors =
        theme.colors && typeof theme.colors === "object"
          ? (theme.colors as Record<string, unknown>)
          : {}
      if (typeof colors.primary === "string") {
        record.theme_color = colors.primary
      }

      const settings =
        domain.settings && typeof domain.settings === "object"
          ? (domain.settings as Record<string, unknown>)
          : {}
      if (typeof settings.keeperTypeKey === "string") {
        record.keeperType = settings.keeperTypeKey
      }
      const ideBuild =
        settings.ideBuildContext && typeof settings.ideBuildContext === "object"
          ? (settings.ideBuildContext as Record<string, unknown>)
          : {}
      if (typeof ideBuild.name === "string") record.buildContextName = ideBuild.name
      if (typeof ideBuild.description === "string") {
        record.buildContextDescription = ideBuild.description
      }
      if (typeof ideBuild.activeRepository === "string") {
        record.activeRepository = ideBuild.activeRepository
      }
      if (typeof ideBuild.activeBranch === "string") {
        record.activeBranch = ideBuild.activeBranch
      }
      if (typeof ideBuild.environment === "string") {
        record.environment = ideBuild.environment
      }
    }
  } catch {
    /* domain record optional for enrichment */
  }

  if (ctx?.domainSlug) {
    try {
      const frameRes = await apiFetch(
        `/api/domains/${encodeURIComponent(ctx.domainSlug)}/frame`,
      )
      if (frameRes && typeof frameRes === "object") {
        const frame = frameRes as Record<string, unknown>
        const theme =
          frame.theme && typeof frame.theme === "object"
            ? (frame.theme as Record<string, unknown>)
            : {}
        if (typeof theme.tagline === "string") record.tagline = theme.tagline
        const colors =
          theme.colors && typeof theme.colors === "object"
            ? (theme.colors as Record<string, unknown>)
            : {}
        if (typeof colors.primary === "string" && !record.theme_color) {
          record.theme_color = colors.primary
        }
        const kip =
          frame.kip && typeof frame.kip === "object"
            ? (frame.kip as Record<string, unknown>)
            : {}
        if (typeof kip.visibility === "string") {
          record.visibility = kip.visibility
        }
      }
    } catch {
      /* frame optional */
    }
  }

  if (ctx?.domainName && !record.name) {
    record.name = ctx.domainName
  }

  try {
    const journeysRes = await apiFetch(
      `/api/journeys?domainId=${encodeURIComponent(domainId)}`,
    )
    const journeyList =
      (journeysRes as { data?: { journeys?: JourneyBrief[] } })?.data?.journeys ?? []
    const journeys = Array.isArray(journeyList) ? journeyList : []
    const moving = journeys.filter((j) => (j.momentCount ?? 0) > 0)
    const settled = journeys.filter((j) => !j.momentCount || j.momentCount === 0)

    if (ctx?.domainSlug) {
      try {
        const momentsRes = await apiFetch(
          `/api/v0/moments?domainSlug=${encodeURIComponent(ctx.domainSlug)}&status=kept&limit=12`,
        )
        const moments = (momentsRes as { data?: RecentMoment[] })?.data ?? []
        if (Array.isArray(moments) && moments.length > 0) {
          relatedSections.push({
            title: "Recent Moments",
            items: moments.map((m) => ({
              id: m.id,
              label: m.title?.trim() || "Untitled moment",
              sub: [m.journeyName, formatWhenShort(m.keptAt ?? m.createdAt)]
                .filter(Boolean)
                .join(" · ") || undefined,
              navigateKind: "moment" as const,
            })),
          })
        }
      } catch {
        /* ambient feed */
      }
    }

    if (moving.length > 0) {
      relatedSections.push({
        title: "Moving",
        items: moving.map((j) => ({
          id: j.id,
          label: j.name || "Untitled",
          sub:
            j.momentCount != null
              ? `${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}`
              : undefined,
          navigateKind: "journey" as const,
        })),
      })
    }

    if (settled.length > 0) {
      relatedSections.push({
        title: "Present",
        items: settled.map((j) => ({
          id: j.id,
          label: j.name || "Untitled",
          navigateKind: "journey" as const,
        })),
      })
    }

    const metaParts = [
      journeys.length > 0
        ? `${journeys.length} journey${journeys.length === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean)

    return {
      record,
      meta: { line: metaParts.join(" · ") || undefined },
      relatedSections,
      hiddenFields: ["slug", "status"],
    }
  } catch {
    return { record, relatedSections, hiddenFields: ["slug", "status"] }
  }
}

async function enrichFrame(
  record: Record<string, unknown>,
  frameKey: string,
  ctx?: PresenceEnrichmentContext,
): Promise<EnrichmentResult> {
  const activeBoard = ctx?.activeBoardForFrames ?? "domain"
  const frames = BOARD_FRAMES[activeBoard] ?? []
  const frameInfo = frames.find((f) => f.key === frameKey)

  record.name = frameInfo?.name ?? frameKey
  record.frameKey = frameKey
  record.boardId = activeBoard
  record.frameInstanceId = null
  record.frameProps = []
  record.pattern = undefined
  record.visibility = undefined
  record.description = ""
  record.frameJson = undefined
  record.domainSnapshot = undefined

  if (ctx?.domainId) {
    const boardData = await fetchDomainBoardData(ctx.domainId)
    if (boardData) {
      record.domainSnapshot = boardData.domain
      const instance = resolveFrameInstanceByKey(
        boardData.board.frames,
        frameKey,
        activeBoard,
      )
      if (instance) {
        record.frameInstanceId = instance.id
        record.pattern = instance.pattern
        record.visibility = instance.visibility
        record.frameProps = normalizeFrameProps(instance.props)
      }
    }
  }

  const jsonKey = FRAME_TO_JSON_KEY[frameKey]
  if (jsonKey && ctx?.domainId) {
    try {
      const slug = ctx.domainSlug ?? "default"
      const frameRes = await apiFetch(
        `/api/domains/${encodeURIComponent(slug)}/frame`,
      ).catch(() => null)
      if (frameRes && typeof frameRes === "object") {
        const domainFrame = frameRes as Record<string, unknown>
        const block = domainFrame[jsonKey]
        if (block && typeof block === "object") {
          const obj = block as Record<string, unknown>
          const title =
            (typeof obj.frame_title === "string" && obj.frame_title) ||
            (typeof obj.title === "string" && obj.title) ||
            ""
          const forward =
            (typeof obj.forward === "string" && obj.forward) ||
            (typeof obj.description === "string" && obj.description) ||
            ""
          record.description = forward || title || ""
          record.frameJson = JSON.stringify(block, null, 2)
        }
      }
    } catch {
      /* frame JSON is ambient */
    }
  }

  const propCount = Array.isArray(record.frameProps)
    ? record.frameProps.length
    : 0

  return {
    record,
    meta: {
      line: [
        frameInfo?.name ?? frameKey,
        record.pattern ? String(record.pattern) : null,
        propCount > 0 ? `${propCount} prop${propCount === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    relatedSections: [],
    hiddenFields: [
      "frameKey",
      "boardId",
      "frameInstanceId",
      "frameProps",
      "pattern",
      "visibility",
      "frameJson",
      "domainSnapshot",
    ],
  }
}

async function enrichBoardDef(
  record: Record<string, unknown>,
  boardDefId: string,
): Promise<EnrichmentResult> {
  const def = BOARD_DEFINITIONS[boardDefId]
  if (def) {
    record.title = def.displayName
    record.boardId = def.boardId
    record.boardDefId = boardDefId
  }

  return {
    record,
    meta: {
      line: def
        ? [
            def.boardId,
            def.access.isAdminOnly ? "admin only" : null,
            def.access.isPrivate ? "private" : null,
            `${def.contextSurface.viewStates.length} chronicle subjects`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        : undefined,
    },
    relatedSections: [],
    hiddenFields: ["boardId", "boardDefId"],
  }
}

async function enrichService(
  record: Record<string, unknown>,
  serviceSlug: string,
  domainId?: string,
): Promise<EnrichmentResult> {
  const label =
    serviceSlug.charAt(0).toUpperCase() + serviceSlug.slice(1)

  record.name = label
  record.slug = serviceSlug
  record.status = "disconnected"

  if (domainId) {
    try {
      const list = (await apiFetch(
        `/api/integrations?domainId=${encodeURIComponent(domainId)}`,
      )) as Array<{ service: string; status?: string; connectedAt?: string | null }>
      const row =
        list.find((i) => i.service === serviceSlug && i.status) ??
        list.find((i) => i.service === serviceSlug)
      if (row?.status) {
        record.status = row.status
        if (row.connectedAt) {
          record.lastActive = row.connectedAt
        }
      }
    } catch {
      /* Chronicle IntegrationPresence owns connect UI; enrichment stays best-effort */
    }
  }

  return {
    record,
    meta: { line: "Platform integration" },
    relatedSections: [],
    hiddenFields: ["slug"],
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
    case "domain":
      return { id: objectId, name: "" }
    case "frame":
      return { frameKey: objectId, name: objectId }
    case "boardDef": {
      const def = BOARD_DEFINITIONS[objectId]
      if (!def) return { boardId: objectId, title: objectId, boardDefId: objectId }
      return {
        boardId: def.boardId,
        title: def.displayName,
        boardDefId: objectId,
      }
    }
    case "service":
      return { slug: objectId, name: objectId }
    case "key": {
      try {
        const row = await apiFetch(`/api/keys/${encodeURIComponent(objectId)}`)
        return row as Record<string, unknown>
      } catch {
        return null
      }
    }
    case "capability": {
      try {
        const row = await apiFetch(`/api/capabilities/${encodeURIComponent(objectId)}`)
        return row as Record<string, unknown>
      } catch {
        return null
      }
    }
    case "library": {
      try {
        const row = await apiFetch(`/api/library-items/${encodeURIComponent(objectId)}`)
        return row as Record<string, unknown>
      } catch {
        return null
      }
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
  ctx?: PresenceEnrichmentContext,
): Promise<EnrichmentResult> {
  const enrichmentCtx: PresenceEnrichmentContext = {
    domainSlug,
    domainId,
    ...ctx,
  }

  switch (objectType) {
    case "moment":
      return enrichMoment(record, domainSlug)
    case "journey":
      return enrichJourney(record)
    case "keeper":
      return enrichKeeper(record, objectId, domainId)
    case "agent":
      return enrichAgent(record, domainId)
    case "dialog":
      return enrichDialog(record)
    case "draft":
      return enrichDraft(record, domainId, objectId)
    case "domain":
      return enrichDomain(record, domainId, enrichmentCtx)
    case "frame":
      return enrichFrame(record, objectId, enrichmentCtx)
    case "boardDef":
      return enrichBoardDef(record, objectId)
    case "service":
      return enrichService(record, objectId, domainId)
    default:
      return { record, relatedSections: [], hiddenFields: [] }
  }
}

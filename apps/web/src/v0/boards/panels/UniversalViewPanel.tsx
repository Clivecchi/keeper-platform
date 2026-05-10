"use client"

/**
 * UniversalViewPanel — Chronicle
 * ================================
 * KE3P · Keeper Platform · Universal Board — Right Panel
 *
 * Chronicle is the right panel for all Universal Boards.
 * It is a TreatmentSurface — reads context at runtime, not hardcoded behavior.
 *
 * Three elements:
 *   Trail Bar    — permanent top, history stack (max 3 visible), feed indicator, lateral slide
 *   Panel Body   — mini-router over panelHistory[currentIndex], opacity dissolve on shift
 *   Idle State   — UniversalViewPanelIdle, domain name + ambient awareness, never empty
 *
 * Motion — Framer Motion only at this tier:
 *   Lateral slide on Trail Bar history change (200ms entry, 140ms exit)
 *   Opacity dissolve on Panel Body context shift (200ms entry, 140ms exit)
 *
 * Edit — fields editable by default, no view/edit toggle, debounced autosave at 1000ms.
 *
 * Colors — all hsl(var(--theme-*)) — zero hardcoded values.
 *
 * CRITICAL RULES:
 * - Never call /api/domains/by-slug — domainId is always received as a prop.
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - Presence surfaces fetch their own data — the panel is self-sufficient.
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { apiFetch } from "../../../lib/api"
import { useUniversalBoardOptional } from "../UniversalBoardContext"
import type { UniversalBoardDef } from "../UniversalBoardDefinition"
import { ServicesFrame } from "../../components/ServicesFrame"

// ─── Trail Types ──────────────────────────────────────────────────────────────

type TrailKind = "domain" | "journey" | "moment" | "keeper" | "draft" | "agent" | "service"
type TrailDirection = "forward" | "back"

interface TrailEntry {
  /** Unique key — also used as AnimatePresence key and label-resolution target. */
  key: string
  kind: TrailKind
  id: string | null
  /** Display label — set initially to kind name, updated asynchronously by views. */
  label: string
}

// ─── API data shapes ──────────────────────────────────────────────────────────

type MomentDetail = {
  id: string
  title: string
  narrative?: string
  updatedAt?: string
  /** Optional: parent journey resolved from the API response or a secondary fetch. */
  journeyId?: string
  journeyTitle?: string
  pathId?: string
  pathName?: string
}

type JourneyDetail = {
  id: string
  name: string
  forward?: string
  paths?: Array<{ id: string; name: string; momentCount?: number }>
  momentCount?: number
}

type KeeperDetail = {
  id: string
  title: string
  purpose?: string
  journeys?: Array<{ id: string; name: string; momentCount?: number }>
}

type JourneyBrief = {
  id: string
  name: string
  momentCount?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function kindLabel(kind: TrailKind, domainName?: string): string {
  if (kind === "domain") return domainName?.trim() || "Home"
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Presence primitives ──────────────────────────────────────────────────────
// Calm. Present. Not loud. Things that matter come forward through weight and position.

function PresenceLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "hsl(var(--theme-ink-tertiary) / 0.65)" }}
    >
      {children}
    </p>
  )
}

function PresenceSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <p
        className="text-[9px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary) / 0.5)" }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function PresenceThread({
  label,
  sub,
  onClick,
}: {
  label: string
  sub?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left group flex items-start gap-2 py-1.5 transition-opacity hover:opacity-80"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <span
        className="mt-[6px] w-1 h-1 rounded-full shrink-0 opacity-30 group-hover:opacity-60 transition-opacity"
        style={{ background: "hsl(var(--theme-ink-tertiary))" }}
      />
      <span className="flex-1 min-w-0">
        <span
          className="block text-[12px] leading-snug truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {label}
        </span>
        {sub && (
          <span
            className="block text-[10px] leading-snug mt-0.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {sub}
          </span>
        )}
      </span>
    </button>
  )
}

function PresenceShimmer({ width = "w-28" }: { width?: string }) {
  return (
    <div
      className={`h-2.5 ${width} rounded animate-pulse mb-2`}
      style={{ background: "hsl(var(--theme-surface-elevated) / 0.45)" }}
    />
  )
}

function PresenceDivider() {
  return (
    <div
      className="my-3 shrink-0"
      style={{ height: 1, background: "hsl(var(--theme-border-soft) / 0.15)" }}
    />
  )
}

// ─── AutoResizeTextarea ───────────────────────────────────────────────────────
// Editable field — grows with content. No view/edit toggle.

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none ${className ?? ""}`}
      style={{ border: "none", padding: 0, ...style }}
    />
  )
}

// ─── Trail Bar ────────────────────────────────────────────────────────────────
// Permanent top. History stack (max 3 visible). Feed indicator right.
// Lateral slide 200ms entry / 140ms exit on history change.

interface TrailBarProps {
  entries: TrailEntry[]
  currentIndex: number
  onNavigate: (index: number) => void
  feedCount: number
  direction: TrailDirection
}

function TrailBar({
  entries,
  currentIndex,
  onNavigate,
  feedCount,
  direction,
}: TrailBarProps) {
  // Always show up to 3 entries ending at currentIndex.
  const windowStart = Math.max(0, currentIndex - 2)
  const shown = entries.slice(windowStart, currentIndex + 1)
  const hasOlder = windowStart > 0

  // Direction determines which axis items enter/exit from.
  const xIn = direction === "forward" ? 14 : -14
  const xOut = direction === "forward" ? -14 : 14

  return (
    <div
      className="shrink-0 flex items-center gap-1 px-3 py-2"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.2)",
        minHeight: 36,
      }}
    >
      {/* Older history compressor — tappable */}
      {hasOlder && (
        <button
          type="button"
          onClick={() => onNavigate(Math.max(0, windowStart - 1))}
          className="shrink-0 text-[11px] font-medium px-1 leading-none transition-opacity hover:opacity-80"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          aria-label="Navigate to older history"
        >
          ···
        </button>
      )}

      {/* Visible trail chips with lateral slide */}
      <div
        className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden"
      >
        <AnimatePresence initial={false} mode="sync">
          {shown.map((entry, i) => {
            const globalIdx = windowStart + i
            const isCurrent = globalIdx === currentIndex
            return (
              <motion.button
                key={entry.key}
                type="button"
                layout
                onClick={() => onNavigate(globalIdx)}
                initial={{ x: xIn, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                  transition: { duration: 0.2, ease: "easeOut" },
                }}
                exit={{
                  x: xOut,
                  opacity: 0,
                  transition: { duration: 0.14, ease: "easeIn" },
                }}
                className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors truncate"
                style={{
                  maxWidth: 90,
                  background: isCurrent
                    ? "hsl(var(--theme-surface-elevated))"
                    : "transparent",
                  color: isCurrent
                    ? "hsl(var(--theme-ink-primary))"
                    : "hsl(var(--theme-ink-tertiary))",
                  border: `1px solid ${
                    isCurrent
                      ? "hsl(var(--theme-border-soft) / 0.5)"
                      : "transparent"
                  }`,
                }}
              >
                {entry.label}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Feed indicator — soft dot + count, 60-second polling */}
      {feedCount > 0 && (
        <div className="shrink-0 flex items-center gap-1 ml-1">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--theme-accent-primary) / 0.7)" }}
          />
          <span
            className="text-[9px] tabular-nums"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {feedCount}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── UniversalViewPanelIdle ───────────────────────────────────────────────────
// Idle / domain state. Domain name + ambient awareness. Never empty.
// Named export — done condition requires it to be addressable by name.

export interface UniversalViewPanelIdleProps {
  domainId: string | null
  domainName: string
  /**
   * When provided the idle state fetches and shows recent kept Moments from the domain —
   * the domain feed ambient state. Intended for Domain Board.
   */
  domainSlug?: string
  onJourneySelect?: (id: string) => void
}

type RecentMoment = { id: string; title: string; keptAt: string | null; createdAt: string; journeyName?: string | null }

function formatWhenShort(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function UniversalViewPanelIdle({
  domainId,
  domainName,
  domainSlug,
  onJourneySelect,
}: UniversalViewPanelIdleProps) {
  const [journeys, setJourneys] = React.useState<JourneyBrief[] | null>(null)
  const [moments, setMoments] = React.useState<RecentMoment[] | null>(null)

  React.useEffect(() => {
    if (!domainId) {
      setJourneys([])
      return
    }
    let cancelled = false
    setJourneys(null)
    apiFetch(`/api/journeys?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const list =
          (res as { data?: { journeys?: JourneyBrief[] } })?.data?.journeys ?? []
        setJourneys(Array.isArray(list) ? (list as JourneyBrief[]) : [])
      })
      .catch(() => {
        if (!cancelled) setJourneys([])
      })
    return () => {
      cancelled = true
    }
  }, [domainId])

  // Domain feed: fetch recent kept Moments when domainSlug is provided.
  React.useEffect(() => {
    if (!domainSlug) {
      setMoments(null)
      return
    }
    let cancelled = false
    apiFetch(`/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=kept&limit=12`)
      .then((res: unknown) => {
        if (cancelled) return
        const rows = (res as { data?: RecentMoment[] })?.data
        setMoments(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setMoments([])
      })
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  const moving = journeys?.filter((j) => (j.momentCount ?? 0) > 0) ?? []
  const settled = journeys?.filter((j) => !j.momentCount || j.momentCount === 0) ?? []
  const hasMoments = moments && moments.length > 0

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}
      >
        <PresenceLabel>Domain</PresenceLabel>
        <h2
          className="text-[14px] font-semibold leading-snug mt-1"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {domainName || "—"}
        </h2>
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {/* Domain feed: recent kept Moments — shown when domainSlug is provided */}
        {domainSlug && hasMoments && (
          <>
            <PresenceSection title="Recent Moments">
              {moments!.map((m) => (
                <PresenceThread
                  key={m.id}
                  label={m.title?.trim() || "Untitled moment"}
                  sub={
                    [m.journeyName, formatWhenShort(m.keptAt ?? m.createdAt)]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                />
              ))}
            </PresenceSection>
            <PresenceDivider />
          </>
        )}

        {journeys === null ? (
          <>
            <PresenceShimmer width="w-32" />
            <PresenceShimmer width="w-24" />
            <PresenceShimmer width="w-28" />
          </>
        ) : journeys.length === 0 ? (
          <p
            className="text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No journeys yet.
          </p>
        ) : (
          <>
            {moving.length > 0 && (
              <PresenceSection title="Moving">
                {moving.map((j) => (
                  <PresenceThread
                    key={j.id}
                    label={j.name || "Untitled"}
                    sub={
                      j.momentCount != null
                        ? `${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}`
                        : undefined
                    }
                    onClick={() => onJourneySelect?.(j.id)}
                  />
                ))}
              </PresenceSection>
            )}
            {settled.length > 0 && (
              <>
                {moving.length > 0 && <PresenceDivider />}
                <PresenceSection title="Present">
                  {settled.map((j) => (
                    <PresenceThread
                      key={j.id}
                      label={j.name || "Untitled"}
                      onClick={() => onJourneySelect?.(j.id)}
                    />
                  ))}
                </PresenceSection>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── JourneyView ──────────────────────────────────────────────────────────────
// Journey: title + Paths with moment counts. Editable by default.

interface JourneyViewProps {
  journeyId: string
  domainId: string | null
  onMomentSelect?: (id: string) => void
  onLabelResolved: (key: string, label: string) => void
  trailKey: string
}

function JourneyView({
  journeyId,
  onMomentSelect,
  onLabelResolved,
  trailKey,
}: JourneyViewProps) {
  const [journey, setJourney] = React.useState<JourneyDetail | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [name, setName] = React.useState("")
  const [forward, setForward] = React.useState("")
  const hasEdited = React.useRef(false)
  const debouncedName = useDebounced(name, 1000)
  const debouncedForward = useDebounced(forward, 1000)

  React.useEffect(() => {
    if (!journeyId) return
    let cancelled = false
    setLoading(true)
    setJourney(null)
    hasEdited.current = false

    apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { journey?: JourneyDetail })?.journey ??
          (res as { data?: JourneyDetail })?.data ??
          (res as JourneyDetail)
        const j = data as JourneyDetail
        setJourney(j)
        setName(j.name ?? "")
        setForward(j.forward ?? "")
        setLoading(false)
        if (j.name) onLabelResolved(trailKey, j.name)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId])

  // Debounced autosave — only fires after user has touched a field.
  React.useEffect(() => {
    if (!hasEdited.current || !journey) return
    apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: debouncedName, forward: debouncedForward }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, debouncedForward])

  const handleNameChange = (v: string) => {
    hasEdited.current = true
    setName(v)
  }
  const handleForwardChange = (v: string) => {
    hasEdited.current = true
    setForward(v)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}
      >
        <PresenceLabel>Journey</PresenceLabel>
        {loading ? (
          <PresenceShimmer width="w-36" />
        ) : (
          <AutoResizeTextarea
            value={name}
            onChange={handleNameChange}
            placeholder="Untitled journey"
            className="text-[14px] font-semibold leading-snug mt-1"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          />
        )}
        {!loading && (
          <AutoResizeTextarea
            value={forward}
            onChange={handleForwardChange}
            placeholder="Where this journey is headed…"
            className="text-[12px] leading-relaxed mt-2"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          />
        )}
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {loading ? (
          <>
            <PresenceShimmer width="w-24" />
            <PresenceShimmer width="w-32" />
          </>
        ) : journey ? (
          <>
            {journey.paths && journey.paths.length > 0 ? (
              <PresenceSection title="Paths">
                {journey.paths.map((p) => (
                  <PresenceThread
                    key={p.id}
                    label={p.name}
                    sub={
                      p.momentCount != null
                        ? `${p.momentCount} moment${p.momentCount === 1 ? "" : "s"}`
                        : undefined
                    }
                  />
                ))}
              </PresenceSection>
            ) : (
              <p
                className="text-[12px]"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                No paths yet.
              </p>
            )}
            {journey.paths && journey.paths.length > 0 && (
              <p
                className="text-[10px] mt-2"
                style={{ color: "hsl(var(--theme-ink-tertiary) / 0.5)" }}
              >
                {journey.momentCount != null
                  ? `${journey.momentCount} moment${journey.momentCount === 1 ? "" : "s"} across all paths`
                  : ""}
              </p>
            )}
          </>
        ) : (
          <p
            className="text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Journey not found.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── MomentView ───────────────────────────────────────────────────────────────
// Hierarchy: Journey title → Path name → Moment title + narrative.
// Journey first — always.

interface MomentViewProps {
  momentId: string
  onLabelResolved: (key: string, label: string) => void
  trailKey: string
}

function MomentView({ momentId, onLabelResolved, trailKey }: MomentViewProps) {
  const [moment, setMoment] = React.useState<MomentDetail | null>(null)
  const [journeyCtx, setJourneyCtx] = React.useState<{
    name: string
    pathName?: string
  } | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [title, setTitle] = React.useState("")
  const [narrative, setNarrative] = React.useState("")
  const hasEdited = React.useRef(false)
  const debouncedTitle = useDebounced(title, 1000)
  const debouncedNarrative = useDebounced(narrative, 1000)

  React.useEffect(() => {
    if (!momentId) return
    let cancelled = false
    setLoading(true)
    setMoment(null)
    setJourneyCtx(null)
    hasEdited.current = false

    apiFetch(`/api/moments/${encodeURIComponent(momentId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { moment?: MomentDetail })?.moment ??
          (res as { data?: MomentDetail })?.data ??
          (res as MomentDetail)
        const m = data as MomentDetail
        setMoment(m)
        setTitle(m.title ?? "")
        setNarrative(m.narrative ?? "")
        setLoading(false)
        if (m.title) onLabelResolved(trailKey, m.title)

        // Resolve Journey → Path hierarchy from moment data or secondary fetch.
        if (m.journeyId) {
          apiFetch(`/api/journeys/${encodeURIComponent(m.journeyId)}`)
            .then((jr: unknown) => {
              if (cancelled) return
              const jData =
                (jr as { journey?: JourneyDetail })?.journey ??
                (jr as { data?: JourneyDetail })?.data ??
                (jr as JourneyDetail)
              const j = jData as JourneyDetail
              const matchedPath = m.pathId
                ? j.paths?.find((p) => p.id === m.pathId)
                : undefined
              setJourneyCtx({
                name: j.name,
                pathName: matchedPath?.name ?? m.pathName,
              })
            })
            .catch(() => {
              if (!cancelled) {
                setJourneyCtx({
                  name: m.journeyTitle ?? "",
                  pathName: m.pathName,
                })
              }
            })
        } else if (m.journeyTitle) {
          setJourneyCtx({ name: m.journeyTitle, pathName: m.pathName })
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momentId])

  React.useEffect(() => {
    if (!hasEdited.current || !moment) return
    apiFetch(`/api/moments/${encodeURIComponent(momentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: debouncedTitle, narrative: debouncedNarrative }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedNarrative])

  const handleTitleChange = (v: string) => {
    hasEdited.current = true
    setTitle(v)
  }
  const handleNarrativeChange = (v: string) => {
    hasEdited.current = true
    setNarrative(v)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}
      >
        {/* Journey → Path breadcrumb — always Journey first */}
        {journeyCtx?.name && (
          <div className="flex items-center gap-1.5 mb-2 min-w-0">
            <span
              className="text-[10px] font-medium truncate"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {journeyCtx.name}
            </span>
            {journeyCtx.pathName && (
              <>
                <span
                  className="text-[10px] shrink-0"
                  style={{ color: "hsl(var(--theme-ink-tertiary) / 0.4)" }}
                >
                  /
                </span>
                <span
                  className="text-[10px] font-medium truncate"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  {journeyCtx.pathName}
                </span>
              </>
            )}
          </div>
        )}
        <PresenceLabel>Moment</PresenceLabel>
        {loading ? (
          <PresenceShimmer width="w-36" />
        ) : (
          <AutoResizeTextarea
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled moment"
            className="text-[14px] font-semibold leading-snug mt-1"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          />
        )}
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {loading ? (
          <>
            <PresenceShimmer width="w-full" />
            <PresenceShimmer width="w-3/4" />
          </>
        ) : moment ? (
          <>
            <PresenceSection title="Narrative">
              <AutoResizeTextarea
                value={narrative}
                onChange={handleNarrativeChange}
                placeholder="What happened here…"
                className="text-[12px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              />
            </PresenceSection>
            {moment.updatedAt && (
              <p
                className="text-[10px] mt-2"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {formatRelative(moment.updatedAt)}
              </p>
            )}
          </>
        ) : (
          <p
            className="text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Moment not found.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── KeeperView ───────────────────────────────────────────────────────────────
// Keeper: name + description + recent sessions. Editable by default.

interface KeeperViewProps {
  keeperId: string
  onJourneySelect?: (id: string) => void
  onLabelResolved: (key: string, label: string) => void
  trailKey: string
}

function KeeperView({
  keeperId,
  onJourneySelect,
  onLabelResolved,
  trailKey,
}: KeeperViewProps) {
  const [keeper, setKeeper] = React.useState<KeeperDetail | null>(null)
  const [loading, setLoading] = React.useState(true)

  const [title, setTitle] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const hasEdited = React.useRef(false)
  const debouncedTitle = useDebounced(title, 1000)
  const debouncedPurpose = useDebounced(purpose, 1000)

  React.useEffect(() => {
    if (!keeperId) return
    let cancelled = false
    setLoading(true)
    setKeeper(null)
    hasEdited.current = false

    apiFetch(`/api/keepers/${encodeURIComponent(keeperId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { keeper?: KeeperDetail })?.keeper ??
          (res as { data?: KeeperDetail })?.data ??
          (res as KeeperDetail)
        const k = data as KeeperDetail
        setKeeper(k)
        setTitle(k.title ?? "")
        setPurpose(k.purpose ?? "")
        setLoading(false)
        if (k.title) onLabelResolved(trailKey, k.title)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keeperId])

  React.useEffect(() => {
    if (!hasEdited.current || !keeper) return
    apiFetch(`/api/keepers/${encodeURIComponent(keeperId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: debouncedTitle, purpose: debouncedPurpose }),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedPurpose])

  const handleTitleChange = (v: string) => {
    hasEdited.current = true
    setTitle(v)
  }
  const handlePurposeChange = (v: string) => {
    hasEdited.current = true
    setPurpose(v)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}
      >
        <PresenceLabel>Keeper</PresenceLabel>
        {loading ? (
          <PresenceShimmer width="w-28" />
        ) : (
          <AutoResizeTextarea
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled keeper"
            className="text-[14px] font-semibold leading-snug mt-1"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          />
        )}
        {!loading && (
          <AutoResizeTextarea
            value={purpose}
            onChange={handlePurposeChange}
            placeholder="What this keeper holds…"
            className="text-[12px] leading-relaxed mt-2"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          />
        )}
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {loading ? (
          <>
            <PresenceShimmer width="w-32" />
            <PresenceShimmer width="w-24" />
          </>
        ) : keeper ? (
          <>
            {keeper.journeys && keeper.journeys.length > 0 ? (
              <PresenceSection title="Recent Sessions">
                {keeper.journeys.slice(0, 6).map((j) => (
                  <PresenceThread
                    key={j.id}
                    label={j.name}
                    sub={
                      j.momentCount != null
                        ? `${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}`
                        : undefined
                    }
                    onClick={() => onJourneySelect?.(j.id)}
                  />
                ))}
              </PresenceSection>
            ) : (
              <p
                className="text-[12px]"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                No sessions yet.
              </p>
            )}
          </>
        ) : (
          <p
            className="text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Keeper not found.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── DraftView ────────────────────────────────────────────────────────────────

interface DraftViewProps {
  draftId: string
  domainId: string | null
  onLabelResolved: (key: string, label: string) => void
  trailKey: string
}

function DraftView({ draftId, domainId, onLabelResolved, trailKey }: DraftViewProps) {
  const [draft, setDraft] = React.useState<{
    title?: string; status?: string; summary?: string
  } | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!domainId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    // Fetch draft list and find by id — individual draft endpoint TBD.
    apiFetch(`/api/v0/drafts?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const list: Array<{ id: string; title?: string; status?: string; summary?: string }> =
          (res as { data?: unknown[] })?.data as typeof list
          ?? (res as { drafts?: unknown[] })?.drafts as typeof list
          ?? []
        const found = list.find((d) => d.id === draftId) ?? null
        setDraft(found)
        const title = found?.title?.trim()
        if (title) onLabelResolved(trailKey, title)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [draftId, domainId, onLabelResolved, trailKey])

  const ink = "hsl(var(--theme-ink-primary))"
  const inkMuted = "hsl(var(--theme-ink-muted))"
  const inkSecondary = "hsl(var(--theme-ink-secondary))"

  if (loading) {
    return <div className="p-4 text-sm" style={{ color: inkMuted }}>···</div>
  }
  if (!draft) {
    return <div className="p-4 text-sm" style={{ color: inkMuted }}>Draft not found.</div>
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0 overflow-y-auto">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: inkMuted }}>
          Draft
        </p>
        <p className="text-base font-medium leading-snug" style={{ color: ink }}>
          {draft.title?.trim() || "Untitled Draft"}
        </p>
      </div>
      {draft.status && (
        <span
          className="self-start text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: "hsl(var(--theme-surface-selected) / 0.08)", color: inkMuted }}
        >
          {draft.status}
        </span>
      )}
      {draft.summary && (
        <p className="text-sm leading-relaxed" style={{ color: inkSecondary }}>
          {draft.summary}
        </p>
      )}
    </div>
  )
}

// ─── AgentView ────────────────────────────────────────────────────────────────

interface AgentViewProps {
  agentId: string
  onLabelResolved: (key: string, label: string) => void
  trailKey: string
}

function AgentView({ agentId, onLabelResolved, trailKey }: AgentViewProps) {
  const [agent, setAgent] = React.useState<{
    name?: string; slug?: string; description?: string; status?: string
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    apiFetch(`/api/agents/${encodeURIComponent(agentId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const a = (res as { agent?: unknown })?.agent ?? (res as { data?: unknown })?.data ?? res
        setAgent(a as typeof agent)
        const name = (a as { name?: string })?.name?.trim()
        if (name) onLabelResolved(trailKey, name)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [agentId, onLabelResolved, trailKey])

  const ink = "hsl(var(--theme-ink-primary))"
  const inkMuted = "hsl(var(--theme-ink-muted))"
  const inkSecondary = "hsl(var(--theme-ink-secondary))"

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0 overflow-y-auto">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: inkMuted }}>
          Agent
        </p>
        <p className="text-base font-medium leading-snug" style={{ color: ink }}>
          {agent?.name?.trim() || agent?.slug || agentId}
        </p>
      </div>
      {agent?.status && (
        <span
          className="self-start text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: "hsl(var(--theme-surface-selected) / 0.08)", color: inkMuted }}
        >
          {agent.status}
        </span>
      )}
      {agent?.description && (
        <p className="text-sm leading-relaxed" style={{ color: inkSecondary }}>
          {agent.description}
        </p>
      )}
      {!agent && (
        <p className="text-sm" style={{ color: inkMuted }}>···</p>
      )}
    </div>
  )
}

// ─── ServiceView ──────────────────────────────────────────────────────────────

type ServiceSlugKind = "cloud" | "railway" | "vercel" | "github"

function ServiceView({ serviceSlug }: { serviceSlug: string }) {
  const boardCtx = useUniversalBoardOptional()
  const slug = (["cloud", "railway", "vercel", "github"].includes(serviceSlug)
    ? serviceSlug
    : "cloud") as ServiceSlugKind

  return (
    <ServicesFrame
      initialService={slug}
      onClose={() => boardCtx?.actions.clearSelection()}
    />
  )
}

// ─── PanelBody ────────────────────────────────────────────────────────────────
// Mini-router — renders the correct view for panelHistory[currentIndex].
// Opacity dissolve on context shift: 200ms entry, 140ms exit.

interface PanelBodyProps {
  entry: TrailEntry
  def: UniversalBoardDef
  domainId: string | null
  domainName: string
  domainSlug?: string
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
  onLabelResolved: (key: string, label: string) => void
}

function PanelBody({
  entry,
  def: _def,
  domainId,
  domainName,
  domainSlug,
  onJourneySelect,
  onMomentSelect,
  onLabelResolved,
}: PanelBodyProps) {
  function renderView(): React.ReactNode {
    switch (entry.kind) {
      case "journey":
        return entry.id ? (
          <JourneyView
            journeyId={entry.id}
            domainId={domainId}
            onMomentSelect={onMomentSelect}
            onLabelResolved={onLabelResolved}
            trailKey={entry.key}
          />
        ) : (
          <UniversalViewPanelIdle
            domainId={domainId}
            domainName={domainName}
            domainSlug={domainSlug}
            onJourneySelect={onJourneySelect}
          />
        )

      case "moment":
        return entry.id ? (
          <MomentView
            momentId={entry.id}
            onLabelResolved={onLabelResolved}
            trailKey={entry.key}
          />
        ) : (
          <UniversalViewPanelIdle
            domainId={domainId}
            domainName={domainName}
            domainSlug={domainSlug}
            onJourneySelect={onJourneySelect}
          />
        )

      case "keeper":
        return entry.id ? (
          <KeeperView
            keeperId={entry.id}
            onJourneySelect={onJourneySelect}
            onLabelResolved={onLabelResolved}
            trailKey={entry.key}
          />
        ) : (
          <UniversalViewPanelIdle
            domainId={domainId}
            domainName={domainName}
            domainSlug={domainSlug}
            onJourneySelect={onJourneySelect}
          />
        )

      case "draft":
        return entry.id ? (
          <DraftView
            draftId={entry.id}
            domainId={domainId}
            onLabelResolved={onLabelResolved}
            trailKey={entry.key}
          />
        ) : (
          <UniversalViewPanelIdle
            domainId={domainId}
            domainName={domainName}
            domainSlug={domainSlug}
            onJourneySelect={onJourneySelect}
          />
        )

      case "agent":
        return entry.id ? (
          <AgentView
            agentId={entry.id}
            onLabelResolved={onLabelResolved}
            trailKey={entry.key}
          />
        ) : (
          <UniversalViewPanelIdle
            domainId={domainId}
            domainName={domainName}
            domainSlug={domainSlug}
            onJourneySelect={onJourneySelect}
          />
        )

      case "service":
        return entry.id ? (
          <ServiceView serviceSlug={entry.id} />
        ) : (
          <UniversalViewPanelIdle
            domainId={domainId}
            domainName={domainName}
            domainSlug={domainSlug}
            onJourneySelect={onJourneySelect}
          />
        )

      case "domain":
      default:
        return (
          <UniversalViewPanelIdle
            domainId={domainId}
            domainName={domainName}
            domainSlug={domainSlug}
            onJourneySelect={onJourneySelect}
          />
        )
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={entry.key}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
        exit={{
          opacity: 0,
          transition: { duration: 0.14, ease: "easeIn" },
        }}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── UniversalViewPanel (Chronicle) ──────────────────────────────────────────
// The Chronicle component. Replaces UniversalContextPanel as the right panel
// on all Universal Boards.

export interface UniversalViewPanelProps {
  /** Board definition — drives which presence surfaces are supported. */
  def: UniversalBoardDef
  /** Resolved domain ID — never null by the time this panel renders. */
  domainId: string | null
  /** Domain display name. */
  domainName: string
  /**
   * Domain slug — when provided, the Chronicle idle state shows the domain feed
   * (recent kept Moments + active Journeys). Intended for Domain Board.
   */
  domainSlug?: string

  // Explicit selection props — override context values when both are present.
  selectedJourneyId?: string | null
  selectedMomentId?: string | null
  selectedKeeperId?: string | null
  selectedDraftId?: string | null
  selectedAgentId?: string | null
  selectedServiceSlug?: string | null

  // Explicit callbacks.
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}

export function UniversalViewPanel({
  def,
  domainId,
  domainName,
  domainSlug,
  selectedJourneyId,
  selectedMomentId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  selectedServiceSlug,
  onJourneySelect,
  onMomentSelect,
}: UniversalViewPanelProps) {
  const boardCtx = useUniversalBoardOptional()

  // Merge explicit props with context — explicit props win.
  const resolved = {
    selectedJourneyId:
      selectedJourneyId ?? boardCtx?.selection.selectedJourneyId ?? null,
    selectedMomentId:
      selectedMomentId ?? boardCtx?.selection.selectedMomentId ?? null,
    selectedKeeperId:
      selectedKeeperId ?? boardCtx?.selection.selectedKeeperId ?? null,
    selectedDraftId:
      selectedDraftId ?? boardCtx?.selection.selectedDraftId ?? null,
    selectedAgentId:
      selectedAgentId ?? boardCtx?.selection.selectedAgentId ?? null,
    selectedServiceSlug:
      selectedServiceSlug ?? boardCtx?.selection.selectedServiceSlug ?? null,
  }

  // Active subjects — def.contextSurface.viewStates drives which kinds Chronicle responds to.
  const activeSubjects = React.useMemo(
    () => new Set(def.contextSurface.viewStates.map((vs) => vs.key)),
    [def],
  )

  const handleJourneySelect =
    onJourneySelect ?? boardCtx?.actions.onJourneySelect
  const handleMomentSelect =
    onMomentSelect ?? boardCtx?.actions.onMomentSelect

  // Resolve active kind + id — priority: service > draft > agent > moment > journey > keeper > domain.
  // Each kind is gated by activeSubjects — if the def doesn't declare it, Chronicle ignores it.
  function resolveKindId(): { kind: TrailKind; id: string | null } {
    if (activeSubjects.has("service") && resolved.selectedServiceSlug)
      return { kind: "service", id: resolved.selectedServiceSlug }
    if (activeSubjects.has("draft") && resolved.selectedDraftId)
      return { kind: "draft", id: resolved.selectedDraftId }
    if (activeSubjects.has("agent") && resolved.selectedAgentId)
      return { kind: "agent", id: resolved.selectedAgentId }
    if (activeSubjects.has("moment") && resolved.selectedMomentId)
      return { kind: "moment", id: resolved.selectedMomentId }
    if (activeSubjects.has("journey") && resolved.selectedJourneyId)
      return { kind: "journey", id: resolved.selectedJourneyId }
    if (activeSubjects.has("keeper") && resolved.selectedKeeperId)
      return { kind: "keeper", id: resolved.selectedKeeperId }
    return { kind: "domain", id: null }
  }

  const { kind, id } = resolveKindId()
  const contextKey = `${kind}:${id ?? "_"}`

  // ── Label cache ────────────────────────────────────────────────────────────
  // Maps "kind:id" → resolved record name so revisits show the name immediately
  // rather than waiting for the view's async fetch to fire onLabelResolved again.
  const labelCache = React.useRef(new Map<string, string>())

  function resolveInitialLabel(k: TrailKind, entryId: string | null): string {
    if (k === "domain") return domainName || "Home"
    return labelCache.current.get(`${k}:${entryId ?? "_"}`) ?? "···"
  }

  // ── Trail history ──────────────────────────────────────────────────────────
  // Initialise with the current context. Push new entries on context change.
  const [panelHistory, setPanelHistory] = React.useState<TrailEntry[]>(() => [
    {
      key: `${contextKey}:init`,
      kind,
      id,
      label: resolveInitialLabel(kind, id),
    },
  ])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [direction, setDirection] = React.useState<TrailDirection>("forward")
  const prevContextKey = React.useRef(contextKey)

  // Push a new trail entry whenever the context key changes.
  React.useEffect(() => {
    if (contextKey === prevContextKey.current) return
    prevContextKey.current = contextKey

    const newEntry: TrailEntry = {
      key: `${contextKey}:${Date.now()}`,
      kind,
      id,
      // Use cached name immediately — "···" only if this record was never visited.
      label: resolveInitialLabel(kind, id),
    }

    setPanelHistory((prev) => [...prev, newEntry])
    setCurrentIndex((prev) => prev + 1)
    setDirection("forward")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey])

  // ── Label resolution ───────────────────────────────────────────────────────
  // Views call this when they have fetched the record name. Updates the trail
  // entry label and populates the cache so future trail pushes for this record
  // start with the correct name instead of "···".
  const handleLabelResolved = React.useCallback(
    (key: string, label: string) => {
      setPanelHistory((prev) =>
        prev.map((e) => {
          if (e.key !== key) return e
          // Cache by kind:id — next push for this record skips the placeholder.
          labelCache.current.set(`${e.kind}:${e.id ?? "_"}`, label)
          return { ...e, label }
        }),
      )
    },
    [],
  )

  // ── Trail navigation ───────────────────────────────────────────────────────
  const handleNavigate = React.useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(panelHistory.length - 1, index))
      setDirection(clamped < currentIndex ? "back" : "forward")
      setCurrentIndex(clamped)
    },
    [currentIndex, panelHistory.length],
  )

  // ── Feed polling ───────────────────────────────────────────────────────────
  // Polls every 60 seconds. Counts journeys with active moments as the feed signal.
  const [feedCount, setFeedCount] = React.useState(0)

  React.useEffect(() => {
    const pollDomainId = domainId
    if (!pollDomainId) return
    let cancelled = false

    function poll() {
      apiFetch(`/api/journeys?domainId=${encodeURIComponent(pollDomainId!)}`)
        .then((res: unknown) => {
          if (cancelled) return
          const list =
            (res as { data?: { journeys?: JourneyBrief[] } })?.data
              ?.journeys ?? []
          const count = Array.isArray(list)
            ? (list as JourneyBrief[]).filter(
                (j) => (j.momentCount ?? 0) > 0,
              ).length
            : 0
          setFeedCount(count)
        })
        .catch(() => {})
    }

    poll()
    const interval = setInterval(poll, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [domainId])

  // Guard: always render something — fall back to first entry if index is off.
  const currentEntry =
    panelHistory[currentIndex] ?? panelHistory[0] ?? {
      key: "idle",
      kind: "domain" as TrailKind,
      id: null,
      label: domainName || "Home",
    }

  return (
    <div
      className="flex flex-col h-full min-h-0 overflow-hidden"
      style={{
        background: "hsl(var(--theme-surface-panel) / 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "8px",
        border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
        color: "hsl(var(--theme-ink-primary))",
      }}
    >
      {/* Trail Bar — permanent top */}
      <TrailBar
        entries={panelHistory}
        currentIndex={currentIndex}
        onNavigate={handleNavigate}
        feedCount={feedCount}
        direction={direction}
      />

      {/* Panel Body — mini-router, opacity dissolve on shift */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <PanelBody
          entry={currentEntry}
          def={def}
          domainId={domainId}
          domainName={domainName}
          domainSlug={domainSlug}
          onJourneySelect={handleJourneySelect}
          onMomentSelect={handleMomentSelect}
          onLabelResolved={handleLabelResolved}
        />
      </div>
    </div>
  )
}

"use client"

/**
 * UniversalContextPanel
 * =====================
 * KE3P · Keeper Platform · Universal Board — Right Panel
 *
 * Treatment character: presence and intentional interaction.
 *
 * This panel is not a record viewer. It is where the domain breathes.
 *
 * The Journey is alive over there while the conversation happens in the center.
 * Not notifying. Not managing. Present — the way a good collaborator is present.
 * Aware of what Path you are on, what Moments are moving, what threads are alive.
 * It surfaces what is relevant not because you asked but because something is happening.
 *
 * When context switches, the panel shifts in presence.
 * Not with a data refresh — with a change in what comes forward and what recedes.
 * What comes forward and what recedes is governed by what matters right now.
 *
 * When it is working, it feels like someone else is in the room.
 *
 * Spatial ratios, motion behavior, density, what recedes and what comes forward
 * as context shifts — those are Rendr's answer to the presenceTreatment instructions
 * in UniversalBoardDefinition.ts. This file delivers the structure and the data.
 * Rendr governs the feeling.
 *
 * CRITICAL RULES:
 * - Never call /api/domains/by-slug — domainId is always received as a prop.
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - Presence surfaces fetch their own data — the panel is self-sufficient.
 * - Transitions are CSS-driven — no JS animation libraries.
 */

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import type { UniversalBoardDef } from "../UniversalBoardDefinition"
import { useUniversalBoardOptional } from "../UniversalBoardContext"

// ─── Active Context ───────────────────────────────────────────────────────────

type PresenceKind =
  | "domain"
  | "journey"
  | "moment"
  | "keeper"
  | "draft"
  | "agent"
  | "service"

interface ActiveContext {
  kind: PresenceKind
  id: string | null
}

function resolvePresenceKind(sel: {
  selectedJourneyId: string | null
  selectedMomentId: string | null
  selectedKeeperId: string | null
  selectedDraftId: string | null
  selectedAgentId: string | null
  selectedServiceSlug: string | null
}): ActiveContext {
  if (sel.selectedServiceSlug) return { kind: "service", id: sel.selectedServiceSlug }
  if (sel.selectedJourneyId)  return { kind: "journey",  id: sel.selectedJourneyId }
  if (sel.selectedMomentId)   return { kind: "moment",   id: sel.selectedMomentId }
  if (sel.selectedKeeperId)   return { kind: "keeper",   id: sel.selectedKeeperId }
  if (sel.selectedDraftId)    return { kind: "draft",    id: sel.selectedDraftId }
  if (sel.selectedAgentId)    return { kind: "agent",    id: sel.selectedAgentId }
  return { kind: "domain", id: null }
}

// ─── API data shapes ──────────────────────────────────────────────────────────

type JourneyBrief = {
  id: string
  name: string
  momentCount?: number
  updatedAt?: string
}

type JourneyDetail = {
  id: string
  name: string
  forward?: string
  paths?: Array<{ id: string; name: string; prelude?: string }>
  moments?: Array<{ id: string; title: string; updatedAt?: string }>
  momentCount?: number
}

type MomentDetail = {
  id: string
  title: string
  narrative?: string
  updatedAt?: string
}

type KeeperDetail = {
  id: string
  title: string
  purpose?: string
  journeys?: Array<{ id: string; name: string; momentCount?: number }>
}

type DraftDetail = {
  id: string
  title: string
  status?: string
  summary?: string
  updatedAt?: string
}

// ─── Shared presence primitives ───────────────────────────────────────────────
// Typography and layout that express the treatment character.
// Calm. Present. Not loud. Things that matter come forward through weight and position.

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

/** Quiet category label — signals what kind of thing is in the room. */
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

/** The thing's primary identity — name, title. What is here. */
function PresenceName({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[14px] font-semibold leading-snug mt-1"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {children}
    </h2>
  )
}

/** One step quieter — description, forward, purpose. Context without urgency. */
function PresenceDescription({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[12px] leading-relaxed mt-2"
      style={{ color: "hsl(var(--theme-ink-secondary))" }}
    >
      {children}
    </p>
  )
}

/** A section within the presence surface — with a quiet label above. */
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

/**
 * A thread — a named sub-item: a Path, a Moment, a Journey.
 * Compact. The dot signals it is a thread, not a row.
 * Clickable threads light up gently — they do not demand attention.
 */
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

/** Skeleton placeholder while data loads — one shimmer line. */
function PresenceShimmer({ width = "w-28" }: { width?: string }) {
  return (
    <div
      className={`h-2.5 ${width} rounded animate-pulse mb-2`}
      style={{ background: "hsl(var(--theme-surface-elevated) / 0.45)" }}
    />
  )
}

/** Horizontal rule — soft separation within a surface. */
function PresenceDivider() {
  return (
    <div
      className="my-3 shrink-0"
      style={{ height: 1, background: "hsl(var(--theme-border-soft) / 0.15)" }}
    />
  )
}

// ─── Presence Surfaces ────────────────────────────────────────────────────────
// Each surface owns its own data fetching.
// The panel is self-sufficient — it does not require the Board to pass data down.

// ── Domain Presence (idle) ──────────────────────────────────────────────────
// The domain breathing. Active journeys present.
// What is moving comes forward. What is settled is present but quiet.

interface DomainPresenceProps {
  domainId: string | null
  domainName: string
  onJourneySelect?: (id: string) => void
}

function DomainPresence({ domainId, domainName, onJourneySelect }: DomainPresenceProps) {
  const [journeys, setJourneys] = React.useState<JourneyBrief[] | null>(null)

  React.useEffect(() => {
    if (!domainId) { setJourneys([]); return }
    let cancelled = false
    setJourneys(null)
    apiFetch(`/api/journeys?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const list =
          (res as { data?: { journeys?: JourneyBrief[] } })?.data?.journeys ?? []
        setJourneys(Array.isArray(list) ? (list as JourneyBrief[]) : [])
      })
      .catch(() => { if (!cancelled) setJourneys([]) })
    return () => { cancelled = true }
  }, [domainId])

  const moving = journeys?.filter((j) => (j.momentCount ?? 0) > 0) ?? []
  const settled = journeys?.filter((j) => !j.momentCount || j.momentCount === 0) ?? []

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Identity header */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}>
        <PresenceLabel>Domain</PresenceLabel>
        <PresenceName>{domainName || "—"}</PresenceName>
      </div>

      {/* Body */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {journeys === null ? (
          <>
            <PresenceShimmer width="w-32" />
            <PresenceShimmer width="w-24" />
            <PresenceShimmer width="w-28" />
          </>
        ) : journeys.length === 0 ? (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
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

// ── Journey Presence ──────────────────────────────────────────────────────────
// Journey alive. Paths and active Moments come forward. Threads surface.

interface JourneyPresenceProps {
  journeyId: string
  domainId: string | null
  onMomentSelect?: (id: string) => void
}

function JourneyPresence({ journeyId, domainId, onMomentSelect }: JourneyPresenceProps) {
  const [journey, setJourney] = React.useState<JourneyDetail | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!journeyId) return
    let cancelled = false
    setLoading(true)
    setJourney(null)
    apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { journey?: JourneyDetail })?.journey ??
          (res as { data?: JourneyDetail })?.data ??
          (res as JourneyDetail)
        setJourney(data as JourneyDetail)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setJourney(null); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [journeyId])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}>
        <PresenceLabel>Journey</PresenceLabel>
        {loading ? (
          <PresenceShimmer width="w-36" />
        ) : (
          <PresenceName>{journey?.name || "Untitled journey"}</PresenceName>
        )}
        {!loading && journey?.forward && (
          <PresenceDescription>{journey.forward}</PresenceDescription>
        )}
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {loading ? (
          <>
            <PresenceShimmer width="w-24" />
            <PresenceShimmer width="w-32" />
            <PresenceShimmer width="w-20" />
          </>
        ) : journey ? (
          <>
            {journey.paths && journey.paths.length > 0 && (
              <PresenceSection title="Paths">
                {journey.paths.map((p) => (
                  <PresenceThread
                    key={p.id}
                    label={p.name}
                    sub={p.prelude ? p.prelude.slice(0, 64) : undefined}
                  />
                ))}
              </PresenceSection>
            )}

            {journey.moments && journey.moments.length > 0 && (
              <>
                {journey.paths && journey.paths.length > 0 && <PresenceDivider />}
                <PresenceSection title="Moments">
                  {journey.moments.map((m) => (
                    <PresenceThread
                      key={m.id}
                      label={m.title}
                      sub={m.updatedAt ? formatRelative(m.updatedAt) : undefined}
                      onClick={() => onMomentSelect?.(m.id)}
                    />
                  ))}
                </PresenceSection>
              </>
            )}

            {!journey.paths?.length && !journey.moments?.length && (
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                No paths or moments yet.
              </p>
            )}
          </>
        ) : (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Journey not found.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Moment Presence ───────────────────────────────────────────────────────────
// Moment in focus. Content and narrative forward.

interface MomentPresenceProps {
  momentId: string
}

function MomentPresence({ momentId }: MomentPresenceProps) {
  const [moment, setMoment] = React.useState<MomentDetail | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!momentId) return
    let cancelled = false
    setLoading(true)
    setMoment(null)
    apiFetch(`/api/moments/${encodeURIComponent(momentId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { moment?: MomentDetail })?.moment ??
          (res as { data?: MomentDetail })?.data ??
          (res as MomentDetail)
        setMoment(data as MomentDetail)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setMoment(null); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [momentId])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}>
        <PresenceLabel>Moment</PresenceLabel>
        {loading ? (
          <PresenceShimmer width="w-32" />
        ) : (
          <PresenceName>{moment?.title || "Untitled moment"}</PresenceName>
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
            {moment.narrative && (
              <PresenceSection title="Narrative">
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {moment.narrative}
                </p>
              </PresenceSection>
            )}
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
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Moment not found.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Keeper Presence ───────────────────────────────────────────────────────────
// Keeper present. Active journeys, purpose forward. Nothing is urgent — just here.

interface KeeperPresenceProps {
  keeperId: string
  onJourneySelect?: (id: string) => void
}

function KeeperPresence({ keeperId, onJourneySelect }: KeeperPresenceProps) {
  const [keeper, setKeeper] = React.useState<KeeperDetail | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!keeperId) return
    let cancelled = false
    setLoading(true)
    setKeeper(null)
    apiFetch(`/api/keepers/${encodeURIComponent(keeperId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { keeper?: KeeperDetail })?.keeper ??
          (res as { data?: KeeperDetail })?.data ??
          (res as KeeperDetail)
        setKeeper(data as KeeperDetail)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setKeeper(null); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [keeperId])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}>
        <PresenceLabel>Keeper</PresenceLabel>
        {loading ? (
          <PresenceShimmer width="w-28" />
        ) : (
          <PresenceName>{keeper?.title || "Untitled keeper"}</PresenceName>
        )}
        {!loading && keeper?.purpose && (
          <PresenceDescription>{keeper.purpose}</PresenceDescription>
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
              <PresenceSection title="Journeys">
                {keeper.journeys.map((j) => (
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
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                No journeys yet.
              </p>
            )}
          </>
        ) : (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Keeper not found.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Draft Presence ────────────────────────────────────────────────────────────
// Draft in view. Spec and status forward. What needs attention surfaces.

interface DraftPresenceProps {
  draftId: string
  domainId: string | null
}

function DraftPresence({ draftId, domainId }: DraftPresenceProps) {
  const [draft, setDraft] = React.useState<DraftDetail | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!draftId || !domainId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setDraft(null)
    apiFetch(
      `/api/domains/${encodeURIComponent(domainId)}/kip/drafts/${encodeURIComponent(draftId)}`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { draft?: DraftDetail })?.draft ??
          (res as { data?: DraftDetail })?.data ??
          (res as DraftDetail)
        setDraft(data as DraftDetail)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setDraft(null); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [draftId, domainId])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}>
        <PresenceLabel>Draft</PresenceLabel>
        {loading ? (
          <PresenceShimmer width="w-36" />
        ) : (
          <PresenceName>{draft?.title || "Untitled draft"}</PresenceName>
        )}
        {!loading && draft?.status && (
          <p
            className="text-[10px] font-medium uppercase tracking-wide mt-1.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {draft.status}
          </p>
        )}
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        {loading ? (
          <>
            <PresenceShimmer width="w-full" />
            <PresenceShimmer width="w-3/4" />
          </>
        ) : draft ? (
          <>
            {draft.summary && (
              <PresenceSection title="Summary">
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {draft.summary}
                </p>
              </PresenceSection>
            )}
            {draft.updatedAt && (
              <p
                className="text-[10px] mt-2"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {formatRelative(draft.updatedAt)}
              </p>
            )}
          </>
        ) : (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Draft not found.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Presence Transition Layer ────────────────────────────────────────────────
//
// When context shifts, the panel shifts in presence.
// The old surface recedes (opacity → 0, slight downward drift).
// The new surface enters (opacity → 1, slight upward entry).
//
// Duration: 150ms exit, 180ms enter.
// This is a CSS-driven transition — no animation library.
// The timing is quick enough to feel responsive, slow enough to feel deliberate.
//
// This is what "shift in presence" means in the panel code.
// The treatment character (what comes forward, spatial ratios, density)
// is governed by Rendr's reading of the presenceTreatment field in the board def.

type TransitionPhase = "idle" | "exiting" | "entering"

interface PresenceTransitionProps {
  /** Stable key — change triggers the transition sequence. */
  contextKey: string
  children: React.ReactNode
}

function PresenceTransition({ contextKey, children }: PresenceTransitionProps) {
  const [displayedKey, setDisplayedKey] = React.useState(contextKey)
  const [displayed, setDisplayed] = React.useState<React.ReactNode>(children)
  const [phase, setPhase] = React.useState<TransitionPhase>("idle")

  const pendingRef = React.useRef<{ key: string; node: React.ReactNode } | null>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // When the key changes, stash the new content and begin exit sequence.
  // When the key is the same, update content in place (e.g. data has loaded).
  React.useEffect(() => {
    if (contextKey === displayedKey) {
      setDisplayed(children)
      return
    }

    // Stash incoming — may be superseded if context changes again during exit
    pendingRef.current = { key: contextKey, node: children }

    // If already exiting, the stash is enough — the commit handles the swap
    if (phase === "exiting") return

    // Begin exit
    setPhase("exiting")
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const pending = pendingRef.current
      if (!pending) return
      setDisplayed(pending.node)
      setDisplayedKey(pending.key)
      pendingRef.current = null
      setPhase("entering")

      timerRef.current = setTimeout(() => {
        setPhase("idle")
      }, 200)
    }, 140)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, children])

  const style: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    transition: "opacity 150ms ease, transform 150ms ease",
    opacity: phase === "exiting" ? 0 : 1,
    transform:
      phase === "exiting"
        ? "translateY(3px)"
        : phase === "entering"
          ? "translateY(-2px)"
          : "translateY(0)",
  }

  return <div style={style}>{displayed}</div>
}

// ─── UniversalContextPanel ────────────────────────────────────────────────────

export interface UniversalContextPanelProps {
  /** Board definition — drives which presence surfaces are supported. */
  def: UniversalBoardDef
  /** Resolved domain ID — never null by the time this panel renders (board handles resolution). */
  domainId: string | null
  /** Domain display name. */
  domainName: string

  // Explicit selection props — override context values when both are present.
  // When not provided, the panel reads from UniversalBoardContext if available.
  selectedJourneyId?: string | null
  selectedMomentId?: string | null
  selectedKeeperId?: string | null
  selectedDraftId?: string | null
  selectedAgentId?: string | null
  selectedServiceSlug?: string | null

  // Explicit callbacks — override context actions when both are present.
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}

export function UniversalContextPanel({
  def,
  domainId,
  domainName,
  selectedJourneyId,
  selectedMomentId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  selectedServiceSlug,
  onJourneySelect,
  onMomentSelect,
}: UniversalContextPanelProps) {
  const boardCtx = useUniversalBoardOptional()

  // Merge explicit props with context values — explicit props win
  const resolved = {
    selectedJourneyId:   selectedJourneyId   ?? boardCtx?.selection.selectedJourneyId   ?? null,
    selectedMomentId:    selectedMomentId    ?? boardCtx?.selection.selectedMomentId    ?? null,
    selectedKeeperId:    selectedKeeperId    ?? boardCtx?.selection.selectedKeeperId    ?? null,
    selectedDraftId:     selectedDraftId     ?? boardCtx?.selection.selectedDraftId     ?? null,
    selectedAgentId:     selectedAgentId     ?? boardCtx?.selection.selectedAgentId     ?? null,
    selectedServiceSlug: selectedServiceSlug ?? boardCtx?.selection.selectedServiceSlug ?? null,
  }

  const handleJourneySelect = onJourneySelect ?? boardCtx?.actions.onJourneySelect
  const handleMomentSelect  = onMomentSelect  ?? boardCtx?.actions.onMomentSelect

  const activeCtx = resolvePresenceKind(resolved)

  // Stable context key — drives the transition layer
  const contextKey = `${activeCtx.kind}:${activeCtx.id ?? "_"}`

  // Surface selection — which presence surface renders for this context
  function renderSurface(): React.ReactNode {
    switch (activeCtx.kind) {
      case "journey":
        return activeCtx.id ? (
          <JourneyPresence
            journeyId={activeCtx.id}
            domainId={domainId}
            onMomentSelect={handleMomentSelect}
          />
        ) : (
          <DomainPresence domainId={domainId} domainName={domainName} onJourneySelect={handleJourneySelect} />
        )

      case "moment":
        return activeCtx.id ? (
          <MomentPresence momentId={activeCtx.id} />
        ) : (
          <DomainPresence domainId={domainId} domainName={domainName} onJourneySelect={handleJourneySelect} />
        )

      case "keeper":
        return activeCtx.id ? (
          <KeeperPresence keeperId={activeCtx.id} onJourneySelect={handleJourneySelect} />
        ) : (
          <DomainPresence domainId={domainId} domainName={domainName} onJourneySelect={handleJourneySelect} />
        )

      case "draft":
        return activeCtx.id ? (
          <DraftPresence draftId={activeCtx.id} domainId={domainId} />
        ) : (
          <DomainPresence domainId={domainId} domainName={domainName} onJourneySelect={handleJourneySelect} />
        )

      case "domain":
      default:
        return (
          <DomainPresence
            domainId={domainId}
            domainName={domainName}
            onJourneySelect={handleJourneySelect}
          />
        )
    }
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
      <PresenceTransition contextKey={contextKey}>
        {renderSurface()}
      </PresenceTransition>
    </div>
  )
}

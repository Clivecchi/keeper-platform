"use client"

/**
 * DomainBoard — Moment 2.5
 *
 * Migrated to UniversalBoard shell.
 *
 * Shell removed: outer StyleScope, KeeperTopBar, DomainBriefSlideOver,
 * pageBackground, panel layout divs, gap/padding wiring.
 * UniversalBoard owns all of that now.
 *
 * Center panel: DomainBanner + DomainBoardConversation (persisted Kip session).
 * Right panel:  Chronicle (UniversalViewPanel) — trail history, journey/moment/idle views.
 *               Domain Board Chronicle idle state shows the domain feed (recent Moments +
 *               active Journeys) — the ambient ambient state, never blank.
 *
 * Left panel:   Custom board switcher (Domain / Design / Agent) + domain frames list.
 *
 * Domain-specific data that stays here:
 *   - liveDomainFrame (separately fetched, kept in sync with shell)
 *   - domainId, journeyCount, journeys, momentCount (public + authed fetches)
 *   - selectedMoment (id passed to Chronicle), activeJourneyId
 *   - switcherOpen (DomainSwitcher overlay, triggered by top bar onDomainClick)
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import { loadDomainFrame } from "../../data/loadDomainFrame"
import { useV0Shell } from "../../shell/V0ShellContext"
import { FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"

import { BOARD_FRAMES, type FrameItem } from "../designer/DesignBoardFrameList"
import { apiFetch } from "../../../lib/api"
import { DomainSwitcher } from "../../components/DomainSwitcher"
import { DomainBanner } from "../../components/DomainBanner"
import { StyleScope } from "../../styles/StyleScope"
import { getApiBase } from "../../../lib/apiFetch"

import { UniversalBoard } from "../UniversalBoard"
import { DOMAIN_BOARD_DEF } from "../UniversalBoardDefinition"
import { UniversalViewPanel } from "../panels/UniversalViewPanel"
import { DomainBoardConversation } from "./DomainBoardConversation"

// ─── Constants ────────────────────────────────────────────────────────────────

const JOURNEY_BEGIN_ID = "journey-begin-again-default"

type JourneySummary = { id: string; name: string; momentCount?: number }

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  default: { background: "#f0ece4", color: "#57534e", borderColor: "#d6d3d1" },
  primary: { background: "#ecfdf5", color: "#047857", borderColor: "#6ee7b7" },
  panel: { background: "#e0e7ff", color: "#1d4ed8", borderColor: "#a5b4fc" },
}

function extractFrameTitleFromBlock(frameBlock: unknown): string | null {
  if (!frameBlock || typeof frameBlock !== "object") return null
  const obj = frameBlock as Record<string, unknown>
  const labels = obj.labels as Record<string, unknown> | undefined
  const raw = obj.frame_title ?? labels?.frame_title ?? labels?.frameTitle
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

const FROSTED_GLASS: React.CSSProperties = {
  background: "hsl(var(--theme-surface-panel) / 0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "8px",
  border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
}

type BoardNavId = "domain" | "design" | "agent"

const DOMAIN_FRAMES: FrameItem[] = BOARD_FRAMES.domain ?? [
  { key: "cover", name: "Board Cover", dotColor: "#7F77DD", badge: "default" },
  { key: "feed", name: "Feed", dotColor: "#1D9E75", badge: "primary" },
  { key: "journeys", name: "Journeys", dotColor: "#378ADD", badge: "panel" },
  { key: "keepers", name: "Keepers", dotColor: "#BA7517", badge: "panel" },
  { key: "moments", name: "Moments", dotColor: "#D4537E", badge: "panel" },
]

const MOCK_DOMAINS = [
  { slug: "default", name: "KE3P", tagline: "cynically designed, wonderfully unfolded", coverImageUrl: null },
  { slug: "frogmore", name: "Frogmore Juke Joint", tagline: "housefrogmore.com", coverImageUrl: null },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function DomainBoard() {
  const { domainSlug: slug, domainFrame: shellDomainFrame, styleId, themeSlug } = useV0Shell()
  const domainSlug = slug ?? ""
  const navigate = useNavigate()

  // ── Domain Frame — separately loaded, kept in sync with shell ─────────────
  const [liveDomainFrame, setLiveDomainFrame] = React.useState<DomainFrameJson | null>(shellDomainFrame)

  React.useEffect(() => {
    if (shellDomainFrame) setLiveDomainFrame(shellDomainFrame)
  }, [shellDomainFrame])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    loadDomainFrame(domainSlug)
      .then((frame) => { if (!ignore) setLiveDomainFrame(frame) })
      .catch(console.error)
    return () => { ignore = true }
  }, [domainSlug])

  // ── Left panel state ───────────────────────────────────────────────────────
  const [leftCollapsed, setLeftCollapsed] = React.useState(false)
  const [activeBoardNav, setActiveBoardNav] = React.useState<BoardNavId>("domain")
  const [selectedFrameKey, setSelectedFrameKey] = React.useState<string | null>(null)

  // ── Domain data ────────────────────────────────────────────────────────────
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [journeyCount, setJourneyCount] = React.useState<number | null>(null)
  const [journeys, setJourneys] = React.useState<JourneySummary[]>([])
  const [momentCount, setMomentCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((res: { id?: string }) => {
        if (!ignore && res?.id) setDomainId(res.id)
      })
      .catch(() => {})
    return () => { ignore = true }
  }, [domainSlug])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    const base = getApiBase()
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: unknown[] }) => {
        if (!ignore) setJourneyCount(Array.isArray(json?.journeys) ? json.journeys.length : 0)
      })
      .catch(() => { if (!ignore) setJourneyCount(null) })
    return () => { ignore = true }
  }, [domainSlug])

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    apiFetch(`/api/journeys?domainId=${domainId}`)
      .then((res: unknown) => {
        if (cancelled) return
        const raw = res as { data?: { journeys?: JourneySummary[] }; journeys?: JourneySummary[] }
        setJourneys((raw?.data?.journeys ?? raw?.journeys ?? []) as JourneySummary[])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [domainId])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    apiFetch(`/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=kept&limit=500`)
      .then((json: { data?: unknown[] }) => {
        if (!ignore) {
          const n = Array.isArray(json?.data) ? json.data.length : 0
          setMomentCount(n >= 500 ? 500 : n)
        }
      })
      .catch(() => { if (!ignore) setMomentCount(null) })
    return () => { ignore = true }
  }, [domainSlug])

  // Auto-resolve first Journey when the "Journeys" frame is selected in the left nav.
  const [activeJourneyId, setActiveJourneyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (selectedFrameKey !== "journeys" || !domainSlug) {
      setActiveJourneyId(null)
      return
    }
    let cancelled = false
    const base = getApiBase()
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: Array<{ id: string }> }) => {
        const first = json.journeys?.[0]
        if (!cancelled && first) setActiveJourneyId(first.id)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedFrameKey, domainSlug])

  // ── Right panel state ──────────────────────────────────────────────────────
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null)

  // ── Domain switcher overlay ────────────────────────────────────────────────
  const [switcherOpen, setSwitcherOpen] = React.useState(false)

  // ── Derived values ─────────────────────────────────────────────────────────

  const wordmark = liveDomainFrame?.theme?.wordmark?.trim() || domainSlug

  const frames = DOMAIN_FRAMES
  const activeFrameRow = selectedFrameKey ? frames.find((f) => f.key === selectedFrameKey) ?? null : null
  const jsonKeyForActive = selectedFrameKey ? FRAME_TO_JSON_KEY[selectedFrameKey] ?? null : null
  const frameBlockForActive =
    jsonKeyForActive && liveDomainFrame
      ? (liveDomainFrame as unknown as Record<string, unknown>)[jsonKeyForActive]
      : null
  // frameContextLine available for future use (currently drives no JSX)
  const _frameContextLine =
    (activeFrameRow && extractFrameTitleFromBlock(frameBlockForActive)) ?? activeFrameRow?.name ?? ""

  // ── Board navigation ───────────────────────────────────────────────────────

  const navigateBoard = (id: BoardNavId) => {
    setActiveBoardNav(id)
    if (!domainSlug) return
    if (id === "domain") navigate(`/d/${encodeURIComponent(domainSlug)}?board=domain`)
    else if (id === "design") navigate(`/d/${encodeURIComponent(domainSlug)}?board=designer`)
    else navigate(`/d/${encodeURIComponent(domainSlug)}?board=agent`)
  }

  const _goPresentJourney = () => {
    if (!domainSlug) return
    navigate(`/d/${encodeURIComponent(domainSlug)}?frame=present&journeyId=${encodeURIComponent(JOURNEY_BEGIN_ID)}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <UniversalBoard
      def={DOMAIN_BOARD_DEF}
      onDomainClick={() => setSwitcherOpen(true)}

      // Left — custom board switcher + domain frames list (preserved from original)
      left={(_leftProps) => (
        <div
          className="flex flex-col min-h-0 transition-all duration-200 overflow-hidden"
          style={{
            width: leftCollapsed ? 36 : 220,
            minWidth: leftCollapsed ? 36 : 220,
            ...FROSTED_GLASS,
            overflowY: "auto",
          }}
        >
          {leftCollapsed ? (
            <div className="flex flex-col items-center pt-3" style={{ width: 36, minWidth: 36 }}>
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                className="p-1.5 rounded-md transition-colors hover:bg-gray-100"
                aria-label="Expand board list"
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M4 2L8 6L4 10"
                    stroke="#6b7280"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#e7e5e4" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#57534e" }}>
                  Boards
                </p>
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="p-1 rounded-md transition-colors hover:bg-gray-100"
                  aria-label="Collapse board list"
                >
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M8 2L4 6L8 10"
                      stroke="#6b7280"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <ul className="px-2 pt-2">
                {(
                  [
                    { id: "domain" as const, name: "Domain Board" },
                    { id: "design" as const, name: "Design Board" },
                    { id: "agent" as const, name: "Agent Board" },
                  ] as const
                ).map(({ id, name }) => {
                  const isActive = activeBoardNav === id
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => navigateBoard(id)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors"
                        style={{ background: isActive ? "#f0ece4" : "transparent" }}
                      >
                        <span
                          className="text-[13px] leading-snug truncate"
                          style={{
                            color: isActive ? "#1c1917" : "#44403c",
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {name}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#78716c" }}>
                  Frames
                </p>
              </div>
              <ul className="px-2 flex-1 pb-2">
                {frames.map((frame) => {
                  const isActive = frame.key === selectedFrameKey
                  return (
                    <li key={frame.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedFrameKey(frame.key)}
                        className="w-full flex items-center gap-3 px-2 py-2.5 text-left transition-colors"
                        style={{
                          background: isActive ? "#f0ece4" : "transparent",
                          borderLeft: isActive ? "2px solid #1c1917" : "2px solid transparent",
                        }}
                      >
                        <span
                          className="shrink-0 rounded-full"
                          style={{ width: 8, height: 8, background: frame.dotColor }}
                        />
                        <span
                          className="flex-1 text-[13px] leading-snug truncate"
                          style={{
                            color: isActive ? "#1c1917" : "#44403c",
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {frame.name.replace(/ Frame$/, "")}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                          style={BADGE_STYLES[frame.badge] ?? BADGE_STYLES.default}
                        >
                          {frame.badge}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      // Center — DomainBanner + persisted Kip conversation (DomainBoardConversation)
      center={(_props) => (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <StyleScope
            styleId={styleId}
            themeSlug={themeSlug ?? null}
            className="flex flex-1 flex-col min-h-0 overflow-hidden"
          >
            <DomainBanner
              domainFrame={liveDomainFrame}
              fallbackWordmark={domainSlug || "—"}
              journeyCount={journeyCount}
              momentCount={momentCount}
            />
            <DomainBoardConversation
              domainSlug={domainSlug}
              domainId={domainId}
              wordmark={wordmark}
              journeyCount={journeyCount}
              momentCount={momentCount}
            />
          </StyleScope>
          {/* DomainSwitcher — fixed overlay, triggered by top bar onDomainClick */}
          {switcherOpen && (
            <DomainSwitcher
              domains={MOCK_DOMAINS}
              currentSlug={domainSlug || "default"}
              onSelect={(s) => navigate(`/d/${encodeURIComponent(s)}/board`)}
              onAddDomain={() => console.log("Add domain")}
              onClose={() => setSwitcherOpen(false)}
            />
          )}
        </div>
      )}

      // Right — Chronicle (UniversalViewPanel). domainSlug enables domain feed in idle state.
      // DomainBoard's local selection state feeds in so trail/views respond to journey clicks.
      right={(_props) => (
        <UniversalViewPanel
          def={DOMAIN_BOARD_DEF}
          domainId={domainId}
          domainName={wordmark || domainSlug}
          domainSlug={domainSlug || undefined}
          selectedJourneyId={activeJourneyId}
          selectedMomentId={selectedMomentId}
          onJourneySelect={(id) => {
            setActiveJourneyId(id)
            setSelectedMomentId(null)
          }}
          onMomentSelect={(id) => setSelectedMomentId(id)}
        />
      )}
    />
  )
}

"use client"

/**
 * DomainBoard — Moment 2.6
 *
 * Migrated to UniversalBoard + UniversalConversation (Level 2).
 *
 * What stays here:
 *   - Custom left panel: board switcher (Domain / Design / Agent) + domain frames list.
 *   - DomainSwitcher overlay (triggered by top-bar onDomainClick, rendered as fixed overlay).
 *
 * What moved:
 *   - Center: DomainBanner + Kip conversation → UniversalConversation (domain mode).
 *   - Right: Chronicle (UniversalViewPanel) → UniversalBoard default, domainSlug-aware.
 *   - journeyCount, momentCount, domainId, liveDomainFrame fetches → UniversalConversation.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useV0Shell } from "../../shell/V0ShellContext"

import { BOARD_FRAMES, type FrameItem } from "../designer/DesignBoardFrameList"
import { DomainSwitcher } from "../../components/DomainSwitcher"

import { UniversalBoard } from "../UniversalBoard"
import { DOMAIN_BOARD_DEF } from "../UniversalBoardDefinition"

// ─── Constants ────────────────────────────────────────────────────────────────

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

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  default: { background: "#f0ece4", color: "#57534e", borderColor: "#d6d3d1" },
  primary: { background: "#ecfdf5", color: "#047857", borderColor: "#6ee7b7" },
  panel: { background: "#e0e7ff", color: "#1d4ed8", borderColor: "#a5b4fc" },
}

const FROSTED_GLASS: React.CSSProperties = {
  background: "hsl(var(--theme-surface-panel) / 0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "8px",
  border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DomainBoard() {
  const { domainSlug: slug } = useV0Shell()
  const domainSlug = slug ?? ""
  const navigate = useNavigate()

  // ── Left panel state ───────────────────────────────────────────────────────
  const [leftCollapsed, setLeftCollapsed] = React.useState(false)
  const [activeBoardNav, setActiveBoardNav] = React.useState<BoardNavId>("domain")
  const [selectedFrameKey, setSelectedFrameKey] = React.useState<string | null>(null)

  // ── Domain switcher overlay ────────────────────────────────────────────────
  const [switcherOpen, setSwitcherOpen] = React.useState(false)

  // ── Board navigation ───────────────────────────────────────────────────────
  const navigateBoard = (id: BoardNavId) => {
    setActiveBoardNav(id)
    if (!domainSlug) return
    if (id === "domain") navigate(`/d/${encodeURIComponent(domainSlug)}?board=domain`)
    else if (id === "design") navigate(`/d/${encodeURIComponent(domainSlug)}?board=designer`)
    else navigate(`/d/${encodeURIComponent(domainSlug)}?board=agent`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <UniversalBoard
        def={DOMAIN_BOARD_DEF}
        onDomainClick={() => setSwitcherOpen(true)}

        // Left — custom board switcher + domain frames list
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
                  {DOMAIN_FRAMES.map((frame) => {
                    const isActive = frame.key === selectedFrameKey
                    return (
                      <li key={frame.key}>
                        <button
                          type="button"
                          onClick={() => setSelectedFrameKey(frame.key)}
                          className="w-full flex items-center gap-3 px-2 py-2.5 text-left transition-colors"
                          style={{
                            background: isActive ? "hsl(var(--theme-surface-selected) / 0.06)" : "transparent",
                            borderRadius: "6px",
                          }}
                        >
                          <span
                            className="shrink-0 rounded-full"
                            style={{ width: 7, height: 7, background: frame.dotColor }}
                          />
                          <span
                            className="text-[13px] leading-snug flex-1 truncate"
                            style={{
                              color: isActive ? "#1c1917" : "#44403c",
                              fontWeight: isActive ? 500 : 400,
                            }}
                          >
                            {frame.name}
                          </span>
                          {frame.badge && (
                            <span
                              className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                              style={{
                                ...BADGE_STYLES[frame.badge ?? "default"],
                                border: `1px solid ${BADGE_STYLES[frame.badge ?? "default"]?.borderColor}`,
                              }}
                            >
                              {frame.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      />

      {/* DomainSwitcher — fixed overlay, triggered by top-bar onDomainClick */}
      {switcherOpen && (
        <DomainSwitcher
          domains={MOCK_DOMAINS}
          currentSlug={domainSlug || "default"}
          onSelect={(s) => navigate(`/d/${encodeURIComponent(s)}/board`)}
          onAddDomain={() => console.log("Add domain")}
          onClose={() => setSwitcherOpen(false)}
        />
      )}
    </>
  )
}

"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useV0Shell } from "../../shell/V0ShellContext"
import { StyleScope } from "../../styles/StyleScope"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { AgentBoardFrame } from "../../frames/agent/AgentBoardFrame"
import { V0_MARGIN_HEIGHT } from "../../components/Margin"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

// ─── Types ────────────────────────────────────────────────────────────────────

type BoardNavId = "domain" | "design" | "agent"

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoard() {
  const { domainSlug: slug, domainFrame, styleId, themeSlug, domainData } = useV0Shell()
  const domainSlug = slug ?? ""
  const navigate = useNavigate()
  const ab = domainFrame?.agent_board

  const [leftCollapsed, setLeftCollapsed] = React.useState(false)
  const [briefOpen, setBriefOpen] = React.useState(false)

  const wordmark = domainFrame?.theme?.wordmark?.trim() || domainSlug
  const frameTitle = ab?.frame_title ?? "Agent"
  const modelId = ab?.structure?.model?.id ?? null
  const modelProvider = ab?.structure?.model?.provider ?? null

  const coverImageUrl = domainData?.theme?.coverImage ?? null
  const coverImageMode = domainData?.theme?.coverImageMode ?? "cover"
  const displayCoverUrl = coverImageUrl ? getBlobProxyUrl(coverImageUrl) : null
  const pageBackground: React.CSSProperties = displayCoverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayCoverUrl})`,
        backgroundPosition: coverImageMode === "tile" ? "0 0" : "center",
        backgroundSize: coverImageMode === "tile" ? "auto" : "cover",
        backgroundRepeat: coverImageMode === "tile" ? "repeat" : "no-repeat",
      }
    : {}

  const navigateBoard = (id: BoardNavId) => {
    if (!domainSlug) return
    if (id === "domain") {
      navigate(`/d/${encodeURIComponent(domainSlug)}?board=domain`)
    } else if (id === "design") {
      navigate(`/d/${encodeURIComponent(domainSlug)}?board=designer`)
    } else {
      navigate(`/d/${encodeURIComponent(domainSlug)}?board=agent`)
    }
  }

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
      <div
        className="keeper-board-scope flex flex-col h-screen w-full overflow-hidden"
        style={pageBackground}
      >
        <KeeperTopBar
          onDomainClick={() => {}}
          onBriefClick={() => setBriefOpen((o) => !o)}
          isBriefOpen={briefOpen}
        />
        {briefOpen && domainFrame && (
          <DomainBriefSlideOver
            domainFrame={domainFrame}
            onClose={() => setBriefOpen(false)}
          />
        )}

        <div
          className="flex flex-1 min-h-0 overflow-hidden"
          style={{ paddingBottom: V0_MARGIN_HEIGHT }}
        >
          {/* Left panel */}
          <div
            className="flex flex-col border-r border-[#e7e5e4] min-h-0 transition-all duration-200"
            style={{
              width: leftCollapsed ? 36 : 220,
              minWidth: leftCollapsed ? 36 : 220,
              background: "#fdfbf7",
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
                {/* Boards nav header */}
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

                {/* Boards nav list */}
                <ul className="px-2 pt-2">
                  {(
                    [
                      { id: "domain" as const, name: "Domain Board" },
                      { id: "design" as const, name: "Design Board" },
                      { id: "agent" as const, name: "Agent Board" },
                    ] as const
                  ).map(({ id, name }) => {
                    const isActive = id === "agent"
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

                {/* Agent nav section */}
                <div className="px-4 pt-5 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#78716c" }}>
                    Agent
                  </p>
                </div>
                <ul className="px-2 pb-2">
                  {(
                    [
                      { label: "Dialogue", sub: "Sessions coming soon" },
                      { label: "Drafts", sub: "Drafts coming soon" },
                      { label: "Configuration", sub: "Configuration coming soon" },
                    ]
                  ).map(({ label, sub }) => (
                    <li key={label}>
                      <div className="flex flex-col px-2 py-2.5 rounded-md">
                        <span
                          className="text-[13px] leading-snug"
                          style={{ color: "#44403c" }}
                        >
                          {label}
                        </span>
                        <span
                          className="text-[11px] mt-0.5"
                          style={{ color: "#a8a29e" }}
                        >
                          {sub}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Center panel */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <StyleScope
              styleId={styleId}
              themeSlug={themeSlug ?? null}
              className="flex flex-1 flex-col min-h-0 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto min-h-0">
                <AgentBoardFrame styleId={styleId} themeSlug={themeSlug ?? null} />
              </div>
            </StyleScope>
          </div>

          {/* Right panel */}
          <div
            className="shrink-0 flex flex-col border-l border-gray-200 bg-[#faf8f5] min-h-0 overflow-y-auto"
            style={{ width: 380 }}
          >
            <div
              className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e7e5e4]"
            >
              <span className="text-[13px] font-semibold" style={{ color: "#1c1917" }}>
                Agent
              </span>
            </div>

            <div className="px-4 py-4 space-y-4 text-[13px]" style={{ color: "#44403c" }}>
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#78716c" }}>
                  Name
                </p>
                <p className="font-medium" style={{ color: "#1c1917" }}>
                  {frameTitle}
                </p>
                <p className="text-[12px] mt-0.5 font-mono" style={{ color: "#57534e" }}>
                  {wordmark}
                </p>
              </div>

              {(modelId || modelProvider) && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#78716c" }}>
                    Model
                  </p>
                  {modelId && (
                    <p className="font-mono text-[12px]" style={{ color: "#292524" }}>
                      {modelId}
                    </p>
                  )}
                  {modelProvider && (
                    <p className="text-[12px] mt-0.5" style={{ color: "#57534e" }}>
                      {modelProvider}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-[#e7e5e4] pt-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[12px] font-medium" style={{ color: "#047857" }}>
                    Kip is ready
                  </span>
                </div>
              </div>

              <div className="border-t border-[#e7e5e4] pt-4">
                <button
                  type="button"
                  onClick={() => navigateBoard("domain")}
                  className="text-[12px] transition-opacity hover:opacity-70"
                  style={{ color: "#57534e" }}
                >
                  ← Back to Domain
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

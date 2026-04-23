"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"

import { StyleScope } from "../../styles/StyleScope"
import { getBlobProxyUrl } from "../../../lib/blobProxy"
import { IDEBoardNav } from "./IDEBoardNav"
import { IDEBoardConversation } from "./IDEBoardConversation"
import { IDEBoardJourney } from "./IDEBoardJourney"

export type IDEBoardActiveContext = {
  type: "journey" | "moment" | "keeper" | "draft"
  id: string
} | null

export function IDEBoard() {
  const { domainSlug, styleId, themeSlug, domainFrame, domainData } = useV0Shell()
  const [briefOpen, setBriefOpen] = React.useState(false)
  const [activeContext, setActiveContext] = React.useState<IDEBoardActiveContext>(null)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)

  // ─── Background (same pattern as AgentBoard) ─────────────────────────────
  const coverImageUrl   = domainData?.theme?.coverImage ?? null
  const coverImageMode  = domainData?.theme?.coverImageMode ?? "cover"
  const displayCoverUrl = coverImageUrl ? getBlobProxyUrl(coverImageUrl) : null
  const pageBackground: React.CSSProperties = displayCoverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayCoverUrl})`,
        backgroundPosition: coverImageMode === "tile" ? "0 0" : "center",
        backgroundSize: coverImageMode === "tile" ? "auto" : "cover",
        backgroundRepeat: coverImageMode === "tile" ? "repeat" : "no-repeat",
      }
    : {}

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
      <div className="keeper-board-scope flex flex-col h-screen w-full overflow-hidden" style={pageBackground}>
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

        <div className="flex flex-1 min-h-0 overflow-hidden px-6 pb-8">
          {/* Left — nav (matches AgentBoard sidebar surface) */}
          <div
            className="shrink-0 flex flex-col border-r min-h-0"
            style={{
              width: 260,
              minWidth: 260,
              background: "hsl(var(--theme-surface-sidebar, var(--theme-surface-page)))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          >
            <IDEBoardNav
              domainSlug={domainSlug ?? ""}
              setActiveContext={setActiveContext}
              onSelectSession={setSelectedSessionId}
            />
          </div>

          {/* Center — conversation; atmosphere reads through (same pattern as AgentBoard) */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden border-r" style={{ borderColor: "hsl(var(--theme-line-hairline))" }}>
            <StyleScope styleId={styleId} themeSlug={themeSlug ?? null} className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <IDEBoardConversation
                domainSlug={domainSlug ?? ""}
                selectedSessionId={selectedSessionId}
                setActiveContext={setActiveContext}
              />
            </StyleScope>
          </div>

          {/* Right — journey panel (matches AgentBoard right surface) */}
          <div
            className="shrink-0 flex flex-col border-l min-h-0 overflow-hidden"
            style={{
              width: 380,
              minWidth: 380,
              background: "hsl(var(--theme-surface-panel, var(--theme-surface-page)))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          >
            <IDEBoardJourney domainSlug={domainSlug ?? ""} activeContext={activeContext} />
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

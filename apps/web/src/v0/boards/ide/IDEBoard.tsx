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

export function IDEBoard() {
  const { domainSlug, styleId, themeSlug, domainFrame, domainData } = useV0Shell()
  const [briefOpen, setBriefOpen] = React.useState(false)
  const [selectedJourneyId, setSelectedJourneyId] = React.useState<string | null>(null)

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

        <div className="flex flex-1 min-h-0 overflow-hidden px-6 pb-6">
          {/* Floating card — three-panel layout sits inside */}
          <div
            className="flex flex-1 min-h-0 rounded-3xl border overflow-hidden"
            style={{
              borderColor: "var(--theme-border-soft, hsl(var(--theme-line-hairline)))",
              background: "hsl(var(--theme-surface-paper, var(--theme-surface-page)) / 0.88)",
            }}
          >
            {/* Left */}
            <div
              className="flex flex-col border-r min-h-0"
              style={{ width: 260, minWidth: 260, borderColor: "hsl(var(--theme-line-hairline))" }}
            >
              <IDEBoardNav
                domainSlug={domainSlug ?? ""}
                selectedJourneyId={selectedJourneyId}
                onSelectJourney={setSelectedJourneyId}
              />
            </div>

            {/* Center */}
            <div
              className="flex flex-col flex-1 min-w-0 min-h-0 border-r"
              style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
            >
              <IDEBoardConversation domainSlug={domainSlug ?? ""} />
            </div>

            {/* Right */}
            <div className="shrink-0 flex flex-col min-h-0" style={{ width: 380 }}>
              <IDEBoardJourney domainSlug={domainSlug ?? ""} journeyId={selectedJourneyId ?? undefined} />
            </div>
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

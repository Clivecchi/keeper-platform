"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { V0_MARGIN_HEIGHT } from "../../components/Margin"
import { StyleScope } from "../../styles/StyleScope"
import { IDEBoardNav } from "./IDEBoardNav"
import { IDEBoardConversation } from "./IDEBoardConversation"
import { IDEBoardJourney } from "./IDEBoardJourney"

export function IDEBoard() {
  const { domainSlug, styleId, themeSlug, domainFrame } = useV0Shell()
  const [briefOpen, setBriefOpen] = React.useState(false)

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null} className="keeper-board-scope relative flex flex-col h-screen w-full overflow-hidden">
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

      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: V0_MARGIN_HEIGHT }}>
        {/* Left */}
        <div
          className="flex flex-col border-r min-h-0"
          style={{
            width: 220,
            minWidth: 220,
            background: "hsl(var(--theme-surface-paper))",
            borderColor: "hsl(var(--theme-line-hairline))",
          }}
        >
          <IDEBoardNav domainSlug={domainSlug ?? ""} />
        </div>

        {/* Center */}
        <div
          className="flex flex-col flex-1 min-w-0 min-h-0 border-r"
          style={{
            borderColor: "hsl(var(--theme-line-hairline))",
            background: "hsl(var(--theme-surface-paper))",
          }}
        >
          <IDEBoardConversation domainSlug={domainSlug ?? ""} />
        </div>

        {/* Right */}
        <div
          className="shrink-0 flex flex-col border-l min-h-0"
          style={{
            width: 380,
            borderColor: "hsl(var(--theme-line-hairline))",
            background: "hsl(var(--theme-surface-paper))",
          }}
        >
          <IDEBoardJourney domainSlug={domainSlug ?? ""} />
        </div>
      </div>
    </StyleScope>
  )
}

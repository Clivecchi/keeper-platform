"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { StyleScope } from "../../styles/StyleScope"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { V0_MARGIN_HEIGHT } from "../../components/Margin"
import { getBlobProxyUrl } from "../../../lib/blobProxy"
import { AgentBoardNav } from "./AgentBoardNav"
import { AgentBoardConversation } from "./AgentBoardConversation"
import { AgentBoardPanel } from "./AgentBoardPanel"

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoard() {
  const { domainSlug: slug, domainFrame, styleId, themeSlug, domainData } = useV0Shell()
  const domainSlug = slug ?? ""

  const [briefOpen, setBriefOpen]             = React.useState(false)
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null)

  // ─── Background ──────────────────────────────────────────────────────────
  const coverImageUrl  = domainData?.theme?.coverImage ?? null
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

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
      <div
        className="keeper-board-scope flex flex-col h-screen w-full overflow-hidden"
        style={pageBackground}
      >
        {/* KeeperTopBar — do not modify */}
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

        {/* Three-panel layout */}
        <div
          className="flex flex-1 min-h-0 overflow-hidden"
          style={{ paddingBottom: V0_MARGIN_HEIGHT }}
        >
          {/* ── Left: Nav Panel ─────────────────────────────────────────── */}
          <div
            className="shrink-0 flex flex-col border-r min-h-0"
            style={{
              width: 220,
              minWidth: 220,
              background: "hsl(var(--theme-surface-sidebar, var(--theme-surface-page)))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          >
            <AgentBoardNav
              domainSlug={domainSlug}
              selectedAgentId={selectedAgentId}
              onAgentSelect={setSelectedAgentId}
            />
          </div>

          {/* ── Center: Conversation Panel ──────────────────────────────── */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <StyleScope
              styleId={styleId}
              themeSlug={themeSlug ?? null}
              className="flex flex-1 flex-col min-h-0 overflow-hidden"
            >
              <AgentBoardConversation domainSlug={domainSlug} />
            </StyleScope>
          </div>

          {/* ── Right: Agent Panel ──────────────────────────────────────── */}
          <div
            className="shrink-0 flex flex-col border-l min-h-0 overflow-hidden"
            style={{
              width: 320,
              minWidth: 320,
              background: "hsl(var(--theme-surface-panel, var(--theme-surface-page)))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          >
            <AgentBoardPanel
              agentId={selectedAgentId}
              domainSlug={domainSlug}
            />
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

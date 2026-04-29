"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { StyleScope } from "../../styles/StyleScope"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"

import { getBlobProxyUrl } from "../../../lib/blobProxy"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import type { KipDraftSummary } from "../../../lib/kipApi"
import { AgentBoardNav } from "./AgentBoardNav"
import { AgentBoardConversation } from "./AgentBoardConversation"
import { AgentBoardPanel } from "./AgentBoardPanel"
import { KeeperBoardPanelGroup } from "../KeeperBoardPanelGroup"

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoard() {
  const { domainSlug: slug, domainFrame, styleId, themeSlug, domainData } = useV0Shell()
  const domainSlug = slug ?? ""

  const [briefOpen, setBriefOpen] = React.useState(false)
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [drafts, setDrafts] = React.useState<KipDraftSummary[] | null>(null)

  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((res: unknown) => {
        if (!cancelled) setDomainId((res as { id?: string })?.id ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  const refreshDrafts = React.useCallback(async () => {
    if (!domainId) return
    try {
      const list = await KipApi.listDrafts(domainId)
      setDrafts(list)
    } catch {
      // degrade silently
    }
  }, [domainId])

  React.useEffect(() => {
    if (domainId) void refreshDrafts()
  }, [domainId, refreshDrafts])

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId)
    setSelectedDraftId(null)
  }

  const handleDraftSelect = (draftId: string) => {
    setSelectedDraftId(draftId)
    setSelectedAgentId(null)
  }

  const handleClearDraft = () => setSelectedDraftId(null)

  const draftTitle =
    selectedDraftId && drafts
      ? drafts.find((d) => d.id === selectedDraftId)?.title?.trim() ?? null
      : null
  const bannerEyebrow = draftTitle ? "Draft" : "Conversation"
  const bannerTitle = draftTitle ?? "Agent Studio"

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

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
      <div
        className="keeper-board-scope flex h-screen w-full flex-col overflow-hidden"
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

        <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-8">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <KeeperBoardPanelGroup
              key={`agent-board-panels-${domainSlug || "default"}`}
              boardKind="agent"
              domainSlug={domainSlug}
              left={
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden"
                  style={{
                    background: "hsl(var(--theme-surface-panel) / 0.85)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
                  }}
                >
                  <AgentBoardNav
                    domainSlug={domainSlug}
                    selectedAgentId={selectedAgentId}
                    onAgentSelect={handleAgentSelect}
                    selectedDraftId={selectedDraftId}
                    onDraftSelect={handleDraftSelect}
                    drafts={drafts}
                    refreshDrafts={refreshDrafts}
                  />
                </div>
              }
              center={
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden"
                  style={{ background: "transparent", borderRadius: "8px" }}
                >
                  <AgentBoardConversation
                    domainSlug={domainSlug}
                    domainId={domainId}
                    refreshDrafts={refreshDrafts}
                    onDraftSelect={handleDraftSelect}
                    bannerEyebrow={bannerEyebrow}
                    bannerTitle={bannerTitle}
                  />
                </div>
              }
              right={
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden"
                  style={{
                    background: "hsl(var(--theme-surface-panel) / 0.85)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
                  }}
                >
                  <AgentBoardPanel
                    agentId={selectedAgentId}
                    draftId={selectedDraftId}
                    domainId={domainId}
                    domainSlug={domainSlug}
                    onClearDraft={handleClearDraft}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

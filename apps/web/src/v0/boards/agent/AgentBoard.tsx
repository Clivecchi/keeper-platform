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
import { UniversalNavPanel } from "../UniversalNavPanel"
import { AgentBoardConversation } from "./AgentBoardConversation"
import { AgentBoardPanel } from "./AgentBoardPanel"
import { AgentBoardIdlePanel } from "./AgentBoardIdlePanel"
import { KeeperBoardPanelGroup } from "../KeeperBoardPanelGroup"

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoard() {
  const { domainSlug: slug, domainFrame, styleId, themeSlug, domainData } = useV0Shell()
  const domainSlug = slug ?? ""

  const [briefOpen, setBriefOpen] = React.useState(false)
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [domainError, setDomainError] = React.useState(false)
  const [drafts, setDrafts] = React.useState<KipDraftSummary[] | null>(null)

  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    setDomainError(false)
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((res: unknown) => {
        if (!cancelled) setDomainId((res as { id?: string })?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) setDomainError(true)
      })
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

  if (domainError && !domainId) {
    return (
      <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
        <div
          className="keeper-board-scope flex h-screen w-full items-center justify-center"
          style={pageBackground}
        >
          <p
            className="text-[13px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Unable to load workspace. Please refresh.
          </p>
        </div>
      </StyleScope>
    )
  }

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
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <UniversalNavPanel
                    domainId={domainId}
                    domainSlug={domainSlug}
                    domainName={domainFrame?.theme?.wordmark?.trim() || domainSlug}
                    boardContext="agent"
                    selectedAgentId={selectedAgentId}
                    selectedDraftId={selectedDraftId}
                    onAgentSelect={handleAgentSelect}
                    onDraftSelect={handleDraftSelect}
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
                  {/* Board-level view state — draft → agent → idle */}
                  {selectedDraftId && domainId ? (
                    <AgentBoardPanel
                      mode="draft"
                      agentId={null}
                      draftId={selectedDraftId}
                      domainId={domainId}
                      domainSlug={domainSlug}
                      onClearDraft={handleClearDraft}
                    />
                  ) : selectedAgentId ? (
                    <AgentBoardPanel
                      mode="agent"
                      agentId={selectedAgentId}
                      draftId={null}
                      domainId={domainId}
                      domainSlug={domainSlug}
                      onClearDraft={handleClearDraft}
                    />
                  ) : (
                    <AgentBoardIdlePanel />
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

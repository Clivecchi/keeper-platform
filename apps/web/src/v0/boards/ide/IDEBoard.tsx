"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { apiFetch } from "../../../lib/api"

import { StyleScope } from "../../styles/StyleScope"
import { getBlobProxyUrl } from "../../../lib/blobProxy"
import { IDEBoardNav } from "./IDEBoardNav"
import { IDEBoardConversation } from "./IDEBoardConversation"
import { IDEBoardContext } from "./IDEBoardContext"
import type { IDEBoardKipContext } from "./ideBoardTypes"
import { KeeperBoardPanelGroup } from "../KeeperBoardPanelGroup"
import { ServicesFrame } from "./components/ServicesFrame"

type JourneySummary = { id: string; name: string; momentCount?: number }
type KeeperSummary = { id: string; title: string }

export function IDEBoard() {
  const { domainSlug, styleId, themeSlug, domainFrame, domainData } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const [briefOpen, setBriefOpen] = React.useState(false)

  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [journeys, setJourneys] = React.useState<JourneySummary[]>([])
  const [keepers, setKeepers] = React.useState<KeeperSummary[]>([])
  const [activeJourneyId, setActiveJourneyId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [draftListVersion, setDraftListVersion] = React.useState(0)
  const [activeService, setActiveService] = React.useState<"cloud" | "railway" | "vercel" | "github" | null>(null)

  const onServiceOpen = React.useCallback(
    (service?: "cloud" | "railway" | "vercel" | "github") => {
      setActiveService(service ?? "cloud")
    },
    [],
  )

  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((res: { id?: string }) => {
        if (!cancelled && res?.id) setDomainId(res.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  // Load journeys + keepers (same as AgentBoardFrame)
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    Promise.all([
      apiFetch(`/api/journeys?domainId=${domainId}`).catch(() => null),
      apiFetch(`/api/keepers?domainId=${domainId}`).catch(() => null),
    ]).then(([journeysRes, keepersRes]) => {
      if (cancelled) return
      setJourneys(
        ((journeysRes as any)?.data?.journeys ?? (journeysRes as any)?.journeys ?? []) as JourneySummary[],
      )
      setKeepers(
        ((keepersRes as any)?.data?.keepers ?? (keepersRes as any)?.keepers ?? []) as KeeperSummary[],
      )
    }).catch(() => {})
    return () => { cancelled = true }
  }, [domainId])

  // Derive names from frameCtx selections (same pattern as AgentBoardFrame)
  const keeperName = keepers.find((k) => k.id === (frameCtx?.selection.activeKeeperId ?? null))?.title ?? null
  const journeyName = journeys.find((j) => j.id === (frameCtx?.selection.activeJourneyId ?? activeJourneyId))?.name ?? null

  const onJourneySelect = React.useCallback((id: string) => {
    setActiveJourneyId(id)
    setSelectedDraftId(null)
    setSelectedMomentId(null)
  }, [])

  const onDraftSelect = React.useCallback((id: string) => {
    setSelectedDraftId(id)
    setActiveJourneyId(null)
    setSelectedMomentId(null)
  }, [])

  const onMomentSelect = React.useCallback((id: string) => {
    setSelectedMomentId(id)
    setSelectedDraftId(null)
    setActiveJourneyId(null)
  }, [])

  const onSessionSelect = React.useCallback((id: string) => {
    setActiveSessionId(id)
    setSelectedMomentId(null)
  }, [])

  const onKipContextSync = React.useCallback((ctx: IDEBoardKipContext) => {
    if (ctx.type === "draft") {
      setSelectedDraftId(ctx.id)
      setActiveJourneyId(null)
      setSelectedMomentId(null)
      setDraftListVersion((v) => v + 1)
      return
    }
    if (ctx.type === "journey") {
      setActiveJourneyId(ctx.id)
      setSelectedDraftId(null)
      setSelectedMomentId(null)
      return
    }
    if (ctx.type === "moment") {
      setSelectedMomentId(ctx.id)
      setSelectedDraftId(null)
      setActiveJourneyId(null)
    }
  }, [])

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

  const sheetChrome: React.CSSProperties = {
    background: "hsl(var(--theme-surface-paper) / 0.96)",
    border: "1px solid hsl(var(--theme-border-soft))",
    boxShadow: "var(--theme-shadow-soft)",
  }

  const slug = domainSlug ?? ""

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

        <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-8">
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl"
            style={sheetChrome}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <KeeperBoardPanelGroup
              key={`ide-board-panels-${slug || "default"}`}
              boardKind="ide"
              domainSlug={slug}
              left={
                <div
                  className="flex h-full min-h-0 flex-col border-r"
                  style={{
                    background: "hsl(var(--theme-surface-panel))",
                    borderColor: "hsl(var(--theme-line-hairline))",
                  }}
                >
                  <IDEBoardNav
                    domainSlug={slug}
                    domainId={domainId}
                    activeJourneyId={activeJourneyId}
                    onJourneySelect={onJourneySelect}
                    selectedDraftId={selectedDraftId}
                    onDraftSelect={onDraftSelect}
                    activeSessionId={activeSessionId}
                    onSessionSelect={onSessionSelect}
                    draftListVersion={draftListVersion}
                  />
                </div>
              }
              center={
                <div className="flex h-full min-h-0 flex-col" style={{ background: "hsl(var(--theme-dialogue-area-bg))" }}>
                  <IDEBoardConversation
                    domainSlug={slug}
                    domainId={domainId}
                    activeSessionId={activeSessionId}
                    onActiveSessionIdChange={setActiveSessionId}
                    activeJourneyId={activeJourneyId}
                    selectedDraftId={selectedDraftId}
                    onKipContextSync={onKipContextSync}
                    onSelectDraftInPlace={onDraftSelect}
                    onMomentSelect={onMomentSelect}
                    keeperName={keeperName}
                    journeyName={journeyName}
                    onServiceOpen={onServiceOpen}
                  />
                </div>
              }
              right={
                <div
                  className="flex h-full min-h-0 flex-col border-l"
                  style={{
                    background: "hsl(var(--theme-surface-panel))",
                    borderColor: "hsl(var(--theme-line-hairline))",
                  }}
                >
                  {activeService !== null ? (
                    <ServicesFrame
                      initialService={activeService}
                      onClose={() => setActiveService(null)}
                    />
                  ) : (
                    <IDEBoardContext
                      domainSlug={slug}
                      domainId={domainId}
                      activeJourneyId={activeJourneyId}
                      selectedDraftId={selectedDraftId}
                      selectedMomentId={selectedMomentId}
                    />
                  )}
                </div>
              }
            />
            </div>
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

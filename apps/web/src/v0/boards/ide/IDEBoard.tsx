"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { apiFetch } from "../../../lib/api"

import { StyleScope } from "../../styles/StyleScope"
import { getBlobProxyUrl } from "../../../lib/blobProxy"
import { IDEBoardNav } from "./IDEBoardNav"
import { IDEBoardConversation } from "./IDEBoardConversation"
import { IDEBoardContext } from "./IDEBoardContext"
import type { IDEBoardKipContext } from "./ideBoardTypes"

export function IDEBoard() {
  const { domainSlug, styleId, themeSlug, domainFrame, domainData } = useV0Shell()
  const [briefOpen, setBriefOpen] = React.useState(false)

  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [activeJourneyId, setActiveJourneyId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [draftListVersion, setDraftListVersion] = React.useState(0)

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

  // ─── Background (same pattern as AgentBoard) ─────────────────────────────
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

          {/* Center — conversation; atmosphere reads through (same pattern as AgentBoard) */}
          <div
            className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden border-r"
            style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
          >
            <StyleScope styleId={styleId} themeSlug={themeSlug ?? null} className="flex flex-1 flex-col min-h-0 overflow-hidden">
              <IDEBoardConversation
                domainSlug={domainSlug ?? ""}
                domainId={domainId}
                activeSessionId={activeSessionId}
                onActiveSessionIdChange={setActiveSessionId}
                activeJourneyId={activeJourneyId}
                selectedDraftId={selectedDraftId}
                onKipContextSync={onKipContextSync}
                onSelectDraftInPlace={onDraftSelect}
                onMomentSelect={onMomentSelect}
              />
            </StyleScope>
          </div>

          {/* Right — context panel (matches AgentBoard right surface) */}
          <div
            className="shrink-0 flex flex-col border-l min-h-0 overflow-hidden"
            style={{
              width: 380,
              minWidth: 380,
              background: "hsl(var(--theme-surface-panel, var(--theme-surface-page)))",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          >
            <IDEBoardContext
              domainSlug={domainSlug ?? ""}
              domainId={domainId}
              activeJourneyId={activeJourneyId}
              selectedDraftId={selectedDraftId}
              selectedMomentId={selectedMomentId}
            />
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

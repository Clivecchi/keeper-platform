"use client"

/**
 * IDEBoard — Moment 2.6
 *
 * Migrated to UniversalBoard + UniversalConversation (Level 2).
 *
 * What stays here:
 *   - domainId resolution for journeys/keepers fetch (right panel data).
 *   - journeys + keepers state (KeeperViewPanel + HomeViewPanel).
 *   - Right panel: 5-state custom panel — service → journey/draft/moment
 *     → keeper (explicit) → keeper (frame context) → home.
 *     All state now read from centerProps (UniversalBoardContext).
 *
 * What moved:
 *   - Left: IDEBoardNav → UniversalNavPanel (default from UniversalBoard).
 *   - Center: IDEBoardConversation → UniversalConversation (ide mode).
 *   - Session state + selection state → UniversalBoardContext.
 */

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { apiFetch } from "../../../lib/api"

import { UniversalBoard } from "../UniversalBoard"
import { IDE_BOARD_DEF } from "../UniversalBoardDefinition"
import { IDEBoardContext } from "./IDEBoardContext"
import { ServicesFrame } from "./components/ServicesFrame"
import { KeeperViewPanel } from "../../components/panels/KeeperViewPanel"
import { HomeViewPanel } from "../../components/panels/HomeViewPanel"

// ─── Types ────────────────────────────────────────────────────────────────────

type JourneySummary = { id: string; name: string; momentCount?: number; keeperId?: string | null }
type KeeperSummary = { id: string; title: string }

const FROSTED_GLASS: React.CSSProperties = {
  background: "hsl(var(--theme-surface-panel) / 0.85)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "8px",
  border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoard() {
  const { domainSlug, domainFrame } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const slug = domainSlug ?? ""

  // ── Board data — right panel only ─────────────────────────────────────────
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [journeys, setJourneys] = React.useState<JourneySummary[]>([])
  const [keepers, setKeepers] = React.useState<KeeperSummary[]>([])

  React.useEffect(() => {
    if (!slug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(slug)}`)
      .then((res: { id?: string }) => {
        if (!cancelled && res?.id) setDomainId(res.id)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [slug])

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <UniversalBoard
      def={IDE_BOARD_DEF}

      // Right — 5-state panel, all selection state from centerProps (UniversalBoardContext)
      right={(props) => {
        // State 1: Service connection overlay
        if (props.selectedServiceSlug) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <ServicesFrame
                initialService={props.selectedServiceSlug as "cloud" | "railway" | "vercel" | "github"}
                onClose={() => props.clearSelection()}
              />
            </div>
          )
        }

        // State 2: Journey / Draft / Moment — IDEBoardContext owns the panel
        if (props.selectedJourneyId || props.selectedDraftId || props.selectedMomentId) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <IDEBoardContext
                domainSlug={slug}
                domainId={domainId}
                activeJourneyId={props.selectedJourneyId}
                selectedDraftId={props.selectedDraftId}
                selectedMomentId={props.selectedMomentId}
                onJourneySelect={props.onJourneySelect}
                onDraftSelect={props.onDraftSelect}
                onJourneyBack={() => props.clearSelection()}
              />
            </div>
          )
        }

        // State 3: Explicit keeper selection from nav
        if (props.selectedKeeperId) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <KeeperViewPanel
                keeper={{
                  name: keepers.find((k) => k.id === props.selectedKeeperId)?.title ?? slug,
                  description: domainFrame?.theme?.tagline?.trim() ?? null,
                }}
                keeperId={props.selectedKeeperId}
                recentSessions={[]}
                activeJourneys={journeys
                  .filter((j) => j.keeperId === props.selectedKeeperId)
                  .map((j) => ({ id: j.id, title: j.name, momentCount: j.momentCount ?? 0 }))}
                onSessionSelect={props.onSessionSelect}
                onJourneySelect={props.onJourneySelect}
                onKeeperDeleted={() => {
                  const deletedId = props.selectedKeeperId
                  props.clearSelection()
                  setKeepers((prev) => prev.filter((k) => k.id !== deletedId))
                }}
                onJourneyDeleted={(id) => setJourneys((prev) => prev.filter((j) => j.id !== id))}
              />
            </div>
          )
        }

        // State 4: Keeper in frame context (no explicit selection)
        const frameKeeperId = frameCtx?.selection?.activeKeeperId ?? null
        const frameKeeperName = keepers.find((k) => k.id === frameKeeperId)?.title ?? null
        if (frameKeeperName) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
              <KeeperViewPanel
                keeper={{
                  name: frameKeeperName,
                  description: domainFrame?.theme?.tagline?.trim() ?? null,
                }}
                keeperId={frameKeeperId}
                recentSessions={[]}
                activeJourneys={journeys
                  .filter((j) => j.keeperId === frameKeeperId)
                  .map((j) => ({ id: j.id, title: j.name, momentCount: j.momentCount ?? 0 }))}
                onSessionSelect={props.onSessionSelect}
                onJourneySelect={props.onJourneySelect}
                onJourneyDeleted={(id) => setJourneys((prev) => prev.filter((j) => j.id !== id))}
              />
            </div>
          )
        }

        // State 5: Home — nothing selected, no keeper in frame context
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden" style={FROSTED_GLASS}>
            <HomeViewPanel
              platformName={domainFrame?.theme?.wordmark?.trim() ?? "KE3P"}
              activeJourneys={journeys.map((j) => ({
                id: j.id,
                title: j.name,
                momentCount: j.momentCount ?? 0,
                domain: slug,
                keeperName: "",
              }))}
              onJourneySelect={props.onJourneySelect}
            />
          </div>
        )
      }}
    />
  )
}

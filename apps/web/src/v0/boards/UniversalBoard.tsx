"use client"

/**
 * UniversalBoard
 * ==============
 * KE3P · Keeper Platform · Universal Board — Master Orchestrator
 *
 * Three panels. This shape. This feeling. Consistent across every Board.
 *
 * Left panel   — Navigation. Treatment: orientation and confidence.
 * Center panel — Dialog Frame. Treatment: exchange and momentum.
 * Right panel  — Living Multi-Context Surface. Treatment: presence and intentional interaction.
 *
 * The content changes. The shape does not. The treatment does not.
 * A new Board in the future is a JSON entry and a context definition —
 * not a new component, not a new conversation about what the panels should do.
 *
 * Usage:
 * ------
 * The `center` render prop receives the resolved board state and returns the
 * conversation node. Existing boards pass their existing conversation component.
 * Future boards will use a standard UniversalConversation (to be built).
 *
 *   <UniversalBoard
 *     def={IDE_BOARD_DEF}
 *     center={(props) => <IDEBoardConversation {...props} ... />}
 *   />
 *
 * The optional `right` render prop mirrors `center`. Return a node to override
 * UniversalContextPanel for that render cycle. Return null to fall back to it.
 * Use for boards with conditional right panel content — e.g. ServicesFrame
 * when a service connection is active in the IDE Board.
 *
 * CRITICAL RULES:
 * - domainId is resolved once, here, at board root. Never resolved by panels.
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - Board owns collapse state. Panels do not own their own visibility.
 */

import * as React from "react"
import { useV0Shell } from "../shell/V0ShellContext"
import { StyleScope } from "../styles/StyleScope"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { KeeperTopBar } from "../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../components/DomainBriefSlideOver"
import { apiFetch } from "../../lib/api"
import { KeeperBoardPanelGroup } from "./KeeperBoardPanelGroup"
import type { KeeperBoardKind } from "./KeeperBoardPanelGroup"
import { UniversalNavPanel } from "./UniversalNavPanel"
import { UniversalContextPanel } from "./panels/UniversalContextPanel"
import { UniversalBoardProvider, useUniversalBoard } from "./UniversalBoardContext"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"

// ─── Center Panel Render Prop ─────────────────────────────────────────────────

/**
 * Props delivered to the center panel render prop.
 * The conversation component uses these to wire session, selection, and context.
 */
export interface UniversalBoardCenterProps {
  domainId: string | null
  domainSlug: string
  domainName: string

  // Active selection — read by the conversation to build context
  activeSessionId: string | null
  selectedJourneyId: string | null
  selectedMomentId: string | null
  selectedKeeperId: string | null
  selectedDraftId: string | null
  selectedAgentId: string | null

  // Selection actions — conversation fires these to sync state back to board
  onSessionSelect: (id: string) => void
  onJourneySelect: (id: string) => void
  onMomentSelect: (id: string) => void
  onKeeperSelect: (id: string) => void
  onDraftSelect: (id: string) => void
  onAgentSelect: (id: string) => void
  onServiceOpen: (slug: string) => void
  /** Clears all entity selections — returns the right panel to idle/domain presence. */
  clearSelection: () => void
}

// ─── Left Panel Render Prop ───────────────────────────────────────────────────

/**
 * Props delivered to the left panel render prop.
 * Provides resolved domain identity — sufficient for any nav panel implementation.
 * Board-local selection state is available from UniversalBoardContext if needed.
 */
export interface UniversalBoardLeftProps {
  domainId: string | null
  domainSlug: string
  domainName: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalBoardProps {
  /** The board definition — drives what each panel shows and how it behaves. */
  def: UniversalBoardDef

  /**
   * Optional left panel render prop.
   * When provided, replaces UniversalNavPanel entirely.
   * Use for boards with specialized nav requirements —
   * e.g. IDEBoardNav (sessions, optimistic creation) or DomainBoard (board switcher + frames list).
   * When omitted, UniversalNavPanel renders with the board's context and selection wiring.
   */
  left?: (props: UniversalBoardLeftProps) => React.ReactNode

  /**
   * Center panel render prop — the conversation frame.
   * Receives the board's resolved state and returns the center panel node.
   * This is the exchange surface: Banner · Dialog · Composer.
   */
  center: (props: UniversalBoardCenterProps) => React.ReactNode

  /**
   * Optional right panel render prop.
   * Receives the same UniversalBoardCenterProps as center.
   * When provided and returns non-null, replaces UniversalContextPanel entirely.
   * When omitted or returns null, UniversalContextPanel renders normally.
   *
   * Use for boards with conditional right panel content —
   * e.g. ServicesFrame overlay in IDE Board when a service is active.
   * Returning null lets the right panel fall back to UniversalContextPanel
   * for idle/journey/keeper presence.
   */
  right?: (props: UniversalBoardCenterProps) => React.ReactNode | null

  /**
   * Optional callback for when the domain label in KeeperTopBar is clicked.
   * Default: no-op. Pass to open a domain switcher or other top-bar action.
   */
  onDomainClick?: () => void

  /**
   * Optional additional nav list version counters.
   * Increment to trigger re-fetch of specific nav sections from outside the board.
   */
  navVersions?: {
    dialogListVersion?: number
    journeyListVersion?: number
    keeperListVersion?: number
    draftListVersion?: number
  }
}

// ─── Board Shell (inner — consumes UniversalBoardContext) ─────────────────────

function UniversalBoardShell({
  def,
  left: leftRenderProp,
  center,
  right: rightRenderProp,
  onDomainClick,
  navVersions,
}: UniversalBoardProps) {
  const { domainSlug, styleId, themeSlug, domainFrame, domainData } = useV0Shell()
  const { selection, actions, navCollapsed, onToggleNavCollapsed } = useUniversalBoard()

  const [briefOpen, setBriefOpen] = React.useState(false)
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [domainName, setDomainName] = React.useState<string>("")

  const slug = domainSlug ?? ""

  // ── domainId resolution — single point, never delegated to panels ──────────
  React.useEffect(() => {
    if (!slug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(slug)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const r = res as { id?: string; name?: string; displayName?: string }
        if (r?.id) setDomainId(r.id)
        const name = (r?.displayName ?? r?.name ?? "").trim()
        if (name) setDomainName(name)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [slug])

  // Sync domain name from frame/domain data when available — avoids extra round trip
  React.useEffect(() => {
    const fromFrame = (domainFrame?.theme as Record<string, unknown> | undefined)?.wordmark
    const name =
      (typeof fromFrame === "string" ? fromFrame : null)?.trim() ??
      (domainData as { name?: string } | undefined)?.name?.trim() ??
      ""
    if (name) setDomainName(name)
  }, [domainFrame, domainData])

  // ── Background ─────────────────────────────────────────────────────────────
  const coverImageUrl = (domainData as { theme?: { coverImage?: string; coverImageMode?: string } } | undefined)?.theme?.coverImage ?? null
  const coverImageMode = (domainData as { theme?: { coverImageMode?: string } } | undefined)?.theme?.coverImageMode ?? "cover"
  const displayCoverUrl = coverImageUrl ? getBlobProxyUrl(coverImageUrl) : null

  const pageBackground: React.CSSProperties = displayCoverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayCoverUrl})`,
        backgroundPosition: coverImageMode === "tile" ? "0 0" : "center",
        backgroundSize: coverImageMode === "tile" ? "auto" : "cover",
        backgroundRepeat: coverImageMode === "tile" ? "repeat" : "no-repeat",
      }
    : {}

  // ── Panel group board kind — maps boardId to known layout presets ──────────
  // ide and agent have distinct persisted layout preferences.
  // All other board IDs default to "ide" layout ratios.
  const boardKind: KeeperBoardKind =
    def.boardId === "ide" || def.boardId === "agent" ? def.boardId : "ide"

  // ── Left panel — resolved identity for render prop ─────────────────────────
  const leftProps: UniversalBoardLeftProps = {
    domainId,
    domainSlug: slug,
    domainName: domainName || slug,
  }

  // ── Board context — delivered to center and right render props ───────────
  const centerProps: UniversalBoardCenterProps = {
    domainId,
    domainSlug: slug,
    domainName,
    activeSessionId: selection.activeSessionId,
    selectedJourneyId: selection.selectedJourneyId,
    selectedMomentId: selection.selectedMomentId,
    selectedKeeperId: selection.selectedKeeperId,
    selectedDraftId: selection.selectedDraftId,
    selectedAgentId: selection.selectedAgentId,
    onSessionSelect: actions.onSessionSelect,
    onJourneySelect: actions.onJourneySelect,
    onMomentSelect: actions.onMomentSelect,
    onKeeperSelect: actions.onKeeperSelect,
    onDraftSelect: actions.onDraftSelect,
    onAgentSelect: actions.onAgentSelect,
    onServiceOpen: actions.onServiceOpen,
    clearSelection: actions.clearSelection,
  }

  // ── Right panel — render prop or UniversalContextPanel ────────────────────
  // If a right render prop is provided and returns non-null, use it directly.
  // The render prop is responsible for its own styling (including frosted glass if wanted).
  // If omitted or returns null, UniversalContextPanel handles the right panel.
  const rightOverrideNode = rightRenderProp ? rightRenderProp(centerProps) : null
  const rightNode = rightOverrideNode ?? (
    <UniversalContextPanel
      def={def}
      domainId={domainId}
      domainName={domainName || slug}
    />
  )

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
      <div
        className="keeper-board-scope flex flex-col h-screen w-full overflow-hidden"
        style={pageBackground}
      >
        <KeeperTopBar
          onDomainClick={onDomainClick ?? (() => {})}
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
              key={`universal-board-${def.boardId}-${slug || "default"}`}
              boardKind={boardKind}
              domainSlug={slug}
              left={
                leftRenderProp
                  ? leftRenderProp(leftProps)
                  : (
                    <UniversalNavPanel
                      domainId={domainId}
                      domainSlug={slug}
                      domainName={domainName || slug}
                      boardContext={
                        (def.boardId === "ide" ||
                          def.boardId === "agent" ||
                          def.boardId === "domain" ||
                          def.boardId === "designer")
                          ? (def.boardId as "ide" | "agent" | "domain" | "designer")
                          : "domain"
                      }
                      selectedDialogId={null}
                      selectedJourneyId={selection.selectedJourneyId}
                      selectedKeeperId={selection.selectedKeeperId}
                      selectedDraftId={selection.selectedDraftId}
                      selectedAgentId={selection.selectedAgentId}
                      onDialogSelect={undefined}
                      onJourneySelect={actions.onJourneySelect}
                      onKeeperSelect={actions.onKeeperSelect}
                      onDraftSelect={actions.onDraftSelect}
                      onAgentSelect={actions.onAgentSelect}
                      collapsed={navCollapsed}
                      onToggleCollapsed={onToggleNavCollapsed}
                      dialogListVersion={navVersions?.dialogListVersion}
                      journeyListVersion={navVersions?.journeyListVersion}
                      keeperListVersion={navVersions?.keeperListVersion}
                      draftListVersion={navVersions?.draftListVersion}
                    />
                  )
              }
              center={
                <div
                  className="flex h-full min-h-0 flex-col overflow-hidden"
                  style={{ background: "transparent", borderRadius: "8px" }}
                >
                  {center(centerProps)}
                </div>
              }
              right={rightNode}
            />
          </div>
        </div>
      </div>
    </StyleScope>
  )
}

// ─── UniversalBoard — public entry point ──────────────────────────────────────

/**
 * UniversalBoard
 *
 * The single board shape. Pass any UniversalBoardDef and it renders
 * Left · Center · Right with the correct treatment character for each panel.
 *
 * Context is provided inside. The board resolves domain identity, manages
 * selection state, and delivers both to all three panels.
 */
export function UniversalBoard(props: UniversalBoardProps) {
  return (
    <UniversalBoardProvider>
      <UniversalBoardShell {...props} />
    </UniversalBoardProvider>
  )
}

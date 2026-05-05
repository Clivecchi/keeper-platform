"use client"

/**
 * AgentBoard — Moment 2.4
 *
 * Migrated to UniversalBoard shell.
 *
 * Shell code removed: panel layout, KeeperBoardPanelGroup, StyleScope, KeeperTopBar,
 * DomainBriefSlideOver, domainId resolution for panels, UniversalNavPanel wiring.
 * UniversalBoard owns all of that now.
 *
 * What stays here — board-specific logic that is NOT shell:
 *   - Draft list management: fetched for banner title lookup (draftTitle → bannerEyebrow).
 *   - domainId resolution: a focused, scoped fetch for draft management only.
 *     UniversalBoard resolves domainId independently for panel wiring.
 *   - Banner string computation: draftTitle → bannerEyebrow / bannerTitle.
 *
 * Right panel: UniversalContextPanel (DraftPresence when draft selected, DomainPresence idle).
 * No rightOverride needed — UniversalContextPanel covers the Agent Board's context surfaces.
 */

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import type { KipDraftSummary } from "../../../lib/kipApi"
import { UniversalBoard } from "../UniversalBoard"
import { AGENT_BOARD_DEF } from "../UniversalBoardDefinition"
import { AgentBoardConversation } from "./AgentBoardConversation"

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoard() {
  const { domainSlug: slug } = useV0Shell()
  const domainSlug = slug ?? ""

  // Draft list — fetched for banner title lookup.
  // UniversalBoard resolves domainId for panel wiring; we resolve it here
  // only to call KipApi.listDrafts. Both fetches share the same slug → id lookup.
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
    return () => { cancelled = true }
  }, [domainSlug])

  const refreshDrafts = React.useCallback(async () => {
    if (!domainId) return
    try {
      const list = await KipApi.listDrafts(domainId)
      setDrafts(list)
    } catch {
      // degrade silently — banner falls back to "Agent Studio"
    }
  }, [domainId])

  React.useEffect(() => {
    if (domainId) void refreshDrafts()
  }, [domainId, refreshDrafts])

  return (
    <UniversalBoard
      def={AGENT_BOARD_DEF}
      center={(props) => {
        // Banner computation — driven by which draft is selected and its title.
        // Reads closed-over `drafts` state; no side effects during render.
        const draftTitle =
          props.selectedDraftId && drafts
            ? (drafts.find((d) => d.id === props.selectedDraftId)?.title?.trim() ?? null)
            : null
        const bannerEyebrow = draftTitle ? "Draft" : "Conversation"
        const bannerTitle = draftTitle ?? "Agent Studio"

        return (
          <AgentBoardConversation
            domainSlug={props.domainSlug}
            domainId={props.domainId}
            refreshDrafts={refreshDrafts}
            onDraftSelect={props.onDraftSelect}
            bannerEyebrow={bannerEyebrow}
            bannerTitle={bannerTitle}
          />
        )
      }}
    />
  )
}

"use client"

import * as React from "react"
import { DocumentShell } from "../presence/chronicleDocument/DocumentShell"
import { ChronicleTreatmentShell } from "../treatment/ChronicleTreatmentShell"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"
import { useRealmNavGrowth } from "./useRealmNavGrowth"
import type { RealmNavEntry } from "./realmNavGrowth"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"

export interface DomainRealmStoryProps {
  domainId: string | null
  domainSlug: string
  treatment: ResolvedDomainTreatment
  /** User-scoped cross-domain feed — when on `/home`. */
  userFeedContent?: React.ReactNode
}

/**
 * Domain-scoped Realm Chronicle — thin adapter over DocumentShell.
 * Fetches Realm nav-growth data; shared shell owns the Point sequence render.
 */
export function DomainRealmStory({
  domainId,
  domainSlug,
  treatment,
  userFeedContent,
}: DomainRealmStoryProps) {
  const boardCtx = useUniversalBoardOptional()
  const { loading, byStage } = useRealmNavGrowth(domainId, domainSlug, !!domainId)

  const storyEntries = React.useMemo(() => {
    return [...byStage.kept, ...byStage.drafts, ...byStage.presented]
  }, [byStage])

  const points = React.useMemo(
    () => storyEntries.map((entry) => entry.point),
    [storyEntries],
  )

  const handleGlossPoint = React.useCallback(
    (_point: RealmNavEntry["point"], index: number) => {
      const entry = storyEntries[index]
      const anchor = entry?.point.gloss?.anchor
      if (!anchor || !entry) return
      boardCtx?.actions.requestDiscussDraftPoint(anchor, {
        glossContent: entry.point.gloss?.snapshot,
      })
    },
    [boardCtx, storyEntries],
  )

  const emptyState = (
    <div className="px-4 py-6">
      {loading && storyEntries.length === 0 ? (
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading story…
        </p>
      ) : (
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Realm is breathing. What you shape, keep, and show will accumulate here.
        </p>
      )}
    </div>
  )

  const body = userFeedContent ? (
    <div className="domain-realm-story flex min-h-0 flex-1 flex-col overflow-y-auto">
      {userFeedContent}
    </div>
  ) : (
    <DocumentShell
      className="domain-realm-story"
      points={points}
      onGlossPoint={handleGlossPoint}
      emptyState={emptyState}
    />
  )

  return <ChronicleTreatmentShell treatment={treatment}>{body}</ChronicleTreatmentShell>
}

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
  const { loading, byDialog } = useRealmNavGrowth(domainId, domainSlug, !!domainId)

  const storyEntries = React.useMemo(() => {
    return byDialog.flatMap((group) => [
      ...group.byStage.kept,
      ...group.byStage.drafts,
      ...group.byStage.presented,
    ])
  }, [byDialog])

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
      forward={{
        title: "Keep what this domain is becoming",
        description:
          "Authored destination for this Document — shape, keep, and show accumulate here. The live tip sits in the Step below when one is known; this Forward text stays the North Star.",
      }}
      step={{
        title: "Forward and Step land in the Document shell",
        body: "Current tip: Forward (authored) and Step (now) render above the Path groups. Back and Forward stay disabled — the self-organizing logic that would choose the next Step is not built yet, and is not faked here.",
      }}
      points={points}
      onGlossPoint={handleGlossPoint}
      emptyState={emptyState}
    />
  )

  return <ChronicleTreatmentShell treatment={treatment}>{body}</ChronicleTreatmentShell>
}

"use client"

import * as React from "react"
import { PointView } from "../presence/chronicleDocument/PointView"
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

function StoryFrame({
  entry,
  onGloss,
}: {
  entry: RealmNavEntry
  onGloss?: () => void
}) {
  return (
    <div
      className="realm-story-frame px-4 py-3"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.25)",
      }}
    >
      <PointView point={entry.point} onGloss={onGloss} />
    </div>
  )
}

/** Domain-scoped Realm Chronicle — growing story of Point frames. */
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

  const handleGloss = React.useCallback(
    (entry: RealmNavEntry) => {
      const anchor = entry.point.gloss?.anchor
      if (!anchor) return
      boardCtx?.actions.requestDiscussDraftPoint(anchor, {
        glossContent: entry.point.gloss?.snapshot,
      })
    },
    [boardCtx],
  )

  const body = (
    <div className="domain-realm-story flex min-h-0 flex-1 flex-col overflow-y-auto">
      {userFeedContent}
      {!userFeedContent && loading && storyEntries.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Loading story…
          </p>
        </div>
      ) : null}
      {!userFeedContent && !loading && storyEntries.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Realm is breathing. What you shape, keep, and show will accumulate here.
          </p>
        </div>
      ) : null}
      {storyEntries.map((entry) => (
        <StoryFrame
          key={`${entry.kind}:${entry.id}`}
          entry={entry}
          onGloss={
            entry.point.gloss?.anchor
              ? () => handleGloss(entry)
              : undefined
          }
        />
      ))}
    </div>
  )

  return <ChronicleTreatmentShell treatment={treatment}>{body}</ChronicleTreatmentShell>
}

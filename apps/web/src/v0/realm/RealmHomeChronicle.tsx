"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { RealmFeedPanel } from "./RealmFeedPanel"
import { useRealmFeed } from "./useRealmFeed"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { applyRealmFeedEvent } from "./realmInvitationActions"
import { useSceneChangeOptional } from "../sceneChange/SceneChangeProvider"
import { buildDomainBoardPath } from "../shell/shellMode"
import { DomainRealmStory } from "./DomainRealmStory"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"

export type RealmChronicleView = "feed"

export interface RealmHomeChronicleProps {
  view?: RealmChronicleView
  domainId?: string | null
  domainSlug?: string
  treatment?: ResolvedDomainTreatment
  /** User-scoped `/home` — cross-domain feed when events exist. */
  isUserHome?: boolean
}

/** Chronicle on Realm idle — domain story or user arrival feed. */
export function RealmHomeChronicle({
  view = "feed",
  domainId = null,
  domainSlug,
  treatment,
  isUserHome = false,
}: RealmHomeChronicleProps) {
  const shell = useV0ShellOptional()
  const board = useUniversalBoardOptional()
  const navigate = useNavigate()
  const sceneChange = useSceneChangeOptional()
  const showFeed = view === "feed"
  const useUserFeed = isUserHome
  const { feed } = useRealmFeed(showFeed && useUserFeed)

  const anchorSlug = shell?.anchorDomainSlug ?? shell?.domainSlug ?? domainSlug ?? null
  const events = feed?.events ?? []

  const handleEventSelect = React.useCallback(
    (event: Parameters<typeof applyRealmFeedEvent>[0]) => {
      if (!board?.actions) return

      applyRealmFeedEvent(event, {
        anchorDomainSlug: anchorSlug,
        onSessionSelect: board.actions.onSessionSelect,
        onDialogSelect: board.actions.onDialogSelect,
        onDraftSelect: board.actions.onDraftSelect,
        onMomentSelect: board.actions.onMomentSelect,
        navigateToDomain: (slug, path) => {
          const targetPath = path?.trim() || buildDomainBoardPath(slug, "realm")
          const go = () => navigate(targetPath)
          if (sceneChange) {
            void sceneChange.travelToSlug(slug, go)
            return
          }
          go()
        },
      })
    },
    [board?.actions, navigate, sceneChange, anchorSlug],
  )

  const userFeedContent =
    useUserFeed && showFeed && events.length > 0 ? (
      <RealmFeedPanel
        events={events}
        onEventSelect={board?.actions ? handleEventSelect : undefined}
      />
    ) : null

  if (!useUserFeed && treatment && domainSlug) {
    return (
      <DomainRealmStory
        domainId={domainId}
        domainSlug={domainSlug}
        treatment={treatment}
        userFeedContent={userFeedContent}
      />
    )
  }

  if (!showFeed || events.length === 0) {
    return <div className="realm-home-chronicle min-h-0 flex-1" aria-hidden />
  }

  return (
    <div className="realm-home-chronicle flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
      {userFeedContent}
    </div>
  )
}

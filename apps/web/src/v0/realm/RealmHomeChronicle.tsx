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

export type RealmChronicleView = "feed"

export interface RealmHomeChronicleProps {
  view?: RealmChronicleView
}

/** Chronicle idle on realm — cross-domain activity feed. */
export function RealmHomeChronicle({ view = "feed" }: RealmHomeChronicleProps) {
  const shell = useV0ShellOptional()
  const board = useUniversalBoardOptional()
  const navigate = useNavigate()
  const sceneChange = useSceneChangeOptional()
  const { feed, isLoading } = useRealmFeed(view === "feed")

  const handleEventSelect = React.useCallback(
    (event: Parameters<typeof applyRealmFeedEvent>[0]) => {
      if (!board?.actions) return

      applyRealmFeedEvent(event, {
        anchorDomainSlug: shell?.anchorDomainSlug ?? shell?.domainSlug ?? null,
        onSessionSelect: board.actions.onSessionSelect,
        onDialogSelect: board.actions.onDialogSelect,
        onDraftSelect: board.actions.onDraftSelect,
        onMomentSelect: board.actions.onMomentSelect,
        navigateToDomain: (slug, path) => {
          const targetPath = path?.trim() || buildDomainBoardPath(slug, "domain")
          const go = () => navigate(targetPath)
          if (sceneChange) {
            void sceneChange.travelToSlug(slug, go)
            return
          }
          go()
        },
      })
    },
    [board?.actions, navigate, sceneChange, shell?.anchorDomainSlug, shell?.domainSlug],
  )

  return (
    <RealmFeedPanel
      events={feed?.events ?? []}
      isLoading={isLoading}
      onEventSelect={board?.actions ? handleEventSelect : undefined}
    />
  )
}

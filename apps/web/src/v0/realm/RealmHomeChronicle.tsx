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

  const selection = board?.selection
  const hasDocumentSelection = !!(
    selection?.selectedDialogId ||
    selection?.selectedDraftId ||
    selection?.selectedMomentId ||
    selection?.selectedLibraryItemId
  )

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

  // Dialog (or Document-scoped draft/moment/library) selected → Document/History.
  // Do not pass the Realm arrival feed here — it previously shadowed both tabs.
  if (hasDocumentSelection && treatment && domainSlug) {
    return (
      <DomainRealmStory
        domainId={domainId}
        domainSlug={domainSlug}
        treatment={treatment}
      />
    )
  }

  // Domain-scoped Realm (not `/home`): story shell even when nothing is selected.
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

  // `/home` with no Dialog selected — feed when events exist, else a visible idle state
  // (never the prior silent aria-hidden empty node).
  if (useUserFeed) {
    if (showFeed && events.length > 0) {
      return (
        <div className="realm-home-chronicle flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {userFeedContent}
        </div>
      )
    }

    return (
      <div className="realm-home-chronicle flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
        <p
          className="max-w-[16rem] text-center text-[13px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Select a Dialog in Nav to open its Document.
        </p>
      </div>
    )
  }

  return (
    <div className="realm-home-chronicle min-h-0 flex-1" aria-hidden />
  )
}

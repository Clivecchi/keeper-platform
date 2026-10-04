"use client"

/**
 * Keeper Stage — one room, one Composition pass.
 * Realm arrival does not present the anchor domain's stored Stage.
 */

import * as React from "react"
import {
  projectDomainWhereWeAre,
  projectRealmWhereWeAre,
  projectStoryPass,
  type StageContinueAction,
  type StoryPassSlide,
} from "@keeper/shared"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { StageCompositionView } from "./StageCompositionView"
import { useStagePresentationOptional } from "./stagePresentation"
import { useStagePass } from "./stagePass"
import { StagePresentationScreen } from "./StageFilmstrip"
import { useBindStageDialog } from "./useBindStageDialog"
import { useKeeperStageOptional } from "./useKeeperStage"
import { useDomainWhereWeAreTruth, useRealmWhereWeAreTruth } from "./useStageTruth"

function roomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "stage-room"
}

export function KeeperStageCanvas({ domainId }: { domainId: string | null }) {
  const pass = useStagePass()
  const board = useUniversalBoardOptional()
  const roomId = React.useRef(roomToken())
  const realmTruth = useRealmWhereWeAreTruth(pass.truth === "realm-where-we-are")
  const domainTruth = useDomainWhereWeAreTruth(
    pass.truth === "domain-where-we-are" ? pass.context.domainId ?? null : null,
  )

  const onContinue = React.useCallback(
    (action: StageContinueAction) => {
      if (action.nextContext) {
        pass.continueStage(action.nextContext)
        return
      }
      if (action.subject.kind === "dialog") {
        board?.actions.onDialogSelect(action.subject.id)
      }
    },
    [board, pass],
  )

  const projected = React.useMemo(() => {
    if (pass.truth === "realm-where-we-are" && realmTruth.truth) {
      return projectRealmWhereWeAre({ context: pass.context, truth: realmTruth.truth })
    }
    if (pass.truth === "domain-where-we-are" && domainTruth.truth && pass.context.domainId) {
      return projectDomainWhereWeAre({ context: pass.context, truth: domainTruth.truth })
    }
    return null
  }, [pass.truth, pass.context, realmTruth.truth, domainTruth.truth])

  const status =
    pass.truth === "story"
      ? "story"
      : pass.truth === "realm-where-we-are"
        ? realmTruth.status
        : domainTruth.status

  return (
    <div
      className="h-full min-h-0"
      data-stage-room={roomId.current}
      data-stage-renderer="composition"
      data-stage-scope={pass.context.scope}
      data-stage-domain={pass.context.domainId ?? ""}
      data-stage-truth={pass.truth}
      data-stage-stored-story={pass.presentsStoredStory ? "true" : "false"}
    >
      {pass.truth === "story" ? (
        <StoryPass sequence={pass.presentsStoredStory ? <StoryStageCanvas /> : null} shellDomainId={domainId} />
      ) : (
        <StageCompositionView
          composition={projected?.composition ?? null}
          reading={projected?.reading ?? null}
          status={status}
          onContinue={onContinue}
        />
      )}
    </div>
  )
}

function StoryPass({
  sequence,
  shellDomainId,
}: {
  sequence: React.ReactNode
  shellDomainId: string | null
}) {
  const pass = useStagePass()
  const presentation = useStagePresentationOptional()
  const projected = React.useMemo(() => {
    if (!pass.presentsStoredStory) {
      return projectStoryPass({ context: pass.context, slides: [] })
    }
    const slides: StoryPassSlide[] = (presentation?.slides ?? []).map((slide) => {
      const liveId = slide.source?.kind === "live" ? slide.source.id?.trim() || "" : ""
      const frame = liveId ? presentation?.liveFrames.get(liveId) : undefined
      return {
        id: slide.id,
        title: frame?.performance.title || slide.title,
        body: slide.body,
        kind: slide.kind === "root" ? "root" : "beat",
        ...(slide.source ? { source: slide.source } : {}),
        frameMessageId: frame && slide.kind !== "root" && liveId ? liveId : null,
      }
    })
    return projectStoryPass({
      context: pass.context,
      domainId: shellDomainId,
      slides,
      openingIndex: presentation?.index ?? 0,
    })
  }, [pass.presentsStoredStory, pass.context, presentation, shellDomainId])

  return (
    <StageCompositionView
      composition={projected.composition}
      reading={projected.reading}
      status="story"
      onContinue={() => undefined}
      sequence={sequence}
    />
  )
}

function StoryStageCanvas() {
  useBindStageDialog()
  const stageApi = useKeeperStageOptional()

  return (
    <div className="flex h-full min-h-0 flex-col">
      {stageApi?.saving ? (
        <div className="flex justify-end px-3 py-1">
          <span className="text-[11px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>Saving</span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        {stageApi?.loading ? (
          <p className="p-4 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Loading Stage…
          </p>
        ) : (
          <StagePresentationScreen />
        )}
      </div>
    </div>
  )
}

"use client"

/**
 * Keeper Stage — one room, one Composition pass.
 * Realm arrival does not present the anchor domain's stored Stage.
 */

import * as React from "react"
import {
  presentStoredArrangement,
  projectDomainWhereWeAre,
  projectRealmWhereWeAre,
  projectStoryPass,
  STAGE_TRUTH_TITLE,
  stagePostureClaimsRoom,
  type StageContinueAction,
  type StageDressSpan,
  type StoryPassSlide,
} from "@keeper/shared"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { StageCompositionView } from "./StageCompositionView"
import { StageOrientationBar } from "./StageOrientationBar"
import { useStagePresentationOptional } from "./stagePresentation"
import { useStagePass } from "./stagePass"
import { StagePresentationScreen } from "./StageFilmstrip"
import { useV0ShellOptional } from "../shell/V0ShellContext"
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
  const shell = useV0ShellOptional()
  const roomId = React.useRef(roomToken())
  const [names, setNames] = React.useState<Record<string, string>>({})
  const realmTruth = useRealmWhereWeAreTruth(pass.truth === "realm-where-we-are")
  const domainTruth = useDomainWhereWeAreTruth(
    pass.truth === "domain-where-we-are" ? pass.context.domainId ?? null : null,
  )

  React.useEffect(() => {
    const wordmark = shell?.domainFrame?.theme.wordmark?.trim() ?? ""
    const continuations = realmTruth.truth?.continuations ?? []
    setNames((current) => {
      const next = { ...current }
      let changed = false
      if (domainId && wordmark && next[domainId] !== wordmark) {
        next[domainId] = wordmark
        changed = true
      }
      for (const row of continuations) {
        const label = row.domainName?.trim() ?? ""
        if (label && next[row.domainId] !== label) {
          next[row.domainId] = label
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [domainId, realmTruth.truth, shell?.domainFrame?.theme.wordmark])

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

  const stageApi = useKeeperStageOptional()
  const projected = React.useMemo(() => {
    if (pass.truth === "realm-where-we-are" && realmTruth.truth) {
      return projectRealmWhereWeAre({ context: pass.context, truth: realmTruth.truth })
    }
    if (pass.truth === "domain-where-we-are" && domainTruth.truth && pass.context.domainId) {
      return projectDomainWhereWeAre({ context: pass.context, truth: domainTruth.truth })
    }
    return null
  }, [pass.truth, pass.context, realmTruth.truth, domainTruth.truth])
  const presented = React.useMemo(() => {
    if (!projected) return null
    const stored = stageApi?.stage.arrangements?.[pass.truth]?.composition
    const composed = stored ? presentStoredArrangement(stored, projected.reading) : null
    return composed ? { reading: projected.reading, composition: composed } : projected
  }, [projected, stageApi?.stage.arrangements, pass.truth])
  const span: StageDressSpan = pass.truth === "story"
    ? pass.compositionSpan
    : presented?.composition.dress?.span ?? "center"
  React.useEffect(() => {
    if (pass.truth === "story") return
    pass.setCompositionSpan(span)
  }, [pass, span])
  const room = stagePostureClaimsRoom(pass.posture, span)

  const status =
    pass.truth === "story"
      ? "story"
      : pass.truth === "realm-where-we-are"
        ? realmTruth.status
        : domainTruth.status

  return (
    <div
      className="absolute inset-0 flex min-h-0 flex-col"
      data-stage-room={roomId.current}
      data-stage-renderer="composition"
      data-stage-scope={pass.context.scope}
      data-stage-domain={pass.context.domainId ?? ""}
      data-stage-truth={pass.truth}
      data-stage-stored-story={pass.presentsStoredStory ? "true" : "false"}
    >
      {room ? (
        <button
          type="button"
          className="absolute right-4 top-4 z-10 rounded-md px-3 py-1.5 text-[13px]"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
          onClick={() => pass.setPosture("workshop")}
        >
          Workshop
        </button>
      ) : (
        <StageOrientationBar names={names} shellDomainId={domainId} />
      )}
      <div className="min-h-0 flex-1">
        {pass.truth === "story" ? (
          <StoryPass sequence={pass.presentsStoredStory ? <StoryStageCanvas /> : null} shellDomainId={domainId} />
        ) : (
          <StageCompositionView
            composition={presented?.composition ?? null}
            reading={presented?.reading ?? null}
            status={status}
            onContinue={onContinue}
            title={STAGE_TRUTH_TITLE[pass.truth]}
          />
        )}
      </div>
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
  const stageApi = useKeeperStageOptional()
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
  const stored = stageApi?.stage.arrangements?.story?.composition
  const composed = stored ? presentStoredArrangement(stored, projected.reading) : null
  const composition = composed ?? projected.composition
  const sequenceNode = composition.nodes.some((node) => node.kind === "sequence")
  React.useEffect(() => {
    pass.setCompositionSpan(composition.dress?.span ?? "center")
  }, [pass, composition.dress?.span])

  return (
    <StageCompositionView
      composition={composition}
      reading={projected.reading}
      status="story"
      onContinue={() => undefined}
      sequence={sequenceNode ? sequence : undefined}
      title={STAGE_TRUTH_TITLE.story}
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

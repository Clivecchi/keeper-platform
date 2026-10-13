"use client"

/**
 * Keeper Stage — the center performance.
 * Orientation is a sibling in KeeperDialogFrame. This canvas does not own it.
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
  type StageContext,
  type StageContinueAction,
  type StageDressSpan,
  type StoryPassSlide,
} from "@keeper/shared"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { StageCompositionView } from "./StageCompositionView"
import { useStagePresentationOptional } from "./stagePresentation"
import { useStagePass } from "./stagePass"
import { StagePresentationScreen } from "./StageFilmstrip"
import { FramePerformanceView } from "./FramePerformanceView"
import { useBindStageDialog } from "./useBindStageDialog"
import { useKeeperStageOptional } from "./useKeeperStage"
import { useDomainWhereWeAreTruth, useRealmWhereWeAreTruth } from "./useStageTruth"
import { workCompositionSlides } from "./workStageComposition"

function roomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "stage-room"
}

export function KeeperStageCanvas({
  domainId,
  workTitle,
}: {
  domainId: string | null
  workTitle?: string | null
}) {
  const pass = useStagePass()
  const board = useUniversalBoardOptional()
  const roomId = React.useRef(roomToken())
  const workId = board?.selection.selectedDialogId?.trim() || ""
  const realmTruth = useRealmWhereWeAreTruth(!workId && pass.truth === "realm-where-we-are")
  const domainTruth = useDomainWhereWeAreTruth(
    !workId && pass.truth === "domain-where-we-are" ? pass.context.domainId ?? null : null,
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
  const dressSpan: StageDressSpan | undefined = pass.truth === "story"
    ? undefined
    : presented?.composition.dress?.span
  React.useEffect(() => {
    if (!dressSpan) return
    pass.setCompositionSpan(dressSpan)
  }, [dressSpan, pass.setCompositionSpan])
  const room = stagePostureClaimsRoom(pass.posture, pass.compositionSpan)
  const storedArrangement = stageApi?.stage.arrangements?.[pass.truth]
  const showRestore = pass.posture === "workshop" && storedArrangement != null

  const status =
    pass.truth === "story"
      ? "story"
      : pass.truth === "realm-where-we-are"
        ? realmTruth.status
        : domainTruth.status

  if (workId) {
    return (
      <WorkStageComposition
        workId={workId}
        workTitle={workTitle ?? ""}
        context={pass.context}
      />
    )
  }

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
      {/* Room exit, and arrangement Restore. Restore is not orientation. */}
      {room || showRestore ? (
        <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-1">
          {room ? (
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-[13px]"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
              onClick={() => pass.setPosture("workshop")}
            >
              Workshop
            </button>
          ) : null}
          {showRestore ? (
            <button
              type="button"
              className="text-[13px] leading-snug"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
              onClick={() => stageApi?.restoreArrangement(pass.truth)}
            >
              Restore
            </button>
          ) : null}
        </div>
      ) : null}
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

function WorkStageComposition({
  workId,
  workTitle,
  context,
}: {
  workId: string
  workTitle: string
  context: StageContext
}) {
  const presentation = useStagePresentationOptional()
  const performed = presentation?.performedFrame ?? null
  const hit = performed ? presentation?.liveFrames.get(performed.messageId) : undefined
  const slides = React.useMemo(
    () => workCompositionSlides({ workId, workTitle }),
    [workId, workTitle],
  )
  const projected = React.useMemo(
    () => projectStoryPass({ context, slides }),
    [context, slides],
  )
  const reading = presentation?.stageReading ?? "empty"
  if (reading === "filmstrip" && presentation?.filmstripLayout) {
    return (
      <FilmstripPerformance
        messageId={presentation.filmstripLayout.messageId}
        context={context}
      />
    )
  }
  if (reading === "stale" && presentation?.staleFilmstripLayout) {
    return (
      <StageReadingNotice
        workId={workId}
        title="This Stage layout is no longer the filmstrip"
        body="The slides named on that turn were replaced. No Story was saved by the layout."
      />
    )
  }
  if (hit && performed && reading === "frame") {
    return (
      <div
        className="absolute inset-0 flex min-h-0 flex-col"
        data-stage-renderer="frame"
        data-stage-truth="work"
        data-stage-work={workId}
        data-stage-performance={performed.messageId}
      >
        <div className="min-h-0 flex-1 overflow-auto">
          <FramePerformanceView
            performance={hit.performance}
            placement="stage"
            messageId={performed.messageId}
            castVoices={hit.castVoices}
            glossThreads={hit.glossThreads}
          />
        </div>
      </div>
    )
  }
  const title = workTitle.trim() || "Work in hand"

  return (
    <div
      className="absolute inset-0 flex min-h-0 flex-col"
      data-stage-renderer="composition"
      data-stage-truth="work"
      data-stage-work={workId}
    >
      <div className="min-h-0 flex-1">
        <StageCompositionView
          composition={projected.composition}
          reading={projected.reading}
          status="story"
          onContinue={() => undefined}
          title={title}
        />
      </div>
    </div>
  )
}

function FilmstripPerformance({
  messageId,
  context,
}: {
  messageId: string
  context: StageContext
}) {
  const presentation = useStagePresentationOptional()
  const stageApi = useKeeperStageOptional()
  const jumped = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!presentation || jumped.current === messageId) return
    const firstBeat = presentation.slides.findIndex((slide) => slide.kind !== "root")
    if (firstBeat >= 0) {
      presentation.presentSlide(firstBeat)
      jumped.current = messageId
    }
  }, [messageId, presentation])
  const beats = (presentation?.slides ?? []).filter((slide) => slide.kind !== "root")
  const projected = React.useMemo(() => {
    const slides: StoryPassSlide[] = (presentation?.slides ?? []).map((slide) => ({
      id: slide.id,
      title: slide.title,
      body: slide.body,
      kind: slide.kind === "root" ? "root" : "beat",
      ...(slide.source ? { source: slide.source } : {}),
      frameMessageId: slide.source?.kind === "live" ? slide.source.id ?? null : null,
    }))
    return projectStoryPass({
      context,
      domainId: context.domainId,
      slides,
      openingIndex: presentation?.index ?? 0,
    })
  }, [context, presentation?.index, presentation?.slides])
  const stored = stageApi?.stage.arrangements?.story?.composition
  const composed = stored ? presentStoredArrangement(stored, projected.reading) : null
  const composition = composed ?? projected.composition

  return (
    <div
      className="absolute inset-0 flex min-h-0 flex-col"
      data-stage-renderer="filmstrip"
      data-stage-preserved="filmstrip"
      data-stage-layout={messageId}
      data-stage-slide-count={beats.length}
    >
      <StageCompositionView
        composition={composition}
        reading={projected.reading}
        status="story"
        onContinue={() => undefined}
        sequence={
          <>
            <div className="min-h-0 flex-1 overflow-hidden">
              <StagePresentationScreen />
            </div>
            {beats.length > 0 ? (
              <nav aria-label="Stage slides" className="flex flex-wrap gap-2 px-4 py-3">
                {beats.map((slide) => {
                  const index = presentation?.slides.findIndex((item) => item.id === slide.id) ?? -1
                  const current = presentation?.current?.id === slide.id
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => {
                        if (index >= 0) presentation?.setIndex(index)
                      }}
                      className="rounded-md px-3 py-2 text-left text-[13px]"
                      style={{
                        border: current
                          ? "1px solid hsl(var(--theme-accent-primary))"
                          : "1px solid hsl(var(--theme-border-soft) / 0.7)",
                        background: current
                          ? "hsl(var(--theme-surface-paper) / 0.88)"
                          : "hsl(var(--theme-surface-paper) / 0.45)",
                        color: "hsl(var(--theme-ink-primary))",
                      }}
                    >
                      {slide.title}
                    </button>
                  )
                })}
              </nav>
            ) : null}
          </>
        }
      />
    </div>
  )
}

function StageReadingNotice({
  workId,
  title,
  body,
}: {
  workId: string
  title: string
  body: string
}) {
  return (
    <div
      className="absolute inset-0 flex min-h-0 flex-col items-start justify-center px-8"
      data-stage-renderer="notice"
      data-stage-work={workId}
    >
      <h2 className="font-serif text-[1.6rem]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        {body}
      </p>
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
  const storySpan = composition.dress?.span
  React.useEffect(() => {
    if (!storySpan) return
    pass.setCompositionSpan(storySpan)
  }, [storySpan, pass.setCompositionSpan])

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

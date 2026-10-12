"use client"

import * as React from "react"
import { promotedDialogFrame, type FramePerformance, type GlossThread, type StageStorySlide } from "@keeper/shared"
import type { AgentDialogueMessage } from "../../components/agent/types"
import { apiFetch } from "../../lib/api"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useKeeperStageOptional } from "./useKeeperStage"
import { resolveStageFilmstrip, type StageSlide } from "./stageStorySlides"
import { resolveStageNowBeat } from "./stageNowBeat"
import type { FrameCastVoice } from "./FramePerformanceView"
import { selectPerformedFrame, type PerformedFrameRef } from "./workStageComposition"
import {
  classifyStageLayout,
  stageCanvasReading,
  type StageCanvasReading,
  type StageLayoutReceipt,
} from "./stageLayoutHandoff"
import {
  canReturnFromStageAttention,
  holdStageFrame,
  nextStageAttention,
  nextStageFrameIndex,
  restoreHeldStageIndex,
  stageAttentionHoldsFrame,
  type HeldStageFrame,
  type StageAttentionEvent,
  type StageAttentionState,
  type StageAttentionSubject,
} from "./stageAttention"
import {
  applyCanonicalMomentsToSlides,
  collectMomentSourceIds,
  parseCanonicalMomentResponse,
  type MomentSourceLookup,
} from "./stageMomentSource"

async function loadCanonicalMoment(id: string): Promise<MomentSourceLookup> {
  try {
    const res = await apiFetch(`/api/moments/${encodeURIComponent(id)}`)
    return parseCanonicalMomentResponse(res, id)
  } catch {
    return { status: "unresolved" }
  }
}

function useStageMomentSourceLookup(slides: ReadonlyArray<StageStorySlide> | null): {
  lookup: ReadonlyMap<string, MomentSourceLookup>
  pending: boolean
} {
  const board = useUniversalBoardOptional()
  const hasBoard = Boolean(board)
  const onStage = board?.workspaceSurface === "stage"
  const idsKey = React.useMemo(() => collectMomentSourceIds(slides).join("\0"), [slides])
  const [lookup, setLookup] = React.useState<ReadonlyMap<string, MomentSourceLookup>>(
    () => new Map(),
  )
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    const ids = idsKey ? idsKey.split("\0") : []
    if (ids.length === 0) {
      setLookup(new Map())
      setPending(false)
      return
    }
    if (hasBoard && !onStage) return

    let cancelled = false
    setPending(true)
    void Promise.all(ids.map(async (id) => [id, await loadCanonicalMoment(id)] as const)).then(
      (entries) => {
        if (cancelled) return
        setLookup(new Map(entries))
        setPending(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [hasBoard, idsKey, onStage])

  const overlayPending = pending || (idsKey.length > 0 && idsKey.split("\0").some((id) => !lookup.has(id)))

  return { lookup, pending: overlayPending }
}

export type LiveFrameHit = {
  performance: FramePerformance
  castVoices: FrameCastVoice[]
  glossThreads?: readonly GlossThread[]
}

type StagePresentationValue = {
  slides: ReadonlyArray<StageSlide>
  index: number
  setIndex: (index: number) => void
  /** Show one slide without treating later slides as the place to follow. */
  presentSlide: (index: number) => void
  current: StageSlide | null
  liveFrames: ReadonlyMap<string, LiveFrameHit>
  performedFrame: PerformedFrameRef | null
  /** The filmstrip whose titles still match a layout receipt in this Dialog. */
  filmstripLayout: StageLayoutReceipt | null
  /** A layout receipt in this Dialog whose titles are no longer the filmstrip. */
  staleFilmstripLayout: StageLayoutReceipt | null
  stageReading: StageCanvasReading
  attention: StageAttentionState
  attentionSubject: StageAttentionSubject | null
  workForward: boolean
  engageAttention: () => void
  returnToFrame: (opts?: { index?: number }) => void
}

const StagePresentationCtx = React.createContext<StagePresentationValue | null>(null)

const NO_STORY_SLIDES: readonly { title: string }[] = []

export function StagePresentationProvider({
  messages,
  userName,
  agentName,
  isSending,
  storyTitle: _storyTitle,
  domainLabel,
  focusSourceId,
  children,
}: {
  messages: ReadonlyArray<AgentDialogueMessage>
  userName: string
  agentName: string
  isSending: boolean
  storyTitle?: string | null
  domainLabel?: string | null
  /** Lead message id whose live-sourced cell should be the current Stage frame. */
  focusSourceId?: string | null
  children: React.ReactNode
}) {
  const stageApi = useKeeperStageOptional()
  const board = useUniversalBoardOptional()
  const onStage = board?.workspaceSurface === "stage"
  const shell = useV0ShellOptional()
  const beat = React.useMemo(
    () => resolveStageNowBeat(messages, { userName, agentName }),
    [messages, userName, agentName],
  )
  const persisted = React.useMemo((): StageStorySlide[] | null => {
    const story = stageApi?.stage.story
    if (!story?.slides.length) return null
    return story.slides.map((slide) => ({
      id: slide.id,
      slideType: slide.slideType,
      kind: slide.kind,
      title: slide.title,
      body: slide.body,
      ...(slide.source ? { source: slide.source } : {}),
    }))
  }, [stageApi?.stage.story])
  const { lookup, pending } = useStageMomentSourceLookup(persisted)
  const resolvedPersisted = React.useMemo((): StageSlide[] | null => {
    if (!persisted) return null
    return applyCanonicalMomentsToSlides(persisted, lookup, pending)
  }, [persisted, lookup, pending])
  const liveFrames = React.useMemo(() => {
    const map = new Map<string, LiveFrameHit>()
    for (const message of messages) {
      const performance = promotedDialogFrame(message.framePerformance)
      if (!performance) continue
      map.set(message.id, {
        performance,
        castVoices: (message.castVoices ?? []).map((voice) => ({
          slug: voice.slug,
          attributedTo: voice.attributedTo,
          content: voice.content,
        })),
        ...(message.glossThreads?.length ? { glossThreads: message.glossThreads } : {}),
      })
    }
    return map
  }, [messages])
  const slides = React.useMemo(
    () =>
      resolveStageFilmstrip({
        wordmark: shell?.domainFrame?.theme.wordmark,
        tagline: shell?.domainFrame?.theme.tagline,
        domainLabel,
        beat,
        waiting: isSending,
        persisted: resolvedPersisted,
      }),
    [shell?.domainFrame?.theme.wordmark, shell?.domainFrame?.theme.tagline, domainLabel, beat, isSending, resolvedPersisted],
  )
  const frameRefs = React.useMemo((): PerformedFrameRef[] => {
    const refs: PerformedFrameRef[] = []
    for (const message of messages) {
      const hit = liveFrames.get(message.id)
      if (!hit) continue
      refs.push({
        messageId: message.id,
        title: hit.performance.title,
        slideCount: hit.performance.beats.length,
      })
    }
    return refs
  }, [liveFrames, messages])
  const storySourceIds = React.useMemo(
    () =>
      (stageApi?.stage.story?.slides ?? [])
        .map((slide) => (slide.source?.kind === "live" ? slide.source.id?.trim() || "" : ""))
        .filter(Boolean),
    [stageApi?.stage.story],
  )
  const performedFrame = React.useMemo(
    () => selectPerformedFrame({
      frames: frameRefs,
      focusMessageId: focusSourceId,
      storySourceIds,
    }),
    [focusSourceId, frameRefs, storySourceIds],
  )
  const storySlides = stageApi?.stage.story?.slides ?? NO_STORY_SLIDES
  const layoutClass = React.useMemo(
    () => classifyStageLayout({
      messages,
      slides: storySlides,
    }),
    [messages, storySlides],
  )
  const stageReading = React.useMemo(
    () => stageCanvasReading({
      messages,
      current: layoutClass.current,
      stale: layoutClass.stale,
      performedMessageId: performedFrame?.messageId ?? null,
    }),
    [layoutClass.current, layoutClass.stale, messages, performedFrame?.messageId],
  )
  const last = Math.max(0, slides.length - 1)
  const [index, setIndexState] = React.useState(0)
  const [attention, setAttention] = React.useState<StageAttentionState>("present")
  const followStoryRef = React.useRef(false)
  const heldFrameRef = React.useRef<HeldStageFrame | null>(null)
  const attentionSubject: StageAttentionSubject | null =
    onStage && stageAttentionHoldsFrame(attention) ? "dialog" : null

  const setIndex = React.useCallback((next: number) => {
    followStoryRef.current = next > 0
    setIndexState(next)
  }, [])

  const presentSlide = React.useCallback((next: number) => {
    followStoryRef.current = false
    setIndexState(next)
  }, [])

  const applyAttention = React.useCallback((event: StageAttentionEvent) => {
    setAttention((current) => {
      const next = nextStageAttention({
        state: current,
        onStage: event === "leave-stage" ? false : true,
        event,
      })
      if (stageAttentionHoldsFrame(next) && !stageAttentionHoldsFrame(current)) {
        const currentIndex = Math.min(index, last)
        heldFrameRef.current = holdStageFrame(slides[currentIndex] ?? null, currentIndex)
      }
      if (next === "present") heldFrameRef.current = null
      return next
    })
  }, [index, last, slides])

  const engageAttention = React.useCallback(() => {
    applyAttention("engage")
  }, [applyAttention])

  const returnToFrame = React.useCallback((opts?: { index?: number }) => {
    if (!canReturnFromStageAttention(attention, isSending)) return
    followStoryRef.current = false
    if (typeof opts?.index === "number") {
      setIndexState(opts.index)
    } else {
      const restored = restoreHeldStageIndex(slides, heldFrameRef.current)
      if (restored != null) setIndexState(restored)
    }
    applyAttention("return")
  }, [applyAttention, attention, isSending, slides])

  React.useEffect(() => {
    if (!onStage) applyAttention("leave-stage")
  }, [applyAttention, onStage])

  // Focusing the box and sending a message leave the performance in the center.
  // The Dialog does not step forward over it.

  React.useEffect(() => {
    setIndexState((currentIndex) =>
      nextStageFrameIndex({
        attention,
        held: heldFrameRef.current,
        slides,
        followStory: followStoryRef.current,
        last,
        currentIndex,
      }),
    )
  }, [attention, last, slides, slides[last]?.id, slides[last]?.body])

  React.useEffect(() => {
    if (!focusSourceId) return
    const next = slides.findIndex(
      (slide) => slide.source?.kind === "live" && slide.source.id === focusSourceId,
    )
    if (next >= 0) setIndex(next)
  }, [focusSourceId, setIndex, slides])

  const current = slides[Math.min(index, last)] ?? null
  // The performance stays in the center. Talking does not put the Dialog over it.
  const workForward = false
  const value = React.useMemo(
    () => ({
      slides,
      index: Math.min(index, last),
      setIndex,
      presentSlide,
      current,
      liveFrames,
      performedFrame,
      filmstripLayout: layoutClass.current,
      staleFilmstripLayout: layoutClass.stale,
      stageReading,
      attention,
      attentionSubject,
      workForward,
      engageAttention,
      returnToFrame,
    }),
    [
      slides,
      index,
      last,
      setIndex,
      presentSlide,
      current,
      liveFrames,
      performedFrame,
      layoutClass.current,
      layoutClass.stale,
      stageReading,
      attention,
      attentionSubject,
      workForward,
      engageAttention,
      returnToFrame,
    ],
  )

  return (
    <StagePresentationCtx.Provider value={value}>{children}</StagePresentationCtx.Provider>
  )
}

export function useStagePresentationOptional(): StagePresentationValue | null {
  return React.useContext(StagePresentationCtx)
}

"use client"

import * as React from "react"
import type { StageStorySlide } from "@keeper/shared"
import type { AgentDialogueMessage } from "../../components/agent/types"
import { apiFetch } from "../../lib/api"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useKeeperStageOptional } from "./useKeeperStage"
import { resolveStageFilmstrip, type StageSlide } from "./stageStorySlides"
import { resolveStageNowBeat } from "./stageNowBeat"
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

type StagePresentationValue = {
  slides: ReadonlyArray<StageSlide>
  index: number
  setIndex: (index: number) => void
  current: StageSlide | null
}

const StagePresentationCtx = React.createContext<StagePresentationValue | null>(null)

export function StagePresentationProvider({
  messages,
  userName,
  agentName,
  isSending,
  storyTitle,
  domainLabel,
  children,
}: {
  messages: ReadonlyArray<AgentDialogueMessage>
  userName: string
  agentName: string
  isSending: boolean
  storyTitle?: string | null
  domainLabel?: string | null
  children: React.ReactNode
}) {
  const stageApi = useKeeperStageOptional()
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
  const last = Math.max(0, slides.length - 1)
  const [index, setIndexState] = React.useState(0)
  const followStoryRef = React.useRef(false)

  const setIndex = React.useCallback((next: number) => {
    followStoryRef.current = next > 0
    setIndexState(next)
  }, [])

  React.useEffect(() => {
    if (followStoryRef.current && last > 0) {
      setIndexState(last)
    } else {
      setIndexState((currentIndex) => Math.min(currentIndex, last))
    }
  }, [slides.length, slides[last]?.id, slides[last]?.body, last])

  const current = slides[Math.min(index, last)] ?? null
  const value = React.useMemo(
    () => ({ slides, index: Math.min(index, last), setIndex, current }),
    [slides, index, last, setIndex, current],
  )

  return (
    <StagePresentationCtx.Provider value={value}>{children}</StagePresentationCtx.Provider>
  )
}

export function useStagePresentationOptional(): StagePresentationValue | null {
  return React.useContext(StagePresentationCtx)
}

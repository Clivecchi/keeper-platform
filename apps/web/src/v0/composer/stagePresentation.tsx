"use client"

import * as React from "react"
import type { AgentDialogueMessage } from "../../components/agent/types"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useKeeperStageOptional } from "./useKeeperStage"
import { resolveStageFilmstrip, type StageSlide } from "./stageFilmstrip"
import { resolveStageNowBeat } from "./stageNowBeat"

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
  const persisted = React.useMemo((): StageSlide[] | null => {
    const story = stageApi?.stage.story
    if (!story?.slides.length) return null
    return story.slides.map((slide) => ({
      id: slide.id,
      slideType: slide.slideType,
      kind: slide.kind,
      title: slide.title,
      body: slide.body,
    }))
  }, [stageApi?.stage.story])
  const slides = React.useMemo(
    () =>
      resolveStageFilmstrip({
        wordmark: shell?.domainFrame?.theme.wordmark,
        tagline: shell?.domainFrame?.theme.tagline,
        domainLabel,
        beat,
        waiting: isSending,
        persisted,
      }),
    [shell?.domainFrame?.theme.wordmark, shell?.domainFrame?.theme.tagline, domainLabel, beat, isSending, persisted],
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

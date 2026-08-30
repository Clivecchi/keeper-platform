"use client"

import * as React from "react"
import type { AgentDialogueMessage } from "../../components/agent/types"
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
  const beat = React.useMemo(
    () => resolveStageNowBeat(messages, { userName, agentName }),
    [messages, userName, agentName],
  )
  const slides = React.useMemo(
    () =>
      resolveStageFilmstrip({
        stageTitle: stageApi?.stage.title ?? "Keeper",
        storyTitle,
        domainLabel,
        beat,
        waiting: isSending,
      }),
    [stageApi?.stage.title, storyTitle, domainLabel, beat, isSending],
  )
  const last = Math.max(0, slides.length - 1)
  const [index, setIndex] = React.useState(last)

  React.useEffect(() => {
    setIndex(Math.max(0, slides.length - 1))
  }, [slides.length, slides[slides.length - 1]?.body])

  const current = slides[Math.min(index, last)] ?? null
  const value = React.useMemo(
    () => ({ slides, index: Math.min(index, last), setIndex, current }),
    [slides, index, last, current],
  )

  return (
    <StagePresentationCtx.Provider value={value}>{children}</StagePresentationCtx.Provider>
  )
}

export function useStagePresentationOptional(): StagePresentationValue | null {
  return React.useContext(StagePresentationCtx)
}

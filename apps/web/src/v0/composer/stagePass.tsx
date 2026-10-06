"use client"

import * as React from "react"
import type { DomainAudienceRole, StageContext, StageDressSpan, StagePosture, StageTruthKey } from "@keeper/shared"
import { useAuth } from "../../context/AuthContext"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import {
  appendStageVisit,
  presentedStageTruth,
  stageVisitKey,
  type StageOrientationStep,
  type StagePresentationName,
  type StageVisit,
} from "./stageOrientation"

function arrivalAudience(
  shellAudience: string | null | undefined,
  isAdmin: boolean,
): DomainAudienceRole {
  if (isAdmin || shellAudience === "admin") return "admin"
  if (shellAudience === "guest" || shellAudience === "friend" || shellAudience === "keeper") {
    return shellAudience
  }
  return "keeper"
}

type HeldTrail = {
  visits: StageVisit[]
  cursor: number
  presentation: StagePresentationName | null
}

export type StagePass = {
  context: StageContext
  truth: StageTruthKey
  /**
   * The shell domain's stored KeeperStage may fill the story sequence.
   * A Realm pass never does, even when the provider is bound to the anchor domain.
   */
  presentsStoredStory: boolean
  visits: readonly StageVisit[]
  cursor: number
  presentation: StagePresentationName | null
  posture: StagePosture
  compositionSpan: StageDressSpan
  setPosture: (posture: StagePosture) => void
  setCompositionSpan: (span: StageDressSpan) => void
  continueStage: (next: StageContext) => void
  presentStep: (step: StageOrientationStep) => void
}

const StagePassCtx = React.createContext<StagePass | null>(null)

export function StagePassProvider({
  shellDomainId,
  children,
}: {
  shellDomainId: string | null
  children: React.ReactNode
}) {
  const shell = useV0ShellOptional()
  const board = useUniversalBoardOptional()
  const { isAdmin } = useAuth()
  const [trail, setTrail] = React.useState<HeldTrail | null>(null)
  const [posture, setPostureState] = React.useState<StagePosture>("workshop")
  const [compositionSpan, setCompositionSpanState] = React.useState<StageDressSpan>("center")
  const setPosture = React.useCallback((next: StagePosture) => {
    setPostureState(next)
  }, [])
  const setCompositionSpan = React.useCallback((next: StageDressSpan) => {
    setCompositionSpanState((current) => (current === next ? current : next))
  }, [])
  const shellMode = shell?.shellMode
  const shellSlug = shell?.domainSlug ?? ""

  const naturalVisit = React.useMemo<StageVisit>(() => {
    if (shellMode === "home") return { scope: "realm" }
    return {
      scope: "domain",
      ...(shellDomainId ? { domainId: shellDomainId } : {}),
    }
  }, [shellDomainId, shellMode])

  React.useEffect(() => {
    setTrail(null)
  }, [shellMode, shellSlug])

  const audience = arrivalAudience(shell?.resolvedAudience, Boolean(isAdmin))
  const arriving = board?.stageArriving === true

  React.useEffect(() => {
    if (audience !== "admin" || !arriving) return
    if (naturalVisit.scope === "domain" && !naturalVisit.domainId) return
    setTrail((current) => {
      if (current?.presentation) return current
      return {
        visits: current?.visits?.length ? current.visits : [naturalVisit],
        cursor: current?.cursor ?? 0,
        presentation: "where-we-are",
      }
    })
  }, [arriving, audience, naturalVisit])

  const defaultVisits = React.useMemo(() => [naturalVisit], [naturalVisit])
  const held = trail ?? {
    visits: defaultVisits,
    cursor: 0,
    presentation: null,
  }
  const cursor = Math.min(Math.max(held.cursor, 0), held.visits.length - 1)
  const activeVisit = held.visits[cursor] ?? naturalVisit
  const truth = presentedStageTruth({
    visit: activeVisit,
    presentation: held.presentation,
    audience,
    arriving,
  })

  const domainId =
    activeVisit.scope === "domain" ? activeVisit.domainId ?? shellDomainId ?? undefined : undefined

  const context = React.useMemo<StageContext>(
    () => ({
      scope: activeVisit.scope,
      ...(domainId ? { domainId } : {}),
      audience,
      arriving,
    }),
    [activeVisit.scope, domainId, audience, arriving],
  )

  // Open Stage plays the shell domain's stored story, including from /home.
  // Realm arrival never reaches this flag. A continuation into another domain
  // does not borrow this shell's filmstrip.
  const presentsStoredStory = Boolean(
    truth === "story" &&
      shellDomainId &&
      (domainId == null || domainId === shellDomainId),
  )

  const continueStage = React.useCallback((next: StageContext) => {
    if (next.scope !== "domain" || !next.domainId) return
    const visit: StageVisit = { scope: "domain", domainId: next.domainId }
    setTrail((current) => {
      const base = current ?? { visits: [naturalVisit], cursor: 0, presentation: null }
      const visits = appendStageVisit(base.visits, visit)
      return {
        visits,
        cursor: Math.max(0, visits.findIndex((row) => stageVisitKey(row) === stageVisitKey(visit))),
        presentation: "where-we-are",
      }
    })
  }, [naturalVisit])

  const presentStep = React.useCallback((step: StageOrientationStep) => {
    setTrail((current) => {
      const base = current ?? { visits: [naturalVisit], cursor: 0, presentation: null }
      const nextCursor = base.visits.findIndex((row) => stageVisitKey(row) === stageVisitKey(step.visit))
      return {
        visits: base.visits,
        cursor: nextCursor >= 0 ? nextCursor : base.cursor,
        presentation: step.presentation,
      }
    })
  }, [naturalVisit])

  const value = React.useMemo<StagePass>(
    () => ({
      context,
      truth,
      presentsStoredStory,
      visits: held.visits,
      cursor,
      presentation: held.presentation,
      posture,
      compositionSpan,
      setPosture,
      setCompositionSpan,
      continueStage,
      presentStep,
    }),
    [
      context,
      truth,
      presentsStoredStory,
      held.visits,
      cursor,
      held.presentation,
      posture,
      compositionSpan,
      setPosture,
      setCompositionSpan,
      continueStage,
      presentStep,
    ],
  )

  return <StagePassCtx.Provider value={value}>{children}</StagePassCtx.Provider>
}

export function useStagePass(): StagePass {
  const pass = React.useContext(StagePassCtx)
  if (!pass) throw new Error("useStagePass must be used within StagePassProvider")
  return pass
}

export function useStagePassOptional(): StagePass | null {
  return React.useContext(StagePassCtx)
}

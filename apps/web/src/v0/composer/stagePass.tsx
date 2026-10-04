"use client"

import * as React from "react"
import {
  selectStageTruth,
  type DomainAudienceRole,
  type StageContext,
  type StageTruthKey,
} from "@keeper/shared"
import { useAuth } from "../../context/AuthContext"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"

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

export type StagePass = {
  context: StageContext
  truth: StageTruthKey
  /**
   * The shell domain's stored KeeperStage may fill the story sequence.
   * A Realm pass never does, even when the provider is bound to the anchor domain.
   */
  presentsStoredStory: boolean
  continueStage: (next: StageContext) => void
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
  const [continuedDomainId, setContinuedDomainId] = React.useState<string | null>(null)
  const shellMode = shell?.shellMode
  const shellSlug = shell?.domainSlug ?? ""

  React.useEffect(() => {
    setContinuedDomainId(null)
  }, [shellMode, shellSlug])

  const audience = arrivalAudience(shell?.resolvedAudience, Boolean(isAdmin))
  const arriving = board?.stageArriving === true
  const scope: StageContext["scope"] = shellMode === "home" && !continuedDomainId ? "realm" : "domain"
  const domainId =
    continuedDomainId ?? (scope === "domain" ? shellDomainId ?? undefined : undefined)

  const context = React.useMemo<StageContext>(
    () => ({
      scope,
      ...(domainId ? { domainId } : {}),
      audience,
      arriving,
    }),
    [scope, domainId, audience, arriving],
  )
  const truth = selectStageTruth(context)
  const presentsStoredStory = Boolean(
    truth === "story" &&
      scope === "domain" &&
      domainId &&
      shellDomainId &&
      domainId === shellDomainId,
  )

  const continueStage = React.useCallback((next: StageContext) => {
    if (next.scope !== "domain" || !next.domainId) return
    setContinuedDomainId(next.domainId)
  }, [])

  const value = React.useMemo<StagePass>(
    () => ({ context, truth, presentsStoredStory, continueStage }),
    [context, truth, presentsStoredStory, continueStage],
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

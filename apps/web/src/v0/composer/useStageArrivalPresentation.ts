"use client"

import { resolveStagePresentation, selectStageTruth, type DomainAudienceRole, type StagePresentationKey } from "@keeper/shared"
import { useAuth } from "../../context/AuthContext"
import { useUniversalBoardOptional } from "../boards/UniversalBoardContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useStagePassOptional } from "./stagePass"

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

/** Which presentation the existing Stage should show right now. */
export function useStageArrivalPresentation(): StagePresentationKey {
  const pass = useStagePassOptional()
  const shell = useV0ShellOptional()
  const board = useUniversalBoardOptional()
  const { isAdmin } = useAuth()
  if (pass) {
    return selectStageTruth(pass.context) === "story" ? "story" : "where-we-are"
  }
  return resolveStagePresentation({
    audience: arrivalAudience(shell?.resolvedAudience, Boolean(isAdmin)),
    arriving: board?.stageArriving === true,
  })
}

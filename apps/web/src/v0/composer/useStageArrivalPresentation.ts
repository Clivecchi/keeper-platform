"use client"

import { resolveStagePresentation, type DomainAudienceRole, type StagePresentationKey } from "@keeper/shared"
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

/** Which presentation the existing Stage should show right now. */
export function useStageArrivalPresentation(): StagePresentationKey {
  const shell = useV0ShellOptional()
  const board = useUniversalBoardOptional()
  const { isAdmin } = useAuth()
  return resolveStagePresentation({
    audience: arrivalAudience(shell?.resolvedAudience, Boolean(isAdmin)),
    arriving: board?.stageArriving === true,
  })
}

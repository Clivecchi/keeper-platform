"use client"

import * as React from "react"
import { useUniversalBoard } from "../boards/UniversalBoardContext"
import { useKeeperStage } from "./useKeeperStage"

export function dialogToBindOnStage(
  dialogObjectIds: ReadonlyArray<string>,
  talkingInId: string | null,
): string | null {
  if (dialogObjectIds.length === 0) return null
  if (talkingInId && dialogObjectIds.includes(talkingInId)) return null
  return dialogObjectIds[0] ?? null
}

/**
 * If a Dialog is already on Stage, Talking in binds to it.
 * Does not leave Stage. Does not steal an already-bound Dialog that is on Stage.
 */
export function useBindStageDialog(): void {
  const { selection, actions, workspaceSurface } = useUniversalBoard()
  const stageApi = useKeeperStage()

  React.useEffect(() => {
    if (workspaceSurface !== "stage") return
    const dialogIds = stageApi.stage.presences
      .filter((presence) => presence.kind === "dialog")
      .map((presence) => presence.objectId)
    const nextId = dialogToBindOnStage(dialogIds, selection.selectedDialogId)
    if (!nextId) return
    actions.onWorkTargetFromStage({ kind: "dialog", objectId: nextId })
  }, [
    actions,
    selection.selectedDialogId,
    stageApi.stage.presences,
    workspaceSurface,
  ])
}

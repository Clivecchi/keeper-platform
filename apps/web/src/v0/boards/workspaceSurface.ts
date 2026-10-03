import type { WorkspaceSurface } from "@keeper/shared"

/**
 * Why the workspace surface is changing.
 * Stage is the place Keeper presents — a room on the current Board, not `?board=stage`.
 * Domain arrival opens Stage. Choosing a Dialog returns to the conversation.
 * Chronicle follows the selected object.
 */

/** Chronicle on Stage must show the selected object, not force the Dialog Document. */
export function shouldRenderRealmDocumentChronicle(input: {
  workspaceSurface: WorkspaceSurface
  boardId: string
  subjectKind: string
  dialogIsDocumentBearing: boolean
}): boolean {
  if (input.subjectKind === "dialog") return input.dialogIsDocumentBearing
  if (input.workspaceSurface === "stage") return false
  return (
    input.boardId === "realm" &&
    (input.subjectKind === "domain" ||
      input.subjectKind === "moment" ||
      input.subjectKind === "library")
  )
}
export type StageSurfaceReason =
  | "open-stage"
  | "stage-presence"
  | "platform-nav"
  | "board-change"
  | "domain-change"
  | "leave-stage"

/**
 * Domain arrival opens Stage.
 * While that arrival is still open, domain and board changes keep Stage open.
 * Choosing something in Nav (`platform-nav`) or leaving on purpose returns to Dialog.
 */
export function nextWorkspaceSurface(
  reason: StageSurfaceReason,
  options?: { arriving?: boolean },
): WorkspaceSurface {
  if (reason === "open-stage" || reason === "stage-presence") return "stage"
  if (
    options?.arriving &&
    (reason === "domain-change" || reason === "board-change")
  ) {
    return "stage"
  }
  return "dialog"
}

/** Authenticated domain (and brand) entry with no Dialog deep link. */
export function isDomainStageArrival(input: {
  shellMode: string | null | undefined
  dialogId?: string | null
}): boolean {
  if (input.dialogId?.trim()) return false
  return input.shellMode === "domain" || input.shellMode === "brand"
}

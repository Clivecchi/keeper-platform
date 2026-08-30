import type { WorkspaceSurface } from "@keeper/shared"

/**
 * Why the workspace surface is changing.
 * Stage is a room on the current Board — not a trap, not `?board=stage`.
 * On Stage, the 70% is the Frame-driven story workshop (assets → presentation).
 * Chronicle follows the selected object. Dialog stays the conversation.
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

/** Enter Stage only on purpose. All platform navigation returns to Dialog. */
export function nextWorkspaceSurface(reason: StageSurfaceReason): WorkspaceSurface {
  if (reason === "open-stage" || reason === "stage-presence") return "stage"
  return "dialog"
}

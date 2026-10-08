import type { WorkspaceSurface } from "@keeper/shared"

/**
 * Why the workspace surface is changing.
 * `WorkspaceSurface` is a Board posture, not a Board type and not the Stage surface.
 * `stage` emphasizes performance on the current Board. It is not `?board=stage`.
 * Naming debt: this posture still says "stage". The Stage surface is the center
 * performance (`KeeperStageCanvas`). A later slice may rename the posture.
 * Realm and Domain arrival open that posture when nothing is selected.
 * Choosing a subject changes the work. It does not change this posture.
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
 * Realm (/home) and Domain arrival open Stage.
 * While that arrival is still open, domain and board changes keep Stage open.
 * Leaving on purpose returns to Dialog. Selecting a subject does not.
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

/** Authenticated Realm, Domain, or brand entry with no Dialog deep link. */
export function isDomainStageArrival(input: {
  shellMode: string | null | undefined
  dialogId?: string | null
}): boolean {
  if (input.dialogId?.trim()) return false
  return input.shellMode === "home" || input.shellMode === "domain" || input.shellMode === "brand"
}

import type { WorkspaceSurface } from "@keeper/shared"

/**
 * Why the workspace surface is changing.
 * Stage is a room on the current Board — not a trap.
 */
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

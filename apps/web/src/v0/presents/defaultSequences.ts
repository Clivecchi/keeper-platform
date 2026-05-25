import { getProject, type IProject } from "@theatre/core"
import type { PresentName } from "./types"
import { DEFAULT_PRESENT_PROJECT_STATE } from "./buildPresentProjectState"

export const KEEPER_PRESENTS_PROJECT_ID = "Keeper Presents"

/** Maps a PresentName to its Theatre sheet id (defaults use the same string). */
export function presentSheetId(present: PresentName): string {
  return present
}

let cachedProject: IProject | null = null

export function getPresentProject(): IProject {
  if (!cachedProject) {
    cachedProject = getProject(KEEPER_PRESENTS_PROJECT_ID, {
      state: DEFAULT_PRESENT_PROJECT_STATE,
    })
  }
  return cachedProject
}

export { DEFAULT_PRESENT_PROJECT_STATE } from "./buildPresentProjectState"
export { PRESENT_SEQUENCE_DEFS } from "./buildPresentProjectState"

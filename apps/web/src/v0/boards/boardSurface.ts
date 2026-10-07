/**
 * Addressable regions of the Board — where the person stands.
 *
 * Stage is the center performance. It is not a Board type.
 * `WorkspaceSurface` (`dialog` | `stage`) is a Board posture. The posture
 * value `stage` emphasizes performance. It is not this list.
 *
 * Naming debt: that posture still uses the word Stage. This slice does not
 * rename it.
 */

export const BOARD_SURFACES = [
  "nav",
  "orientation",
  "stage",
  "composer",
  "chronicle",
] as const

export type BoardSurface = (typeof BOARD_SURFACES)[number]

export type BoardSurfaceProps = {
  "data-board-surface": BoardSurface
}

export function boardSurfaceProps(surface: BoardSurface): BoardSurfaceProps {
  return { "data-board-surface": surface }
}

/** Short, front-of-stage copy while a Dialog turn is running. */

export const WORK_STALL_MS = 20_000

export type DialogWorkTab = "at-work" | "full-turn"

/** Who the live line is about. Falls back to the Dialog lead. */
export function workVoiceName(liveLabel: string, fallback: string): string {
  const match = liveLabel.trim().match(/^([A-Za-z][\w.'’-]{0,24}(?: [\w.'’-]{1,24})?) is\b/)
  const name = match?.[1]?.trim()
  return name || fallback.trim() || "Kip"
}

export function workElapsedLabel(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

export function workIsStalled(stepElapsedMs: number): boolean {
  return stepElapsedMs >= WORK_STALL_MS
}

export type DirectedWorkPhase = "cast" | "director" | null

/**
 * Live line for a directed send.
 * The highlighted cast chip is not the voice at work. Only the lead's own
 * composing phase may supply a name here. Cast progress comes from the step
 * the room actually set ("Cloud is contributing…" only after Cloud is engaged).
 */
export function directedWorkLabel(params: {
  directed: boolean
  sending: boolean
  phase: DirectedWorkPhase
  leadName: string
}): string | undefined {
  if (!params.directed || !params.sending) return undefined
  if (params.phase !== "director") return undefined
  const name = params.leadName.trim() || "Kip"
  return `${name} is thinking…`
}

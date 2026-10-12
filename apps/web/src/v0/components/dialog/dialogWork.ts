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

/** Short, front-of-stage copy while a Dialog turn is running. */

export const WORK_STALL_MS = 20_000

export type DialogWorkTab = "at-work" | "full-turn"

/** Who the live line is about. A directed aim uses "Name — …". */
export function workVoiceName(liveLabel: string, fallback: string): string {
  const match = liveLabel.trim().match(
    /^([A-Za-z][\w.'’-]{0,24}(?: [\w.'’-]{1,24})?)(?: is\b| — | – )/,
  )
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

/** One status line: who, then the aim or result, clipped so the slide stays one thought. */
export function workStatusLine(who: string, detail: string): string {
  const name = who.trim() || "Kip"
  const text = detail.replace(/\s+/g, " ").trim()
  if (!text) return `${name} is working…`
  const clip = text.length > 140 ? `${text.slice(0, 137)}…` : text
  return `${name} — ${clip}`
}

const WORK_PROGRESS_SKIP = /^(received your message|preparing…?|run complete)$/i

/**
 * The work slide shows the current aim and up to three earlier lines.
 * Repeats and arrival meta stay off the slide. The full list remains on the next beat.
 */
export function workProgress(
  steps: readonly { label: string }[],
  liveLabel: string,
): { voice: string; now: string; earlier: string[] } {
  const lines: string[] = []
  const push = (raw: string) => {
    const label = raw.replace(/\s+/g, " ").trim()
    if (!label || WORK_PROGRESS_SKIP.test(label)) return
    if (lines[lines.length - 1]?.toLowerCase() === label.toLowerCase()) return
    lines.push(label)
  }
  for (const step of steps) push(step.label)
  push(liveLabel)
  const now = lines[lines.length - 1] || "Working…"
  return {
    voice: workVoiceName(now, "Kip"),
    now,
    earlier: lines.slice(0, -1).slice(-3),
  }
}

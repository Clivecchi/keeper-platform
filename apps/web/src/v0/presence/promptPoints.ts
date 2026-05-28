/**
 * Parse and serialize agent lens/composed prompts as editable points.
 * Storage remains a plain string; UI edits one line per point.
 */

export interface PromptPoint {
  id: string
  content: string
}

function newPointId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `pt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeLine(line: string): string {
  return line
    .replace(/^\s*#+\s*/, "")
    .replace(/^\s*(?:[-*•]|\d+[.)]\s+)\s*/, "")
    .trimEnd()
}

/** Split stored prompt text into editable points. */
export function parsePromptToPoints(text: string): PromptPoint[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return [{ id: newPointId(), content: "" }]
  }

  const lines = text.split(/\r?\n/)
  const points = lines
    .map(normalizeLine)
    .filter((line) => line.length > 0)
    .map((content) => ({ id: newPointId(), content }))

  return points.length > 0 ? points : [{ id: newPointId(), content: "" }]
}

/** Join points back into the stored prompt string. */
export function serializePromptPoints(points: PromptPoint[]): string {
  return points
    .map((p) => p.content.trim())
    .filter(Boolean)
    .join("\n")
}

export function createEmptyPromptPoint(): PromptPoint {
  return { id: newPointId(), content: "" }
}

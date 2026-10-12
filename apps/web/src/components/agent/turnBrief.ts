/** Outcome and next step shown before a long Cast reply. The rest stays reachable. */

export type TurnBrief = {
  shown: string
  folded: string | null
}

const BRIEF_CAP = 320

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function isNextStep(sentence: string): boolean {
  return /\b(next|then)\b/i.test(sentence)
}

function nextClause(sentence: string): string {
  const match = sentence.match(/\b(?:the )?next\b[^.;,]{0,70}/i)
  const clause = (match?.[0] ?? sentence).trim()
  if (!clause) return ""
  const sentenceCase = clause.charAt(0).toUpperCase() + clause.slice(1)
  return /[.!?]$/.test(sentenceCase) ? sentenceCase : `${sentenceCase}.`
}

export function turnBrief(text: string): TurnBrief {
  const trimmed = text.trim()
  if (!trimmed) return { shown: "", folded: null }
  if (trimmed.length <= BRIEF_CAP) return { shown: trimmed, folded: null }

  const parts = sentences(trimmed)
  if (parts.length <= 1) {
    const shown = trimmed.slice(0, BRIEF_CAP).trim()
    const folded = trimmed.slice(BRIEF_CAP).trim()
    return { shown, folded: folded || null }
  }

  const outcome = parts[0] ?? trimmed
  const nextIndex = parts.findIndex((sentence, index) => index > 0 && isNextStep(sentence))
  const next = nextIndex > 0 ? nextClause(parts[nextIndex]!) : ""
  const shown = [outcome, next].filter(Boolean).join(" ")
  const folded = parts.filter((_, index) => index !== 0).join(" ")
  if (shown.length <= BRIEF_CAP) return { shown, folded: folded || null }
  return {
    shown: `${shown.slice(0, BRIEF_CAP).trim()}…`,
    folded: folded || null,
  }
}

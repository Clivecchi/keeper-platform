import { normalizeActionReceipt } from "../../../components/agent/types"

/** A single line in the Thinking Space run trace. */
export type DialogThinkingStep = {
  id: string
  label: string
  timestamp: number
}

export function createThinkingStep(label: string, index: number): DialogThinkingStep {
  return {
    id: `think-${Date.now()}-${index}`,
    label,
    timestamp: Date.now(),
  }
}

const ACTION_TRACE_VERBS: Record<string, string> = {
  "draft.create": "Created draft",
  "draft.update": "Updated draft",
  "draft.delete": "Deleted draft",
  "draft.setActive": "Set active draft",
  "draft.list": "Listed drafts",
  "draft.get": "Retrieved draft",
  "draft.read": "Retrieved draft",
  "draft.update.propose": "Proposed draft update",
  "draft.point.rewrite": "Rewrote draft point",
  "draft.point.accept": "Accepted draft point",
  "moment.create": "Captured moment",
  "moment.keep": "Captured moment",
  "sole.save": "Saved memory",
  "image.generate": "Generated image",
  "journey.create": "Created journey",
  "journey.update": "Updated journey",
  "path.create": "Created path",
  "path.update": "Updated path",
  "mcp.call": "Called tool",
}

function formatActionTraceLabel(receipt: ReturnType<typeof normalizeActionReceipt>): string {
  const verb = ACTION_TRACE_VERBS[receipt.type] ?? "Completed action"
  if (receipt.status === "error") {
    return `${verb} failed — ${receipt.message}`
  }
  if (receipt.status === "skipped") {
    return `${verb} skipped — ${receipt.message}`
  }

  const draft = receipt.data?.draft as { title?: string } | undefined
  if (draft?.title?.trim()) return `${verb} · ${draft.title.trim()}`

  const moment = receipt.data?.moment as { title?: string } | undefined
  if (moment?.title?.trim()) return `${verb} · ${moment.title.trim()}`

  const journey = receipt.data?.journey as { name?: string } | undefined
  if (journey?.name?.trim()) return `${verb} · ${journey.name.trim()}`

  const path = receipt.data?.path as { name?: string } | undefined
  if (path?.name?.trim()) return `${verb} · ${path.name.trim()}`

  const toolName = receipt.data?.toolName as string | undefined
  if (receipt.type === "mcp.call" && toolName?.trim()) {
    return `${verb} · ${toolName.trim()}`
  }

  const message = receipt.message?.trim()
  return message && message !== "Action completed successfully" ? `${verb} — ${message}` : verb
}

/** API action payload shape accepted by {@link normalizeActionReceipt}. */
export type RunAgentActionInput = Parameters<typeof normalizeActionReceipt>[0]

/** Map API action receipts into run-trace steps (shown after the agent finishes). */
export function actionResultsToThinkingSteps(
  actions: ReadonlyArray<RunAgentActionInput>,
  startIndex: number,
): DialogThinkingStep[] {
  return actions.map((action, offset) =>
    createThinkingStep(formatActionTraceLabel(normalizeActionReceipt(action)), startIndex + offset),
  )
}

export function latestThinkingSummary(
  steps: readonly DialogThinkingStep[],
  fallback: string,
): string {
  const last = steps[steps.length - 1]
  return last?.label?.trim() || fallback
}

const THINKING_META_PATTERNS = [
  /^received your message$/i,
  /^run complete$/i,
  /is composing a reply/i,
  /^consulting /i,
]

function isThinkingMetaStep(label: string): boolean {
  return THINKING_META_PATTERNS.some((pattern) => pattern.test(label.trim()))
}

/** Convert an internal run-trace label into a short narrative sentence. */
export function stepLabelToStorySentence(label: string, agentName: string): string | null {
  const text = label.trim()
  if (!text) return null
  if (/^received your message$/i.test(text)) return "Your message arrived."
  if (/^run complete$/i.test(text)) return null
  if (/^run failed/i.test(text)) return text.replace(/…$/, ".")

  if (/is composing a reply/i.test(text)) {
    return text.replace(/…$/, ".")
  }

  if (/^(.+) is thinking…?$/i.test(text)) {
    return text.endsWith("…") ? text : `${text}…`
  }

  const attachmentMatch = text.match(/^reviewing (\d+) attached files/i)
  if (attachmentMatch) {
    const count = Number(attachmentMatch[1])
    return count === 1 ? "Reviewing the file you attached." : `Reviewing ${count} attached files.`
  }
  if (/reviewing 1 attached file/i.test(text)) return "Reviewing the file you attached."

  const consultingMatch = text.match(/^consulting (.+?)(?:…|\.)?$/i)
  if (consultingMatch?.[1]) {
    return `Consulting ${consultingMatch[1].trim()}.`
  }

  if (text.includes(" · ")) {
    const [head, detail] = text.split(" · ")
    if (head?.trim() && detail?.trim()) {
      return `${head.trim()} — ${detail.trim()}.`
    }
  }

  if (ACTION_STEP_PREFIX.test(text)) {
    return text.endsWith(".") || text.endsWith("…") ? text.replace(/…$/, ".") : `${text}.`
  }

  return text.replace(/…$/, ".")
}

/** Narrative sentences derived from run trace — meta beats omitted. */
export function thinkingStepsToStorySentences(
  steps: readonly DialogThinkingStep[],
  agentName: string,
): string[] {
  const seen = new Set<string>()
  const sentences: string[] = []

  for (const step of steps) {
    const sentence = stepLabelToStorySentence(step.label, agentName)
    if (!sentence) continue
    const key = sentence.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    sentences.push(sentence)
  }

  return sentences
}

function formatInProgressBeat(sentence: string): string {
  return sentence.endsWith("…") ? sentence : sentence.replace(/\.$/, "…")
}

/** Live Horizon line — the current beat of the working story. */
export function composeHorizonBeat(
  steps: readonly DialogThinkingStep[],
  agentName: string,
  override?: string,
): string {
  if (override?.trim()) {
    const fromOverride = stepLabelToStorySentence(override, agentName)
    return formatInProgressBeat(fromOverride ?? override.trim())
  }

  const sentences = thinkingStepsToStorySentences(steps, agentName)
  const latest = sentences[sentences.length - 1]
  if (latest) return formatInProgressBeat(latest)

  return formatInProgressBeat(`${agentName} is working.`)
}

/** Prior story beats for Thinking Space — everything before the live Horizon beat. */
export function composeThinkingStoryBody(
  steps: readonly DialogThinkingStep[],
  agentName: string,
): string {
  const sentences = thinkingStepsToStorySentences(steps, agentName)
  if (sentences.length <= 1) return ""
  return sentences.slice(0, -1).join(" ")
}

function ensureEllipsisEnding(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  if (trimmed.endsWith("…") || trimmed.endsWith("...")) return trimmed
  if (trimmed.endsWith(".")) return `${trimmed.slice(0, -1)}…`
  return `${trimmed}…`
}

const ACTION_STEP_PREFIX =
  /^(created|updated|saved|captured|generated|called|listed|retrieved|proposed|accepted|deleted|set active)/i

/**
 * One-line dialogic bridge for the post-run Horizon — sits atop the composer
 * and preps the conversational reply below.
 */
export function dialogicRunSummary(
  steps: readonly DialogThinkingStep[],
  agentName: string,
): string | null {
  if (steps.length === 0) return null

  const failed = steps.find((step) => /^run failed/i.test(step.label.trim()))
  if (failed) return failed.label.trim()

  const work = steps
    .map((step) => step.label.trim())
    .filter((label) => label.length > 0 && !isThinkingMetaStep(label))

  if (work.length === 0) return null

  const actions = work.filter((label) => ACTION_STEP_PREFIX.test(label))

  if (actions.length === 1) {
    const [head, detail] = actions[0].split(" · ")
    if (detail?.trim()) {
      return ensureEllipsisEnding(`${head} — ${detail.trim()}`)
    }
    return ensureEllipsisEnding(actions[0])
  }

  if (actions.length > 1) {
    const latest = actions[actions.length - 1]
    return ensureEllipsisEnding(latest)
  }

  const last = work[work.length - 1]
  if (/reviewing \d+ attached/i.test(last)) {
    return ensureEllipsisEnding(last.replace(/…$/, ""))
  }

  const storySentences = thinkingStepsToStorySentences(steps, agentName)
  const closing = storySentences[storySentences.length - 1]
  if (closing) return ensureEllipsisEnding(closing)

  return ensureEllipsisEnding(`${agentName} finished that turn`)
}

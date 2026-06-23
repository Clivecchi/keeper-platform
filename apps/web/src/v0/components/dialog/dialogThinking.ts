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

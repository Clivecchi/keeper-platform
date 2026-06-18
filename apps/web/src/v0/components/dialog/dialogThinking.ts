/** A single line in the Thinking Space chain-of-thought trace. */
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

export function latestThinkingSummary(
  steps: readonly DialogThinkingStep[],
  fallback: string,
): string {
  const last = steps[steps.length - 1]
  return last?.label?.trim() || fallback
}

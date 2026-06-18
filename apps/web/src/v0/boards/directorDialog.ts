/**
 * Director dialog — orchestration helpers for Universal Board IDE preset.
 * Lead (Kip) owns the composer; board instruments run as delegated sub-turns.
 */

export type BoardInstrumentSlug = "cloud" | "rendr"

export type DirectorDialogConfig = {
  activeInstrument: BoardInstrumentSlug | null
  instrumentLabels: Record<BoardInstrumentSlug, string>
  directorDisplayName: string
}

export const BOARD_INSTRUMENT_LABELS: Record<BoardInstrumentSlug, string> = {
  cloud: "Cloud",
  rendr: "Rendr",
}

export function buildInstrumentDelegationPrompt(params: {
  userMessage: string
  instrumentLabel: string
  directorName: string
}): string {
  return [
    `[Director delegation — ${params.instrumentLabel} on the IDE board]`,
    `${params.directorName} (Lead) relayed this from the user:`,
    `"${params.userMessage}"`,
    "",
    `Respond as ${params.instrumentLabel} — concise, specific to your role. ${params.directorName} will synthesize for the user.`,
  ].join("\n")
}

export function buildDirectorSynthesisPrompt(params: {
  userMessage: string
  instrumentLabel: string
  instrumentReply: string
  directorName: string
}): string {
  return [
    `[Director synthesis — ${params.directorName}]`,
    `The user asked:`,
    `"${params.userMessage}"`,
    "",
    `${params.instrumentLabel} (board instrument) responded:`,
    `"${params.instrumentReply}"`,
    "",
    `As Lead, reply to the user. Integrate ${params.instrumentLabel}'s input when useful; stay in your voice.`,
  ].join("\n")
}

export function extractAgentReplyFromRunResult(result: unknown): string | null {
  const data = (result as { data?: Record<string, unknown> })?.data
  if (!data || typeof data !== "object") return null
  const nested = data.data as Record<string, unknown> | undefined
  const response =
    (typeof nested?.response === "string" && nested.response.trim()) ||
    (typeof data.response === "string" && data.response.trim()) ||
    null
  return response
}

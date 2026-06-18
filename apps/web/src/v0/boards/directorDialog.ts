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

export type DirectorSendPhase = "instrument" | "director"

const INSTRUMENT_ADDRESS_PATTERN = /^(cloud|rendr)\s*[—\-:]/i

/** Pinned chip wins; otherwise honor "Cloud — …" / "Rendr — …" in the message. */
export function resolveDirectorInstrument(params: {
  pinned: BoardInstrumentSlug | null
  userMessage: string
}): BoardInstrumentSlug | null {
  if (params.pinned) return params.pinned
  const match = params.userMessage.trim().match(INSTRUMENT_ADDRESS_PATTERN)
  if (!match) return null
  return match[1].toLowerCase() as BoardInstrumentSlug
}

export function buildInstrumentDelegationPrompt(params: {
  userMessage: string
  instrumentLabel: string
  directorName: string
}): string {
  return [
    `[Director delegation — ${params.instrumentLabel} on the IDE board]`,
    `The user addressed ${params.instrumentLabel} (instrument pinned on the IDE board).`,
    `${params.directorName} (Lead) relayed:`,
    `"${params.userMessage}"`,
    "",
    `Answer in first person as ${params.instrumentLabel}. One focused paragraph unless they asked for a list.`,
    `Be specific to your role. ${params.directorName} will synthesize for the user — do not speak as ${params.directorName}.`,
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
    `The user asked (they may have addressed ${params.instrumentLabel} directly — that is expected when pinned):`,
    `"${params.userMessage}"`,
    "",
    `${params.instrumentLabel} (board instrument) responded:`,
    `"${params.instrumentReply}"`,
    "",
    `Reply to the user as Lead (${params.directorName}).`,
    `- Integrate ${params.instrumentLabel}'s input; do not repeat it verbatim.`,
    `- Do NOT correct the user about who they addressed. Never say they are "talking to ${params.directorName}, not ${params.instrumentLabel}".`,
    `- Stay brief when ${params.instrumentLabel} already answered the question.`,
  ].join("\n")
}

/** When the instrument was targeted but sub-run returned nothing — still director mode for Kip. */
export function buildDirectorFallbackSynthesisPrompt(params: {
  userMessage: string
  instrumentLabel: string
  directorName: string
}): string {
  return [
    `[Director synthesis — ${params.directorName}]`,
    `The user addressed ${params.instrumentLabel} on the IDE board.`,
    `"${params.userMessage}"`,
    "",
    `${params.instrumentLabel} did not return a reply this turn (delegation empty or failed).`,
    "",
    `Reply as Lead (${params.directorName}). Answer from your knowledge of ${params.instrumentLabel}'s role.`,
    `- Do NOT say the user is "talking to ${params.directorName}, not ${params.instrumentLabel}".`,
    `- Do NOT offer to "hand off" or "coordinate with" ${params.instrumentLabel} — that turn already happened.`,
    `- Stay brief and practical.`,
  ].join("\n")
}

function readResponseString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function extractAgentReplyFromRunResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null
  const root = result as Record<string, unknown>

  const layer1 = root.data
  if (layer1 && typeof layer1 === "object") {
    const l1 = layer1 as Record<string, unknown>
    const layer2 = l1.data
    if (layer2 && typeof layer2 === "object") {
      const nested = readResponseString((layer2 as Record<string, unknown>).response)
      if (nested) return nested
    }
    const direct = readResponseString(l1.response)
    if (direct) return direct
  }

  return readResponseString(root.response)
}

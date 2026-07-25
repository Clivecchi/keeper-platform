/**
 * Director dialog — orchestration helpers for Universal Board IDE preset.
 * Lead (Kip) owns the composer; board instruments run as delegated sub-turns.
 */

export {
  isDirectorContinuityPhrase,
  resolveDirectorDelegationMessage,
  type DirectorContinuityMessage,
} from "@keeper/shared"

import type { DirectorDelegationBeat } from "../../components/agent/types"

/** Agent slug delegated by Lead on director-mode boards (IDE tools or domain lead agents). */
export type BoardInstrumentSlug = string

export type DialogParticipationMode = "voice" | "support_only" | "silent"

export type DirectorDialogConfig = {
  activeInstrument: BoardInstrumentSlug | null
  /** Domain/Realm multi-select — consult each engaged cast member for real minimal input. */
  consultInstruments?: BoardInstrumentSlug[]
  instrumentLabels: Record<string, string>
  /** Declared participation per slug — support_only / silent skip Dialog-voice fetches. */
  instrumentParticipation?: Record<string, DialogParticipationMode>
  directorDisplayName: string
}

export function resolveInstrumentParticipation(
  config: DirectorDialogConfig | undefined,
  slug: string,
): DialogParticipationMode {
  const key = slug.trim().toLowerCase()
  const fromConfig = config?.instrumentParticipation?.[key]
  if (fromConfig === "voice" || fromConfig === "support_only" || fromConfig === "silent") {
    return fromConfig
  }
  if (key === "cloud") return "support_only"
  return "voice"
}

export const BOARD_INSTRUMENT_LABELS: Record<string, string> = {
  cloud: "Cloud",
  rendr: "Rendr",
}

export type DirectorSendPhase = "instrument" | "director"

/** Pinned chip wins; otherwise honor "Cloud — …" / "Ceox — …" style addressing. */
export function resolveDirectorInstrument(params: {
  pinned: BoardInstrumentSlug | null
  userMessage: string
  knownSlugs: string[]
}): BoardInstrumentSlug | null {
  if (params.pinned) return params.pinned
  if (!params.knownSlugs.length) return null
  const escaped = params.knownSlugs
    .map((slug) => slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")
  const pattern = new RegExp(`^(${escaped})\\s*(?:[—\\-:,]|,\\s*)`, "i")
  const match = params.userMessage.trim().match(pattern)
  if (!match) return null
  return match[1].toLowerCase()
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
    `If they ask you to name an item from the Dialog Document / a Path, quote ONLY a title or preview from the DIALOG DOCUMENT Points block in your system prompt. Never invent a title. Never treat a system-rule heading as a Document item. If you cannot find a matching Point, say you cannot name one.`,
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
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable — they are in context.`,
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
    `Reply as Lead (${params.directorName}). Be honest about the empty consultation.`,
    `- Say plainly that you reached out to ${params.instrumentLabel} and got nothing back.`,
    `- Do NOT invent, paraphrase, or role-play ${params.instrumentLabel}'s voice or opinion.`,
    `- Do NOT claim ${params.instrumentLabel} said, decided, or agreed to anything.`,
    `- Answer the user's question from your own knowledge only, and mark that clearly if you do.`,
    `- Do NOT claim this session starts cold or that earlier thread turns are unavailable.`,
    `- Stay brief and useful.`,
  ].join("\n")
}

export function buildCastConsultationsSynthesisPrompt(params: {
  userMessage: string
  directorName: string
  consultations: Array<{
    label: string
    reply: string | null
    status: "ok" | "empty" | "failed" | "error"
  }>
}): string {
  const lines = [
    `[Cast consultation synthesis — ${params.directorName}]`,
    `The user asked:`,
    `"${params.userMessage.trim()}"`,
    "",
    "Real consultation results (use ONLY these — never invent missing voices):",
  ]
  for (const row of params.consultations) {
    if (row.status === "ok" && row.reply?.trim()) {
      lines.push(`- ${row.label}: "${row.reply.trim()}"`)
    } else {
      lines.push(`- ${row.label}: (nothing returned — say you got nothing back)`)
    }
  }
  lines.push(
    "",
    `Reply as Lead (${params.directorName}).`,
    "- Attribute a quote or stance to a cast member ONLY when a real reply is listed above.",
    "- If a cast member returned nothing, say plainly you got nothing back from them.",
    "- Never invent, paraphrase-as-quote, or fabricate another agent's words.",
    "- Do not invent unanimous consensus. If replies disagree or are empty, say so plainly.",
    "- When the user asked for a Document Path item, only relay titles that appear in a real consult reply or in the DIALOG DOCUMENT Points block — never invent a shared title.",
    "- Stay brief; collapse each consult into a minimal beat.",
  )
  return lines.join("\n")
}

const DIRECTOR_INTERNAL_PROMPT_PATTERN = /^\[Director (delegation|synthesis)/

/** True when persisted session text is orchestration input, not the user's words. */
export function isDirectorInternalPrompt(content: string): boolean {
  return DIRECTOR_INTERNAL_PROMPT_PATTERN.test(content.trim())
}

/** Recover the user's words from a stored director prompt (quoted line in prompt body). */
export function userFacingContentFromDirectorPrompt(content: string): string | null {
  if (!isDirectorInternalPrompt(content)) return null
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
      return trimmed.slice(1, -1)
    }
  }
  return null
}

/** Map persisted user rows back to what the human actually typed. */
export function sanitizeUserMessageContent(content: string): string {
  return userFacingContentFromDirectorPrompt(content) ?? content
}

/** Never show orchestration failure copy in the Dialog UI. */
export function isDirectorDelegationFailureContent(content: string): boolean {
  return /did not respond this turn/i.test(content.trim())
}

const RAW_ACTION_JSON_PATTERN =
  /^\s*\{\s*"type"\s*:\s*"(?:sole\.save|draft\.(?:create|update|update\.propose)|moment\.create|treatment\.propose)"/i

/** Hide bare action JSON that leaked into persisted message content. */
export function sanitizeAgentMessageContent(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return trimmed
  if (RAW_ACTION_JSON_PATTERN.test(trimmed)) return ""
  if (trimmed.startsWith("{") && trimmed.includes('"type"') && trimmed.includes('"payload"')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      const type = typeof parsed.type === "string" ? parsed.type : ""
      if (type && type !== "agent_output" && !("response" in parsed)) {
        return ""
      }
    } catch {
      /* not JSON — show as-is */
    }
  }
  return content
}

export function buildInstrumentUnavailableDelegationBeat(params: {
  instrumentLabel: string
}): DirectorDelegationBeat {
  return {
    attributedTo: params.instrumentLabel,
    status: "failed",
    content: `${params.instrumentLabel} couldn't respond this turn. Kip answered using platform knowledge instead.`,
  }
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

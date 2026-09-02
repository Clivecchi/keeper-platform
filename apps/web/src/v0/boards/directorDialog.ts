/**
 * Director dialog — cueing helpers for Universal Board IDE preset.
 * Lead (Kip) owns the composer; Cast members run as delegated sub-turns.
 */

export {
  extractKeeperAdviceCardFromRunResult,
  isDirectorContinuityPhrase,
  resolveDirectorDelegationMessage,
  type DirectorContinuityMessage,
} from "@keeper/shared"

import { withoutAdviseOnlySkips } from "@keeper/shared"

import type { DirectorDelegationBeat } from "../../components/agent/types"

/** Agent slug delegated by Lead on directed-cueing boards (IDE tools or domain lead agents). */
export type CastMemberSlug = string

export type DialogParticipationMode = "voice" | "support_only" | "silent"

export type DirectorDialogConfig = {
  /** Lead/director slug — never consulted as cast (avoids self-duplicate turns). */
  directorAgentSlug?: string
  activeCastMember: CastMemberSlug | null
  /** Domain/Realm multi-select — cue each engaged cast member for real minimal input. */
  cuedCastSlugs?: CastMemberSlug[]
  castLabels: Record<string, string>
  /** Declared participation per slug — support_only / silent skip Dialog-voice fetches. */
  castParticipation?: Record<string, DialogParticipationMode>
  directorDisplayName: string
}

export function resolveCastParticipation(
  config: DirectorDialogConfig | undefined,
  slug: string,
): DialogParticipationMode {
  const key = slug.trim().toLowerCase()
  const fromConfig = config?.castParticipation?.[key]
  if (fromConfig === "voice" || fromConfig === "support_only" || fromConfig === "silent") {
    return fromConfig
  }
  return "voice"
}

export const CAST_MEMBER_LABELS: Record<string, string> = {
  cloud: "Cloud",
  rendr: "Rendr",
}

export type DirectorSendPhase = "cast" | "director"

/** Pinned chip wins; otherwise honor "Cloud — …" / "Ceox — …" style addressing. */
export function resolveDirectorCastMember(params: {
  pinned: CastMemberSlug | null
  userMessage: string
  knownSlugs: string[]
}): CastMemberSlug | null {
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

export function buildCastDelegationPrompt(params: {
  userMessage: string
  instrumentLabel: string
  directorName: string
}): string {
  return [
    `[Director delegation — ${params.instrumentLabel} on the Build board]`,
    `The user addressed ${params.instrumentLabel} (Cast member pinned on the Build board).`,
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
    `The user addressed ${params.instrumentLabel} on the Build board.`,
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
    "- The Dialog UI already shows each cast member's real reply as their own voice card.",
    "- Your reply is Lead synthesis only — do NOT re-quote or roll-call their full answers.",
    "- Attribute a stance to a cast member ONLY when a real reply is listed above.",
    "- If a cast member returned nothing, say plainly you got nothing back from them.",
    "- Never invent, paraphrase-as-quote, or fabricate another agent's words.",
    "- Do not invent unanimous consensus. If replies disagree or are empty, say so plainly.",
    "- When the user asked for a Document Path item, only relay titles that appear in a real consult reply or in the DIALOG DOCUMENT Points block — never invent a shared title.",
    "- Stay brief. Prefer a short synthesis plus an optional keeper-card summary — not a nested voice list.",
  )
  return lines.join("\n")
}

const DIRECTOR_INTERNAL_PROMPT_PATTERN = /^\[Director (delegation|synthesis)/
const AGENT_ECHO_INTERNAL_PROMPT_PATTERN = /^\[Agent Echo — supporting role\]/
const PLATFORM_COLLABORATION_PROMPT_PATTERN = /^\[Platform collaboration —/

/** Kip support turn after a domain lead reply — act, don't offer hanging help. */
export function buildDomainCollaborationPrompt(params: {
  userMessage: string
  leadName: string
  leadReply: string
}): string {
  return [
    `[Platform collaboration — Kip]`,
    `The user asked: "${params.userMessage}"`,
    `${params.leadName} (domain lead) responded: "${params.leadReply}"`,
    ``,
    `You are Keeper platform support — not the lead voice.`,
    `Defer relationship and strategy voice to ${params.leadName}.`,
    `Default: return empty. Stay silent.`,
    `Only speak if you have a brief platform fact ${params.leadName} missed — one or two sentences, no Document writes.`,
    `Do NOT create drafts, Points, or reorganize the Document. Lead owns those writes.`,
    `Do NOT re-answer the user's question or correct the lead.`,
    `Never create a draft because the lead described an empty Document or said there are no Points yet.`,
    `Empty is valid and preferred.`,
  ].join("\n")
}

/** True when persisted session text is director orchestration input, not the user's words. */
export function isDirectorInternalPrompt(content: string): boolean {
  return DIRECTOR_INTERNAL_PROMPT_PATTERN.test(content.trim())
}

/** True when persisted session text is Agent Echo / Kip-collaboration scaffold input. */
export function isEchoInternalPrompt(content: string): boolean {
  const trimmed = content.trim()
  return (
    AGENT_ECHO_INTERNAL_PROMPT_PATTERN.test(trimmed)
    || PLATFORM_COLLABORATION_PROMPT_PATTERN.test(trimmed)
  )
}

/** True when persisted session text is orchestration input, not the user's words. */
export function isInternalOrchestrationPrompt(content: string): boolean {
  return isDirectorInternalPrompt(content) || isEchoInternalPrompt(content)
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

/**
 * Map persisted user rows back to what the human actually typed.
 * Echo / platform-collaboration scaffolds have no human utterance — hide them.
 */
export function sanitizeUserMessageContent(content: string): string {
  if (isEchoInternalPrompt(content)) return ""
  return userFacingContentFromDirectorPrompt(content) ?? content
}

/** Never show orchestration failure copy in the Dialog UI. */
export function isDirectorDelegationFailureContent(content: string): boolean {
  return /did not respond this turn/i.test(content.trim())
}

/**
 * Echo / Kip support is offstage unless it returned real substance.
 * Empty and failed must not paint a voice card or `_(failed)_`.
 */
export function shouldAttachEcho(params: {
  content: string
  status: DirectorDelegationBeat["status"]
}): boolean {
  if (params.status !== "ok") return false
  const body = params.content.trim()
  if (!body) return false
  if (isDirectorDelegationFailureContent(body)) return false
  return true
}

const RAW_ACTION_JSON_PATTERN =
  /^\s*\{\s*"type"\s*:\s*"(?:sole\.save|draft\.(?:create|update|update\.propose)|moment\.create|treatment\.propose)"/i

/** Hide bare action JSON that leaked into persisted message content. */
export function sanitizeAgentMessageContent(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return trimmed
  if (RAW_ACTION_JSON_PATTERN.test(trimmed)) return ""
  const withoutExecutorLeak = trimmed
    .replace(/\s*I attempted draft work, but it did not complete:[\s\S]*$/i, "")
    .replace(/\s*I attempted an action, but it failed:[\s\S]*$/i, "")
    .replace(/\s*I could not add Points:[^\n]*$/i, "")
    .split(/\n\n+/)
    .filter((paragraph) => !/prisma\.|Error creating UUID|Inconsistent column data|invalid prisma|EXECUTION_ERROR/i.test(paragraph))
    .join("\n\n")
    .trim()
  if (withoutExecutorLeak !== trimmed) {
    return withoutExecutorLeak
  }
  if (trimmed.startsWith("{") && trimmed.includes('"type"')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      const type = typeof parsed.type === "string" ? parsed.type : ""
      if (type === "agent_output") {
        const response = typeof parsed.response === "string" ? parsed.response.trim() : ""
        return response
      }
      if (type && type !== "agent_output" && !("response" in parsed)) {
        return ""
      }
    } catch {
      /* not JSON — show as-is */
    }
  }
  const embedded = unwrapEmbeddedAgentOutput(trimmed)
  return embedded !== trimmed ? embedded : content
}

function unwrapEmbeddedAgentOutput(content: string): string {
  const markerMatch = content.match(/"type"\s*:\s*"agent_output"/)
  if (!markerMatch || markerMatch.index == null) return content
  const idx = markerMatch.index
  if (idx < 0) return content
  const start = content.lastIndexOf("{", idx)
  if (start < 0) return content
  let depth = 0
  let end = -1
  for (let i = start; i < content.length; i++) {
    const ch = content[i]
    if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end < 0) return content
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>
    if (parsed?.type !== "agent_output") return content
    const response = typeof parsed.response === "string" ? parsed.response.trim() : ""
    if (!response) return content
    return `${content.slice(0, start)}${response}${content.slice(end + 1)}`.trim()
  } catch {
    return content
  }
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
      if (nested) return sanitizeAgentMessageContent(nested)
    }
    const direct = readResponseString(l1.response)
    if (direct) return sanitizeAgentMessageContent(direct)
  }

  const rootResponse = readResponseString(root.response)
  return rootResponse ? sanitizeAgentMessageContent(rootResponse) : null
}

/**
 * Pull executed action receipts from a cast/Lead runAgent response envelope.
 * Cast-consult used to keep only extractAgentReplyFromRunResult — this restores
 * the same actionResults Lead attaches so receipts reach the Dialog UI.
 *
 * Walks nested `data` (KipApi AgentResponse → lead/system payload) the same way
 * as apps/api extractActionResultsFromAgentRunResult.
 */
export function extractActionResultsFromRunResult(result: unknown): unknown[] {
  const visit = (node: unknown, depth = 0): unknown[] | null => {
    if (!node || typeof node !== "object" || depth > 5) return null
    const obj = node as Record<string, unknown>
    if (Array.isArray(obj.actions)) return obj.actions
    if (obj.data !== undefined) return visit(obj.data, depth + 1)
    return null
  }
  return visit(result) ?? []
}

/** Tag cast-run receipts so UI can attribute them without changing type/status. */
export function annotateCastActionResults(
  actions: unknown[],
  attribution: { castSlug: string; attributedTo: string },
): unknown[] {
  return actions.map((action) => {
    if (!action || typeof action !== "object" || Array.isArray(action)) return action
    const row = action as Record<string, unknown>
    const data =
      row.data && typeof row.data === "object" && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {}
    return {
      ...row,
      data: {
        ...data,
        castSlug: attribution.castSlug,
        attributedTo: attribution.attributedTo,
      },
    }
  })
}

function rowHasCastSlug(row: unknown): boolean {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false
  const data = (row as { data?: { castSlug?: unknown } }).data
  return typeof data?.castSlug === "string" && data.castSlug.trim().length > 0
}

function actionTypeOf(row: unknown): string {
  if (!row || typeof row !== "object" || Array.isArray(row)) return ""
  return typeof (row as { type?: unknown }).type === "string"
    ? (row as { type: string }).type
    : ""
}

function actionDataOf(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null
  const data = (row as { data?: unknown }).data
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  return data as Record<string, unknown>
}

/** Prefer the richer of two same-type cast receipts (e.g. keep treatment.proposal). */
function pickRicherCastReceipt(leadRow: unknown, castRow: unknown): unknown {
  const leadData = actionDataOf(leadRow)
  const castData = actionDataOf(castRow)
  if (!castData) return leadRow
  if (!leadData) return castRow
  const leadHasProposal = Boolean(leadData.proposal && typeof leadData.proposal === "object")
  const castHasProposal = Boolean(castData.proposal && typeof castData.proposal === "object")
  if (!leadHasProposal && castHasProposal) return castRow
  const leadKeys = Object.keys(leadData).length
  const castKeys = Object.keys(castData).length
  return castKeys > leadKeys ? castRow : leadRow
}

/**
 * Prefer Lead `actions` when the server already folded cast receipts.
 * Otherwise prepend client-held cast receipts so Domain/IDE still show cards.
 * When Lead fold dropped nested payload (e.g. treatment.proposal), revive from client.
 */
export function mergeCastAndLeadActionResults(
  leadActions: unknown[] | undefined,
  castActions: unknown[],
): unknown[] | undefined {
  const merged = (() => {
    if (leadActions?.length) {
      const leadHasCastReceipts = leadActions.some(rowHasCastSlug)
      if (!leadHasCastReceipts) {
        return castActions.length ? [...castActions, ...leadActions] : leadActions
      }
      if (!castActions.length) return leadActions

      const usedCast = new Set<number>()
      const folded = leadActions.map((leadRow) => {
        if (!rowHasCastSlug(leadRow)) return leadRow
        const leadType = actionTypeOf(leadRow)
        const leadSlug = actionDataOf(leadRow)?.castSlug
        const matchIdx = castActions.findIndex((castRow, idx) => {
          if (usedCast.has(idx)) return false
          if (actionTypeOf(castRow) !== leadType) return false
          const castSlug = actionDataOf(castRow)?.castSlug
          return !leadSlug || !castSlug || leadSlug === castSlug
        })
        if (matchIdx < 0) return leadRow
        usedCast.add(matchIdx)
        return pickRicherCastReceipt(leadRow, castActions[matchIdx])
      })
      const leftovers = castActions.filter((_, idx) => !usedCast.has(idx))
      return leftovers.length ? [...leftovers, ...folded] : folded
    }
    return castActions.length ? castActions : undefined
  })()
  if (!merged?.length) return merged
  const visible = withoutAdviseOnlySkips(merged)
  return visible.length ? visible : undefined
}

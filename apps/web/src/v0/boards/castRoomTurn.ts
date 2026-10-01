/**
 * Progressive Cast Room on the client.
 * Offers are cheap. A full contribution happens only when the Lead engages one voice.
 */
import {
  CAST_ROOM_CONTRIBUTION_CAP,
  castRoomEvent,
  parseCastRoomEngage,
  projectCastRoomTrail,
  type CastRoomConsumption,
  type CastRoomEvent,
  type CastRoomOfferLine,
} from "@keeper/shared"
import { KipApi } from "../../lib/kipApi"
import { buildCastDelegationPrompt, extractAgentReplyFromRunResult } from "./directorDialog"

type OfferResponse = {
  slug?: string
  offer?: string
  offeringId?: string
  promptTokens?: number | null
  completionTokens?: number | null
  latencyMs?: number | null
}

export type CastRoomConsultation = {
  instrumentSlug: string
  instrumentReply: string | null
  status: "ok" | "empty" | "failed" | "error"
  actionResults?: unknown[]
}

export type CastRoomTurnResult = {
  consultations: CastRoomConsultation[]
  trace: CastRoomEvent[]
  consumption: CastRoomConsumption[]
  trail: string
  decision: string
}

function unwrapData(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== "object") return {}
  const record = result as Record<string, unknown>
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    const inner = record.data as Record<string, unknown>
    if (inner.data && typeof inner.data === "object" && !Array.isArray(inner.data)) {
      return inner.data as Record<string, unknown>
    }
    return inner
  }
  return record
}

export async function runProgressiveCastRoom(params: {
  voices: Array<{ slug: string; label: string }>
  userMessage: string
  directorName: string
  directorSlug: string
  humanTurnId: string
  dialogId?: string
  sessionId?: string
  domainId?: string
  userId?: string
  previousTrace: CastRoomEvent[]
  leadAgentId: string
  runAgentContext: Record<string, unknown>
  onStatus?: (label: string) => void
}): Promise<CastRoomTurnResult> {
  const where = {
    humanTurnId: params.humanTurnId,
    dialogId: params.dialogId,
    sessionId: params.sessionId,
    domainId: params.domainId,
  }
  const trace: CastRoomEvent[] = [
    castRoomEvent({
      actor: { kind: "human" },
      what: "spoke",
      ...where,
      label: params.userMessage.trim().slice(0, 180),
    }),
  ]
  const consumption: CastRoomConsumption[] = []
  let contributions = 0

  const trailForOffers = projectCastRoomTrail(trace, params.previousTrace)
  params.onStatus?.(`Hearing ${params.voices.length} offers…`)
  const offers: CastRoomOfferLine[] = await Promise.all(
    params.voices.map(async (voice) => {
      try {
        const raw = await KipApi.castOffer({
          slug: voice.slug,
          label: voice.label,
          userMessage: params.userMessage,
          trail: trailForOffers,
          domainId: params.domainId,
          userId: params.userId,
        })
        const data = unwrapData(raw) as OfferResponse
        const offer = typeof data.offer === "string" ? data.offer.trim() : ""
        const offeringId = typeof data.offeringId === "string" ? data.offeringId : "cast_offer"
        consumption.push({
          role: "offer",
          slug: voice.slug,
          offeringId,
          promptTokens: typeof data.promptTokens === "number" ? data.promptTokens : null,
          completionTokens: typeof data.completionTokens === "number" ? data.completionTokens : null,
          latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : null,
          estimatedCost: null,
        })
        if (offer) {
          trace.push(castRoomEvent({
            actor: { kind: "agent", slug: voice.slug },
            what: "offered",
            ...where,
            label: offer,
          }))
        }
        return { slug: voice.slug, label: voice.label, offer }
      } catch {
        params.onStatus?.(`${voice.label} — offer did not return.`)
        return { slug: voice.slug, label: voice.label, offer: "" }
      }
    }),
  )

  const directionTrail = projectCastRoomTrail(trace, params.previousTrace)
  params.onStatus?.(`${params.directorName} is choosing who speaks…`)
  const direction = await KipApi.runAgent(
    params.leadAgentId,
    params.userMessage,
    params.userId,
    params.sessionId,
    {
      domainId: params.domainId,
      dialogId: params.dialogId,
      humanTurnId: params.humanTurnId,
      ephemeral: true,
      agentContext: {
        ...params.runAgentContext,
        skipDelegateConsult: true,
        castRoom: {
          phase: "direct",
          trail: directionTrail,
          offers,
          allowEngage: contributions < CAST_ROOM_CONTRIBUTION_CAP,
          trace,
          consumption,
        },
      },
    },
  )
  const directionData = unwrapData(direction)
  const decision = extractAgentReplyFromRunResult(direction)?.trim()
    || (typeof directionData.response === "string" ? directionData.response.trim() : "")
  const engage = parseCastRoomEngage(directionData.engage)
  const allowed = engage && params.voices.some((voice) => voice.slug === engage.slug)
    ? engage
    : null

  const consultations: CastRoomConsultation[] = []
  if (allowed && contributions < CAST_ROOM_CONTRIBUTION_CAP) {
    const voice = params.voices.find((row) => row.slug === allowed.slug)!
    trace.push(castRoomEvent({
      actor: { kind: "agent", slug: params.directorSlug || "lead" },
      what: "directed",
      ...where,
      label: `${allowed.slug}: ${allowed.aim}`,
    }))
    params.onStatus?.(`${voice.label} is contributing…`)
    try {
      const castAgent = await KipApi.getAgentBySlug(voice.slug)
      const trailNow = projectCastRoomTrail(trace, params.previousTrace)
      const castResult = await KipApi.runAgent(
        castAgent.id,
        `${buildCastDelegationPrompt({
          userMessage: params.userMessage,
          instrumentLabel: voice.label,
          directorName: params.directorName,
        })}\n\nRoom trail:\n${trailNow}\n\nLead aim: ${allowed.aim}`,
        params.userId,
        params.sessionId,
        {
          domainId: params.domainId,
          dialogId: params.dialogId,
          humanTurnId: params.humanTurnId,
          ephemeral: true,
          agentContext: { ...params.runAgentContext, skipDelegateConsult: true },
        },
      )
      const reply = extractAgentReplyFromRunResult(castResult)?.trim() || ""
      if (reply) {
        contributions += 1
        trace.push(castRoomEvent({
          actor: { kind: "agent", slug: voice.slug },
          what: "contributed",
          ...where,
          label: reply.slice(0, 180),
        }))
        consultations.push({
          instrumentSlug: voice.slug,
          instrumentReply: reply,
          status: "ok",
        })
      } else {
        consultations.push({
          instrumentSlug: voice.slug,
          instrumentReply: null,
          status: "empty",
        })
      }
    } catch {
      consultations.push({
        instrumentSlug: voice.slug,
        instrumentReply: null,
        status: "failed",
      })
    }
  }

  trace.push(castRoomEvent({
    actor: { kind: "agent", slug: params.directorSlug || "lead" },
    what: "resolved",
    ...where,
  }))
  trace.push(castRoomEvent({
    actor: { kind: "runtime" },
    what: "presented",
    ...where,
  }))

  return {
    consultations,
    trace,
    consumption,
    trail: projectCastRoomTrail(trace, params.previousTrace),
    decision,
  }
}

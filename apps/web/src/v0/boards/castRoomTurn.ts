/**
 * Progressive Cast Room on the client.
 * Offers are cheap. A full contribution happens only when the Lead engages one voice.
 */
import {
  CAST_ROOM_CONTRIBUTION_CAP,
  CAST_ROOM_DIRECTION_REF,
  CAST_ROOM_CONTRIBUTION_REF,
  aimIsSatisfied,
  contributionDeniesDocumentAccess,
  buildSpecialistAssignmentBlock,
  castRoomEvent,
  classifyActionReceipt,
  continueOrPresent,
  contributionMatchesDirection,
  humanRequestedArtifact,
  parseCastRoomEngage,
  parseLeadAssessment,
  projectCastRoomTrail,
  type AgencyLoopOutcome,
  type CastRoomConsumption,
  type CastRoomEvent,
  type CastRoomOfferLine,
  type ClassifiedReceipt,
  type ConversationProfile,
  type LeadAssessment,
} from "@keeper/shared"
import { KipApi } from "../../lib/kipApi"
import {
  buildCastDelegationPrompt,
  extractActionResultsFromRunResult,
  extractAgentReplyFromRunResult,
} from "./directorDialog"

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
  directionId?: string
  /** False when the contribution did not satisfy its direction. */
  satisfied?: boolean
}

export type CastRoomTurnResult = {
  consultations: CastRoomConsultation[]
  trace: CastRoomEvent[]
  consumption: CastRoomConsumption[]
  trail: string
  decision: string
  outcome: AgencyLoopOutcome
  /** True only when the directed aim was met. Presentation is separate. */
  resolved: boolean
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
  profile?: ConversationProfile
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

  let decision = ""
  let outcome: AgencyLoopOutcome = "undirected"
  let resolveObjective = false
  const consultations: CastRoomConsultation[] = []
  const artifactRequested = humanRequestedArtifact(params.userMessage)
  const profileName = params.profile === "agency" ? "Agency" : "Cast"

  while (contributions < CAST_ROOM_CONTRIBUTION_CAP) {
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
        displayContent: params.userMessage,
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
    const directionText = extractAgentReplyFromRunResult(direction)?.trim()
      || (typeof directionData.response === "string" ? directionData.response.trim() : "")
    if (directionText) decision = directionText
    const engage = parseCastRoomEngage(directionData.engage)
    const allowed = engage && params.voices.some((voice) => voice.slug === engage.slug)
      ? engage
      : null
    if (!allowed) break

    const voice = params.voices.find((row) => row.slug === allowed.slug)!
    const directionEvent = castRoomEvent({
      actor: { kind: "agent", slug: params.directorSlug || "lead" },
      what: "directed",
      ...where,
      label: `${allowed.slug}: ${allowed.aim}`,
    })
    trace.push(directionEvent)
    params.onStatus?.(`${voice.label} is contributing…`)

    let reply = ""
    let failed = false
    let rawActions: unknown[] = []
    try {
      const castAgent = await KipApi.getAgentBySlug(voice.slug)
      const castResult = await KipApi.runAgent(
        castAgent.id,
        `${buildCastDelegationPrompt({
          userMessage: params.userMessage,
          instrumentLabel: voice.label,
          directorName: params.directorName,
        })}\n\n${buildSpecialistAssignmentBlock({
          aim: allowed.aim,
          directionId: directionEvent.id,
          priorTrail: projectCastRoomTrail(trace, params.previousTrace),
        })}`,
        params.userId,
        params.sessionId,
        {
          domainId: params.domainId,
          dialogId: params.dialogId,
          humanTurnId: params.humanTurnId,
          displayContent: params.userMessage,
          ephemeral: true,
          agentContext: { ...params.runAgentContext, skipDelegateConsult: true },
        },
      )
      reply = extractAgentReplyFromRunResult(castResult)?.trim() || ""
      rawActions = extractActionResultsFromRunResult(castResult)
    } catch {
      failed = true
    }

    const receipts: ClassifiedReceipt[] = rawActions.flatMap((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return []
      const classified = classifyActionReceipt(row as { type?: unknown; status?: unknown; message?: unknown })
      return classified ? [classified] : []
    })
    const substanceLabel = (
      reply || receipts.map((receipt) => `${receipt.type} ${receipt.standing}`).join("; ")
    ).slice(0, 180)
    let contributionEvent: CastRoomEvent | null = null
    if (substanceLabel) {
      contributionEvent = castRoomEvent({
        actor: { kind: "agent", slug: voice.slug },
        what: "contributed",
        ...where,
        label: substanceLabel,
        refs: [{ kind: CAST_ROOM_DIRECTION_REF, id: directionEvent.id }],
      })
      trace.push(contributionEvent)
      for (const receipt of receipts) {
        const receiptLabel = [receipt.type, receipt.standing, receipt.message].filter(Boolean).join(" — ")
        trace.push(castRoomEvent({
          actor: { kind: "agent", slug: voice.slug },
          what: "acted",
          ...where,
          label: receiptLabel.slice(0, 180),
          refs: [
            { kind: CAST_ROOM_CONTRIBUTION_REF, id: contributionEvent.id },
            { kind: CAST_ROOM_DIRECTION_REF, id: directionEvent.id },
          ],
        }))
      }
    }

    contributions += 1
    const correlated = contributionEvent
      ? contributionMatchesDirection(contributionEvent, directionEvent)
      : false
    const hasSubstance = Boolean(substanceLabel)
    let assessment: LeadAssessment | null = null
    if (hasSubstance && correlated && !failed) {
      params.onStatus?.(`${params.directorName} is checking the contribution…`)
      try {
        const evaluation = await KipApi.runAgent(
          params.leadAgentId,
          params.userMessage,
          params.userId,
          params.sessionId,
          {
            domainId: params.domainId,
            dialogId: params.dialogId,
            humanTurnId: params.humanTurnId,
            displayContent: params.userMessage,
            ephemeral: true,
            agentContext: {
              ...params.runAgentContext,
              skipDelegateConsult: true,
              castRoom: {
                phase: "evaluate",
                trail: projectCastRoomTrail(trace, params.previousTrace),
                allowEngage: false,
                trace,
                consumption,
                assignment: {
                  directionId: directionEvent.id,
                  aim: allowed.aim,
                  slug: allowed.slug,
                  reply: reply.slice(0, 2000),
                  receipts,
                },
              },
            },
          },
        )
        assessment = parseLeadAssessment(unwrapData(evaluation).assessment)
      } catch {
        assessment = null
      }
    }

    const satisfied = aimIsSatisfied({
      assessment,
      receipts,
      artifactRequested,
      contributionReply: reply,
    }) && !contributionDeniesDocumentAccess(reply)
    const step = continueOrPresent({
      contributionsUsed: contributions,
      hasSubstance,
      correlated,
      failed,
      satisfied,
      leadBlocked: assessment?.outcome === "blocked" && !satisfied,
    })
    outcome = step.outcome
    resolveObjective = step.resolve
    consultations.push({
      instrumentSlug: voice.slug,
      instrumentReply: reply || null,
      status: failed ? "failed" : reply || receipts.length ? "ok" : "empty",
      ...(rawActions.length ? { actionResults: rawActions } : {}),
      directionId: directionEvent.id,
      satisfied,
    })
    if (step.step === "present") break
  }

  if (resolveObjective) {
    trace.push(castRoomEvent({
      actor: { kind: "agent", slug: params.directorSlug || "lead" },
      what: "resolved",
      ...where,
      label: `${profileName} — aim met`,
    }))
  }
  trace.push(castRoomEvent({
    actor: { kind: "runtime" },
    what: "presented",
    ...where,
    label: `${profileName} — ${outcome}`,
  }))

  return {
    consultations,
    trace,
    consumption,
    trail: projectCastRoomTrail(trace, params.previousTrace),
    decision,
    outcome,
    resolved: resolveObjective,
  }
}

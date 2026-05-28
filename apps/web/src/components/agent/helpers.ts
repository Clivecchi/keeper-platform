/**
 * Shared helpers for agent components.
 * Extracted from KipAgentBoardPage for reuse across legacy and new Agent Board.
 */

import type { DraftPoint } from "@keeper/shared"
import type { AgentDialogueMessage } from "./types"
import { normalizeActionReceipt } from "./types"
import type { LinkedCardProps } from "../../types/props"

export function extractLinkedCard(metadata: unknown): LinkedCardProps | undefined {
  if (!metadata) return undefined
  let payload: Record<string, unknown> | null = null
  if (typeof metadata === "string") {
    try {
      payload = JSON.parse(metadata) as Record<string, unknown>
    } catch {
      return undefined
    }
  } else if (metadata && typeof metadata === "object") {
    payload = metadata as Record<string, unknown>
  }
  if (!payload) return undefined
  const linked = (payload.linkedCard ?? payload.linked_card) as Record<string, unknown> | undefined
  if (!linked || typeof linked !== "object") return undefined
  if (!linked.title || !linked.entityType || !linked.href) return undefined
  const previewCandidate = linked.preview
  const preview =
    previewCandidate && typeof previewCandidate === "object"
      ? {
          image: (previewCandidate as Record<string, unknown>).image,
          date: (previewCandidate as Record<string, unknown>).date,
          snippet: (previewCandidate as Record<string, unknown>).snippet,
        }
      : undefined
  return {
    entityType: linked.entityType as LinkedCardProps["entityType"],
    entityId: (linked.entityId ?? linked.id ?? linked.href) as string,
    title: linked.title as string,
    subtitle: linked.subtitle as string | undefined,
    description: linked.description as string | undefined,
    href: linked.href as string,
    icon: linked.icon as string | undefined,
    color: linked.color as string | undefined,
    preview,
  }
}

export const formatDate = (value: string): string => {
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export const formatTime = (value: string): string => {
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export const formatRelative = (value: string): string => {
  const date = new Date(value)
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export const shortId = (id: string): string => id.slice(0, 6).toUpperCase()

/** After accept API succeeds, update propose receipts so Accept does not reappear on reload-in-session. */
export function patchAcceptedDraftPointInMessages(
  messages: AgentDialogueMessage[],
  draftId: string,
  pointId: string,
  updatedPoint?: DraftPoint,
): AgentDialogueMessage[] {
  return messages.map((msg) => {
    if (!msg.actionResults?.length) return msg

    let changed = false
    const nextResults = msg.actionResults.map((ar) => {
      const receipt = normalizeActionReceipt(ar)
      if (receipt.type !== "draft.update.propose" || receipt.status !== "success") return ar

      const data = receipt.data as { draftId?: string; point?: DraftPoint } | undefined
      if (data?.draftId !== draftId || data?.point?.id !== pointId) return ar

      changed = true
      const point = updatedPoint ?? { ...data.point!, status: "accepted" as const }
      return {
        ...ar,
        status: "success" as const,
        data: { ...data, point },
      }
    })

    return changed ? { ...msg, actionResults: nextResults } : msg
  })
}

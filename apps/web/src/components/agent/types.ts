/**
 * Shared types for agent components.
 * Extracted from KipAgentBoardPage for reuse across legacy and new Agent Board.
 */

import type { LinkedCardProps } from "../../types/props"
import type { GlossThread } from "@keeper/shared"

export type DirectorDelegationStatus = "ok" | "failed" | "empty"

/**
 * Agent echo — Dialog Response attached beneath another agent's message.
 * Persisted on the primary kip_message as `metadata.echo` (same beat shape as
 * castVoices / delegation rows; separate system from Voice Cards).
 */
export interface DialogResponseEcho {
  content: string
  attributedTo?: string
  /** ok = prose echo; empty = intentional silence; failed = inference error. */
  status?: DirectorDelegationStatus
}

/** Board instrument reply shown above Lead content in director mode. */
export type DirectorDelegationBeat = DialogResponseEcho

export interface AgentDialogueMessage {
  id: string
  /**
   * `user` / `agent` — conversation turns.
   * `system` — platform/runtime errors (timeouts, provider failures). Never styled as agent speech.
   */
  role: "user" | "agent" | "system"
  content: string
  createdAt: string
  /** Resolved display name for the sender — supports multi-user / multi-agent history. */
  senderName?: string
  /** Optional agent echo — supporting Dialog Response beneath the primary agent message. */
  echo?: DialogResponseEcho
  /** Director mode — instrument reply above Lead content (Cloud, Rendr, …). */
  delegation?: DirectorDelegationBeat
  /**
   * Multi-select cast consultation — one equal voice beat per engaged instrument.
   * Prefer this over a single `delegation` when present so every agent stands alone.
   */
  castVoices?: ReadonlyArray<DirectorDelegationBeat & { slug?: string }>
  /**
   * Domain/Realm multi-select — collaborators engaged for this turn (UI stamp).
   * Prefer `castVoices` for real per-agent replies; this stamp remains for legacy turns.
   */
  engagedCollaborators?: ReadonlyArray<{ slug: string; label: string }>
  linkedCard?: LinkedCardProps
  /** Structured keeper-card from message metadata (preferred over content fences). */
  keeperCard?: {
    type: string
    title: string
    body?: string
    meta?: string
    items?: string[]
  }
  /**
   * Dialog Document deep-link for chronicle_update chips / Known Issue cards.
   * Persisted on kip_messages.metadata.chronicleChip.
   */
  chronicleChip?: {
    dialogId: string
    dialogTitle: string
    actor: string
    anchor?: {
      dialogId?: string
      manuscriptDraftId?: string
      pointId?: string
      entityId?: string
      entityKind?: string
      breadcrumb?: string[]
    }
  }
  actionResults?: Array<{
    type: string
    ok?: boolean
    status?: "success" | "error" | "skipped"
    message?: string
    errorCode?: string
    result?: {
      draft?: { id: string; title: string; kind: string; key: string }
      links?: { open: string }
      entityIds?: string[]
      message?: string
      [key: string]: unknown
    }
    error?: { code?: string; message: string; details?: any }
    data?: {
      entityIds?: string[]
      draft?: { id: string; title: string; kind: string; key: string }
      links?: { open?: string; edit?: string }
      [key: string]: unknown
    }
  }>
  /** Optional realm arrival — invitation buttons rendered inside the agent bubble. */
  arrivalInvitations?: Array<{ id: string; label: string }>
  /** Inline gloss sub-conversations anchored to nodes within this message */
  glossThreads?: GlossThread[]
}

export interface DialogueMetaItem {
  label: string
  value: string
}

/**
 * Normalize action result from API format to standardized receipt format.
 */
export function normalizeActionReceipt(actionResult: {
  type: string
  ok?: boolean
  status?: "success" | "error" | "skipped"
  message?: string
  errorCode?: string
  result?: {
    draft?: { id: string; title: string; kind: string; key: string }
    links?: { open: string }
    entityIds?: string[]
    message?: string
    [key: string]: unknown
  }
  error?: { code?: string; message: string; details?: any }
  data?: {
    entityIds?: string[]
    draft?: { id: string; title: string; kind: string; key: string }
    links?: { open?: string; edit?: string }
    [key: string]: unknown
  }
}): { type: string; status: "success" | "error" | "skipped"; message: string; errorCode?: string; data?: any } {
  if (!actionResult || typeof actionResult !== "object") {
    return {
      type: "unknown",
      status: "error",
      message: "Invalid action result",
    }
  }

  const resolveDraftFromPayload = (
    payload: Record<string, unknown> | undefined,
  ): { id: string; title: string; kind: string; key: string } | undefined => {
    if (!payload) return undefined
    const nested = payload.draft
    if (nested && typeof nested === "object" && typeof (nested as { id?: string }).id === "string") {
      const d = nested as { id: string; title?: string; kind?: string; key?: string }
      return {
        id: d.id,
        title: d.title ?? "Draft",
        kind: d.kind ?? "draft",
        key: d.key ?? d.id,
      }
    }
    const draftId =
      typeof payload.draftId === "string"
        ? payload.draftId
        : typeof payload.id === "string"
          ? payload.id
          : null
    if (!draftId) return undefined
    return {
      id: draftId,
      title: typeof payload.title === "string" ? payload.title : "Draft",
      kind: typeof payload.kind === "string" ? payload.kind : "draft",
      key: typeof payload.key === "string" ? payload.key : draftId,
    }
  }

  if (typeof actionResult.status === "string") {
    const data = actionResult.data as Record<string, unknown> | undefined
    const draft = resolveDraftFromPayload(data)
    return {
      type: actionResult.type,
      status: actionResult.status,
      message: actionResult.message || "Action completed",
      errorCode: actionResult.errorCode,
      data: draft && data ? { ...data, draft } : actionResult.data,
    }
  }

  if (actionResult.ok) {
    const resultPayload = (actionResult.result ?? {}) as Record<string, unknown>
    const draft = resolveDraftFromPayload(resultPayload)
    return {
      type: actionResult.type,
      status: "success",
      message: actionResult.result?.message || "Action completed successfully",
      data: {
        entityIds: actionResult.result?.entityIds,
        draft,
        links: actionResult.result?.links,
        ...resultPayload,
      },
    }
  } else {
    return {
      type: actionResult.type,
      status: "error",
      message: actionResult.error?.message || "Action failed",
      errorCode: actionResult.error?.code,
      data: actionResult.error?.details,
    }
  }
}

/**
 * Shared types for agent components.
 * Extracted from KipAgentBoardPage for reuse across legacy and new Agent Board.
 */

import type { LinkedCardProps } from "../../types/props"

/** Agent echo — Dialog Response attached beneath another agent's message. */
export interface DialogResponseEcho {
  content: string
  attributedTo?: string
}

/** Board instrument reply shown above Lead content in director mode. */
export type DirectorDelegationBeat = DialogResponseEcho

export interface AgentDialogueMessage {
  id: string
  role: "user" | "agent"
  content: string
  createdAt: string
  /** Optional agent echo — supporting Dialog Response beneath the primary agent message. */
  echo?: DialogResponseEcho
  /** Director mode — instrument reply above Lead content (Cloud, Rendr, …). */
  delegation?: DirectorDelegationBeat
  linkedCard?: LinkedCardProps
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
  if (typeof actionResult.status === "string") {
    return {
      type: actionResult.type,
      status: actionResult.status,
      message: actionResult.message || "Action completed",
      errorCode: actionResult.errorCode,
      data: actionResult.data,
    }
  }

  if (actionResult.ok) {
    return {
      type: actionResult.type,
      status: "success",
      message: actionResult.result?.message || "Action completed successfully",
      data: {
        entityIds: actionResult.result?.entityIds,
        draft: actionResult.result?.draft,
        links: actionResult.result?.links,
        ...(actionResult.result || {}),
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

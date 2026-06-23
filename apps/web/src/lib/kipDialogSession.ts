import { apiFetch } from "./api"
import { KipApi } from "./kipApi"

export type DialogSessionRow = {
  id: string
  session_name?: string
  sessionName?: string
  updated_at?: string
  created_at?: string
  updatedAt?: string
  createdAt?: string
  kip_messages?: unknown[]
  messageCount?: number
}

function sessionTimestamp(session: DialogSessionRow): number {
  return (
    Date.parse(
      String(
        session.updated_at
          ?? session.updatedAt
          ?? session.created_at
          ?? session.createdAt
          ?? "",
      ),
    ) || 0
  )
}

function sessionMessageCount(session: DialogSessionRow): number {
  if (typeof session.messageCount === "number") return session.messageCount
  if (Array.isArray(session.kip_messages)) return session.kip_messages.length
  return 0
}

/**
 * Prefer the most recent session with messages; otherwise reuse the newest empty session
 * so board mount does not spawn duplicate ghost sessions.
 */
export function pickBestDialogSessionId(sessions: DialogSessionRow[]): string | null {
  if (!sessions.length) return null

  const sorted = [...sessions].sort(
    (a, b) => sessionTimestamp(b) - sessionTimestamp(a),
  )
  const withMessages = sorted.filter((session) => sessionMessageCount(session) > 0)
  return (withMessages[0] ?? sorted[0])?.id ?? null
}

export type ResumeBoardSessionParams = {
  domainId: string
  agentId: string
  board: string
  frame: string
  subject?: string
  dialogScope: "admin" | "keeper"
  domainSlug?: string | null
  sessionName: string
}

export type ResumeBoardSessionResult = {
  sessionId: string
  created: boolean
}

export async function resolveActiveDialogSessions(
  domainId: string,
  params: {
    board: string
    frame: string
    dialogScope: "admin" | "keeper"
  },
): Promise<DialogSessionRow[]> {
  const scopeParam = params.dialogScope === "admin" ? "admin" : "keeper"
  const qs = new URLSearchParams({
    board: params.board,
    frame: params.frame,
    available_to: scopeParam,
  })

  const res = (await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/resolve/active?${qs.toString()}`,
  )) as { dialog?: { sessions?: DialogSessionRow[] } | null }

  return res.dialog?.sessions ?? []
}

/** Resume the best session for a board dialog context, or create one if none exist. */
export async function resumeOrCreateBoardSession(
  params: ResumeBoardSessionParams,
): Promise<ResumeBoardSessionResult> {
  const sessions = await resolveActiveDialogSessions(params.domainId, {
    board: params.board,
    frame: params.frame,
    dialogScope: params.dialogScope,
  })

  const existingId = pickBestDialogSessionId(sessions)
  if (existingId) {
    return { sessionId: existingId, created: false }
  }

  const session = await KipApi.createSession(
    params.agentId,
    undefined,
    params.sessionName,
    {
      domainSlug: params.domainSlug ?? undefined,
      domainId: params.domainId,
      dialogBoard: params.board,
      dialogFrame: params.frame,
      dialogSubject: params.subject ?? "domain",
      dialogScope: params.dialogScope,
    },
  )

  return { sessionId: session.id, created: true }
}

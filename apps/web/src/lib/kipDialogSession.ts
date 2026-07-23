import { apiFetch } from "./api"
import { KipApi } from "./kipApi"

/**
 * Hard-delete a Dialog. Returns on 204; throws with status/code on 404/401/500.
 * Cannot be undone — callers must confirm before invoking.
 */
export async function deleteDialog(domainId: string, dialogId: string): Promise<void> {
  await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(dialogId)}`,
    { method: "DELETE" },
  )
}

export type DialogSessionRow = {
  id: string
  agent_id?: string
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
  const countFromMeta = (session as { _count?: { kip_messages?: number } })._count?.kip_messages
  if (typeof countFromMeta === "number") return countFromMeta
  if (Array.isArray(session.kip_messages)) return session.kip_messages.length
  return 0
}

/**
 * Prefer the most recent session with messages; otherwise reuse the newest empty session
 * so board mount does not spawn duplicate ghost sessions.
 */
export function pickBestDialogSessionId(
  sessions: DialogSessionRow[],
  agentId?: string | null,
): string | null {
  if (!sessions.length) return null

  const scoped = agentId
    ? sessions.filter((session) => session.agent_id === agentId)
    : sessions
  if (!scoped.length) return null

  const sorted = [...scoped].sort(
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

/**
 * Resume-only: return the best existing board Dialog session, or null.
 * Board mount / curtain prefetch must use this — never create on visit alone.
 */
export async function resumeBoardSession(
  params: Pick<ResumeBoardSessionParams, "domainId" | "agentId" | "board" | "frame" | "dialogScope">,
): Promise<string | null> {
  const sessions = await resolveActiveDialogSessions(params.domainId, {
    board: params.board,
    frame: params.frame,
    dialogScope: params.dialogScope,
  })
  return pickBestDialogSessionId(sessions, params.agentId)
}

/**
 * Resume the best session for a board dialog context, or create one if none exist.
 * Call only from first real user send (or an explicit ensure path) — not from board mount.
 */
export async function resumeOrCreateBoardSession(
  params: ResumeBoardSessionParams,
): Promise<ResumeBoardSessionResult> {
  const existingId = await resumeBoardSession(params)
  if (existingId) {
    return { sessionId: existingId, created: false }
  }

  const createOpts = {
    domainSlug: params.domainSlug ?? undefined,
    domainId: params.domainId,
    dialogBoard: params.board,
    dialogFrame: params.frame,
    dialogSubject: params.subject ?? "domain",
    dialogScope: params.dialogScope,
  }

  try {
    const session = await KipApi.createSession(
      params.agentId,
      undefined,
      params.sessionName,
      createOpts,
    )
    return { sessionId: session.id, created: true }
  } catch (firstErr: unknown) {
    // Transient gateway / DB reconnect blips — one quick retry before failing the composer.
    const status = (firstErr as { status?: number })?.status
    const message = firstErr instanceof Error ? firstErr.message.toLowerCase() : ""
    const transient =
      status === 502 ||
      status === 503 ||
      status === 504 ||
      message.includes("closed the connection") ||
      message.includes("gateway")
    if (!transient) throw firstErr

    await new Promise((resolve) => setTimeout(resolve, 400))
    const session = await KipApi.createSession(
      params.agentId,
      undefined,
      params.sessionName,
      createOpts,
    )
    return { sessionId: session.id, created: true }
  }
}

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

/** Dedicated side sessions for Agent Echo / Kip collaboration — never resume as primary. */
export const AGENT_BOARD_ECHO_SESSION_NAME = "Agent Board Echo"
export const DOMAIN_LEAD_COLLABORATION_SESSION_NAME = "Domain Lead Collaboration"

export const ECHO_SESSION_NAMES = [
  AGENT_BOARD_ECHO_SESSION_NAME,
  DOMAIN_LEAD_COLLABORATION_SESSION_NAME,
] as const

export type EchoSessionName = (typeof ECHO_SESSION_NAMES)[number]

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

export function sessionDisplayName(session: DialogSessionRow): string {
  return (
    typeof session.session_name === "string"
      ? session.session_name
      : typeof session.sessionName === "string"
        ? session.sessionName
        : ""
  ).trim()
}

export function isEchoSessionName(name: string | null | undefined): boolean {
  const trimmed = typeof name === "string" ? name.trim() : ""
  return (ECHO_SESSION_NAMES as readonly string[]).includes(trimmed)
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
 *
 * When `agentId` is provided, prefer that agent's sessions first — but if none match,
 * fall back to the Dialog's best session. A Dialog is the session container; board land
 * should pick up where the conversation left off, not require Nav to open a Dialog.
 *
 * Echo side-sessions (`Agent Board Echo`, `Domain Lead Collaboration`) are excluded so
 * primary resume never lands on the hidden Echo thread.
 */
export function pickBestDialogSessionId(
  sessions: DialogSessionRow[],
  agentId?: string | null,
): string | null {
  const eligible = sessions.filter((session) => !isEchoSessionName(sessionDisplayName(session)))
  if (!eligible.length) return null

  const pickFrom = (pool: DialogSessionRow[]): string | null => {
    if (!pool.length) return null
    const sorted = [...pool].sort(
      (a, b) => sessionTimestamp(b) - sessionTimestamp(a),
    )
    const withMessages = sorted.filter((session) => sessionMessageCount(session) > 0)
    return (withMessages[0] ?? sorted[0])?.id ?? null
  }

  if (agentId) {
    const scoped = eligible.filter((session) => session.agent_id === agentId)
    const preferred = pickFrom(scoped)
    if (preferred) return preferred
  }

  return pickFrom(eligible)
}

export function findSessionIdByName(
  sessions: DialogSessionRow[],
  sessionName: string,
  agentId?: string | null,
): string | null {
  const target = sessionName.trim()
  if (!target) return null
  const matches = sessions.filter((session) => sessionDisplayName(session) === target)
  if (!matches.length) return null
  if (agentId) {
    const scoped = matches.find((session) => session.agent_id === agentId)
    if (scoped) return scoped.id
  }
  return matches[0]?.id ?? null
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

export async function fetchDialogSessions(
  domainId: string,
  dialogId: string,
): Promise<DialogSessionRow[]> {
  const res = (await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(dialogId)}`,
  )) as { dialog?: { sessions?: DialogSessionRow[] } | null }

  return res.dialog?.sessions ?? []
}

/** Resume-only: best primary session on a named Dialog, or null. Never creates. */
export async function resumeNamedDialogSession(params: {
  domainId: string
  dialogId: string
  agentId?: string | null
}): Promise<string | null> {
  const sessions = await fetchDialogSessions(params.domainId, params.dialogId)
  return pickBestDialogSessionId(sessions, params.agentId)
}

/**
 * Resume the named Dialog's session, or create one attached to that Dialog.
 * First send after Nav select — never findOrCreate the board Chatter Dialog.
 */
export async function resumeOrCreateNamedDialogSession(params: {
  domainId: string
  dialogId: string
  agentId: string
  domainSlug?: string | null
  sessionName: string
}): Promise<ResumeBoardSessionResult> {
  const existingId = await resumeNamedDialogSession({
    domainId: params.domainId,
    dialogId: params.dialogId,
    agentId: params.agentId,
  })
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
      dialogId: params.dialogId,
    },
  )
  return { sessionId: session.id, created: true }
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
 * Never returns an Echo side-session.
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

async function createNamedBoardSession(
  params: ResumeBoardSessionParams,
): Promise<ResumeBoardSessionResult> {
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

/**
 * Resume the best session for a board dialog context, or create one if none exist.
 * Call only from first real user send (or an explicit ensure path) — not from board mount.
 *
 * When `sessionName` is an Echo side-session name, match/create that exact name only —
 * never reuse the primary Kip conversation session.
 */
export async function resumeOrCreateBoardSession(
  params: ResumeBoardSessionParams,
): Promise<ResumeBoardSessionResult> {
  const sessions = await resolveActiveDialogSessions(params.domainId, {
    board: params.board,
    frame: params.frame,
    dialogScope: params.dialogScope,
  })

  if (isEchoSessionName(params.sessionName)) {
    const echoId = findSessionIdByName(sessions, params.sessionName, params.agentId)
    if (echoId) {
      return { sessionId: echoId, created: false }
    }
    return createNamedBoardSession(params)
  }

  const existingId = pickBestDialogSessionId(sessions, params.agentId)
  if (existingId) {
    return { sessionId: existingId, created: false }
  }

  return createNamedBoardSession(params)
}

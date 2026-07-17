/**
 * Prefetch board dialog sessions during the domain load curtain so Dialog
 * can unlock as soon as the board reveals.
 */

import { resumeOrCreateBoardSession } from "../../../lib/kipDialogSession"
import { resolveLeadAgentId } from "../../lib/frameLeadAgentIdentity"
import { resolveDialogLeadSlug } from "../../lib/domainLeadAgent"
import type { DomainBySlugRecord } from "./domainShellCache"

const SESSION_PREFETCH_TTL_MS = 60_000

interface PrefetchEntry {
  sessionId: string
  fetchedAt: number
  agentId: string
}

const prefetchStore = new Map<string, PrefetchEntry>()
const inflight = new Map<string, Promise<string | null>>()

function cacheKey(domainId: string, board: string): string {
  return `${domainId}::${board}`
}

export function peekPrefetchedDialogSession(
  domainId: string,
  board: string,
): string | null {
  const entry = prefetchStore.get(cacheKey(domainId, board))
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > SESSION_PREFETCH_TTL_MS) {
    prefetchStore.delete(cacheKey(domainId, board))
    return null
  }
  return entry.sessionId
}

/**
 * Claim a prefetched session for Dialog bootstrap.
 * Keeps the entry warm so remounts / soft switches do not re-hit the network.
 */
export function takePrefetchedDialogSession(
  domainId: string,
  board: string,
): string | null {
  return peekPrefetchedDialogSession(domainId, board)
}

export function clearPrefetchedDialogSession(domainId?: string): void {
  if (!domainId) {
    prefetchStore.clear()
    inflight.clear()
    return
  }
  for (const key of [...prefetchStore.keys()]) {
    if (key.startsWith(`${domainId}::`)) prefetchStore.delete(key)
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(`${domainId}::`)) inflight.delete(key)
  }
}

export interface PrefetchDomainBoardDialogParams {
  domain: DomainBySlugRecord
  domainSlug: string
  board?: string
  dialogScope?: "admin" | "keeper"
}

/**
 * Resume/create board dialog session while the curtain is up.
 * Callers that need a hard ceiling wrap with Promise.race at the gate level.
 */
export async function prefetchDomainBoardDialogSession(
  params: PrefetchDomainBoardDialogParams,
): Promise<string | null> {
  const domainId = params.domain.id
  if (!domainId || String(domainId).startsWith("fallback-")) return null

  const board = params.board ?? "domain"
  const key = cacheKey(domainId, board)
  const existing = peekPrefetchedDialogSession(domainId, board)
  if (existing) return existing

  const pending = inflight.get(key)
  if (pending) return pending

  const work = (async (): Promise<string | null> => {
    try {
      const leadSlug = resolveDialogLeadSlug(params.domain)
      const leadId =
        typeof params.domain.leadAgentId === "string" && params.domain.leadAgentId.trim()
          ? params.domain.leadAgentId.trim()
          : await resolveLeadAgentId(leadSlug, { allowKipFallback: true })

      if (!leadId) return null

      const { sessionId } = await resumeOrCreateBoardSession({
        domainId,
        agentId: leadId,
        board,
        frame: "conversation",
        subject: "domain",
        dialogScope: params.dialogScope ?? "keeper",
        domainSlug: params.domainSlug,
        sessionName: `Session · ${new Date().toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}`,
      })

      prefetchStore.set(key, {
        sessionId,
        fetchedAt: Date.now(),
        agentId: leadId,
      })
      return sessionId
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, work)
  return work
}

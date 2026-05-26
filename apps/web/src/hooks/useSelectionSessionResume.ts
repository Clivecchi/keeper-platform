"use client"

import * as React from "react"
import { apiFetch } from "../lib/api"
import { KipApi } from "../lib/kipApi"
import type { KipSession } from "../lib/kipApi"
import type { AgentDialogueMessage } from "../components/agent/types"

type DialogSessionRow = {
  id: string
  updated_at?: string
  created_at?: string
}

export interface UseSelectionSessionResumeOptions {
  domainId: string | null | undefined
  domainSlug?: string | null
  kipAgentId: string | null
  kipMode: "ide" | "agent" | "domain" | "designer"
  selectedDialogId: string | null | undefined
  selectedJourneyId: string | null | undefined
  selectedKeeperId: string | null | undefined
  selectedDraftId: string | null | undefined
  selectedAgentId: string | null | undefined
  activeSessionId: string | null | undefined
  /** Skip resume while a message is in flight — avoids wiping optimistic UI. */
  isSending?: boolean
  onSessionSelect: (id: string | null) => void
  fetchMessages: (sessionId: string) => Promise<unknown[] | undefined>
  setMessages: React.Dispatch<React.SetStateAction<AgentDialogueMessage[]>>
  idleMessages: AgentDialogueMessage[]
}

function sessionTimestamp(session: {
  updated_at?: string | Date
  created_at?: string | Date
  updatedAt?: string | Date
  createdAt?: string | Date
}): number {
  const raw =
    session.updated_at ??
    session.updatedAt ??
    session.created_at ??
    session.createdAt ??
    ""
  const iso = raw instanceof Date ? raw.toISOString() : String(raw)
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

function pickMostRecentSessionId(sessions: DialogSessionRow[]): string | null {
  if (!sessions.length) return null
  const sorted = [...sessions].sort(
    (a, b) => sessionTimestamp(b) - sessionTimestamp(a),
  )
  return sorted[0]?.id ?? null
}

function pickMostRecentKipSession(
  sessions: KipSession[],
  predicate: (session: KipSession) => boolean,
): string | null {
  const matches = sessions.filter(predicate)
  if (!matches.length) return null
  matches.sort((a, b) => sessionTimestamp(b) - sessionTimestamp(a))
  return matches[0]?.id ?? null
}

function sessionJourneyId(session: KipSession): string | null {
  return (
    (session as { primary_journey_id?: string | null }).primary_journey_id ??
    (session as { primaryJourneyId?: string | null }).primaryJourneyId ??
    null
  )
}

function sessionKeeperId(session: KipSession): string | null {
  return (
    (session as { primary_keeper_id?: string | null }).primary_keeper_id ??
    (session as { primaryKeeperId?: string | null }).primaryKeeperId ??
    null
  )
}

/**
 * Resumes the most recent Dialog session when Nav selection changes.
 * Mirrors designer dialog restore in UniversalConversation — uses existing routes only.
 */
export function useSelectionSessionResume({
  domainId,
  domainSlug,
  kipAgentId,
  kipMode,
  selectedDialogId,
  selectedJourneyId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  activeSessionId,
  isSending = false,
  onSessionSelect,
  fetchMessages,
  setMessages,
  idleMessages,
}: UseSelectionSessionResumeOptions): void {
  const resumeKey = React.useMemo(() => {
    if (selectedDialogId) return `dialog:${selectedDialogId}`
    if (selectedJourneyId) return `journey:${selectedJourneyId}`
    if (selectedKeeperId) return `keeper:${selectedKeeperId}`
    if (selectedDraftId) return `draft:${selectedDraftId}`
    if (selectedAgentId) return `agent:${selectedAgentId}`
    return null
  }, [
    selectedDialogId,
    selectedJourneyId,
    selectedKeeperId,
    selectedDraftId,
    selectedAgentId,
  ])

  const resumeRef = React.useRef(0)
  const activeSessionIdRef = React.useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  React.useEffect(() => {
    if (kipMode === "designer") return
    if (isSending) return
    if (!domainId || !resumeKey) return

    const token = ++resumeRef.current
    let cancelled = false

    const openIdle = () => {
      onSessionSelect(null)
      setMessages(idleMessages)
    }

    async function createAgentBoardSession(agentForLookup: string): Promise<string | null> {
      try {
        const session = await KipApi.createSession(agentForLookup, undefined, "Agent Board", {
          domainSlug: domainSlug ?? undefined,
          domainId,
          dialogBoard: "agent",
          dialogFrame: "conversation",
          dialogSubject: "domain",
          dialogScope: "keeper",
        })
        return session.id
      } catch {
        return null
      }
    }

    void (async () => {
      try {
        if (selectedDialogId) {
          const res = (await apiFetch(
            `/api/domains/${encodeURIComponent(domainId)}/kip/dialogs/${encodeURIComponent(selectedDialogId)}`,
          )) as { dialog?: { sessions?: DialogSessionRow[] } }
          if (cancelled || token !== resumeRef.current) return

          const sessionId = pickMostRecentSessionId(res.dialog?.sessions ?? [])
          if (sessionId) {
            onSessionSelect(sessionId)
            await fetchMessages(sessionId)
          } else {
            openIdle()
          }
          return
        }

        if (selectedDraftId) {
          if (!kipAgentId) {
            openIdle()
            return
          }
          const sessions = await KipApi.getSessionsByAgentId(kipAgentId, { pageSize: 100 })
          if (cancelled || token !== resumeRef.current) return
          const withDraft = sessions.filter(
            (s) =>
              ((s as { active_draft_id?: string | null }).active_draft_id ??
                (s as { activeDraftId?: string | null }).activeDraftId) === selectedDraftId,
          )
          withDraft.sort((a, b) => sessionTimestamp(b) - sessionTimestamp(a))
          const sessionId = withDraft[0]?.id ?? null
          if (sessionId) {
            onSessionSelect(sessionId)
            await fetchMessages(sessionId)
          } else {
            openIdle()
          }
          return
        }

        const agentForLookup = selectedAgentId ?? kipAgentId
        if (!agentForLookup) {
          openIdle()
          return
        }

        const sessions = await KipApi.getSessionsByAgentId(agentForLookup, {
          pageSize: 100,
        })
        if (cancelled || token !== resumeRef.current) return

        let sessionId: string | null = null
        if (selectedJourneyId) {
          sessionId = pickMostRecentKipSession(
            sessions,
            (s) => sessionJourneyId(s) === selectedJourneyId,
          )
        } else if (selectedKeeperId) {
          sessionId = pickMostRecentKipSession(
            sessions,
            (s) => sessionKeeperId(s) === selectedKeeperId,
          )
        } else if (selectedAgentId) {
          sessionId = pickMostRecentSessionId(
            sessions.map((s) => ({
              id: s.id,
              updated_at:
                s.updated_at instanceof Date
                  ? s.updated_at.toISOString()
                  : String(s.updated_at ?? ""),
              created_at:
                s.created_at instanceof Date
                  ? s.created_at.toISOString()
                  : String(s.created_at ?? ""),
            })),
          )
        }

        if (sessionId) {
          if (sessionId !== activeSessionIdRef.current) {
            onSessionSelect(sessionId)
          }
          await fetchMessages(sessionId)
        } else if (kipMode === "agent" && selectedAgentId && agentForLookup) {
          if (activeSessionIdRef.current) {
            // Session already active (e.g. just created) — do not wipe in-flight messages.
            return
          }
          const createdId = await createAgentBoardSession(agentForLookup)
          if (cancelled || token !== resumeRef.current) return
          if (createdId) {
            onSessionSelect(createdId)
            setMessages([])
          } else {
            openIdle()
          }
        } else {
          openIdle()
        }
      } catch {
        if (!cancelled && token === resumeRef.current) {
          if (kipMode === "agent" && selectedAgentId && activeSessionIdRef.current) {
            return
          }
          openIdle()
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    resumeKey,
    domainId,
    domainSlug,
    kipMode,
    kipAgentId,
    isSending,
    selectedDialogId,
    selectedJourneyId,
    selectedKeeperId,
    selectedDraftId,
    selectedAgentId,
    onSessionSelect,
    fetchMessages,
    setMessages,
    idleMessages,
  ])
}

"use client"

/**
 * Document Point Gloss — polish one Point in Chronicle without Dialog sprawl.
 * Threads persist on a Dialog gloss-carrier message (same metadata as Dialog Gloss).
 */

import * as React from "react"
import type {
  GlossAnchor,
  GlossContentSnapshot,
  GlossThread,
  GlossThreadMessage,
} from "@keeper/shared"
import {
  findGlossThread,
  glossAnchorToDraftDiscuss,
  parseGlossThreads,
  upsertGlossThreadMessage,
} from "@keeper/shared"
import { KipApi } from "../../../lib/kipApi"
import { normalizeActionReceipt } from "../../../components/agent/types"
import { GlossThreadPanel } from "../../../components/gloss/GlossThreadPanel"
import { extractRunAgentPayload } from "../../../hooks/useAgentDialog"
import { extractAgentReplyFromRunResult } from "../../boards/directorDialog"

export type DocumentPointGlossProps = {
  domainId: string
  domainSlug: string
  dialogId: string
  anchor: GlossAnchor
  snapshot?: GlossContentSnapshot
  pointTitle: string
  onClose: () => void
  onPointMutated?: () => void
  onGlossActivity?: () => void
}

function looksLikePointUpdateAsk(text: string): boolean {
  return /\b(update|revise|rewrite|change|edit|fix|correct)\b/i.test(text)
}

function findSuccessfulPointRewrite(actions: unknown[] | undefined): boolean {
  if (!actions?.length) return false
  return actions.some((raw) => {
    const receipt = normalizeActionReceipt(
      raw as Parameters<typeof normalizeActionReceipt>[0],
    )
    return receipt.status === "success" && receipt.type === "draft.point.rewrite"
  })
}

export function DocumentPointGloss({
  domainId,
  domainSlug,
  dialogId,
  anchor,
  snapshot,
  pointTitle,
  onClose,
  onPointMutated,
  onGlossActivity,
}: DocumentPointGlossProps) {
  const [messageId, setMessageId] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [agentId, setAgentId] = React.useState<string | null>(null)
  const [threads, setThreads] = React.useState<GlossThread[]>([])
  const [isSending, setIsSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [statusNote, setStatusNote] = React.useState<string | null>(null)

  const resolvedSnapshot = React.useMemo<GlossContentSnapshot>(
    () => ({
      label: snapshot?.label?.trim() || pointTitle,
      text: snapshot?.text,
      imageUrl: snapshot?.imageUrl,
    }),
    [snapshot, pointTitle],
  )

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const kip = await KipApi.getAgentBySlug("kip")
        if (cancelled) return
        setAgentId(kip.id)
        const carrier = await KipApi.ensureDialogGlossCarrier(domainId, dialogId, {
          agentId: kip.id,
        })
        if (cancelled) return
        setMessageId(carrier.messageId)
        setSessionId(carrier.sessionId)
        setThreads(parseGlossThreads(carrier.glossThreads))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open Document Gloss")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [domainId, dialogId])

  const thread = React.useMemo(
    () => findGlossThread(threads, anchor),
    [threads, anchor],
  )

  const handleSend = React.useCallback(
    async (text: string) => {
      if (!messageId || !agentId || !text.trim()) return
      setIsSending(true)
      setError(null)
      setStatusNote(null)

      const userMessage: GlossThreadMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        createdAt: new Date().toISOString(),
      }
      const withUser = upsertGlossThreadMessage(threads, anchor, userMessage)
      setThreads(withUser)

      try {
        await KipApi.updateMessageMetadata(messageId, { glossThreads: withUser })
      } catch (err) {
        console.warn("[DocumentPointGloss] persist user turn failed", err)
      }

      const draftDiscuss = glossAnchorToDraftDiscuss(anchor)
      const threadHistory = findGlossThread(withUser, anchor)?.messages ?? [userMessage]

      try {
        const result = await KipApi.runAgent(
          agentId,
          text.trim(),
          undefined,
          sessionId ?? undefined,
          {
            domainId,
            domainSlug,
            dialogId,
            agentContext: {
              glossMode: true,
              glossAnchor: anchor,
              glossContent: resolvedSnapshot,
              ...(draftDiscuss ? { draftDiscuss } : {}),
              glossThreadHistory: threadHistory.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            },
          },
        )

        const reply = extractAgentReplyFromRunResult(result)?.trim()
        if (!reply) {
          setError("Kip returned no reply — try again.")
          return
        }

        const { actions } = extractRunAgentPayload(result)
        const rewritten = findSuccessfulPointRewrite(actions)
        if (rewritten) {
          setStatusNote("Point updated in the Document.")
          onPointMutated?.()
        } else if (looksLikePointUpdateAsk(text) && draftDiscuss) {
          setStatusNote(
            "No Point rewrite ran this turn — Document text is unchanged. Ask again, or say “rewrite the Point now.”",
          )
        }

        const agentMessage: GlossThreadMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          content: reply,
          createdAt: new Date().toISOString(),
        }
        const withAgent = upsertGlossThreadMessage(withUser, anchor, agentMessage)
        setThreads(withAgent)
        await KipApi.updateMessageMetadata(messageId, { glossThreads: withAgent })
        onGlossActivity?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gloss send failed")
      } finally {
        setIsSending(false)
      }
    },
    [
      messageId,
      agentId,
      sessionId,
      threads,
      anchor,
      domainId,
      domainSlug,
      dialogId,
      resolvedSnapshot,
      onPointMutated,
      onGlossActivity,
    ],
  )

  if (loading) {
    return (
      <p className="px-1 py-2 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Opening Gloss…
      </p>
    )
  }

  if (error && !messageId) {
    return (
      <div className="px-1 py-2">
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {error}
        </p>
        <button
          type="button"
          className="mt-1 text-[12px] underline"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    )
  }

  if (!messageId) return null

  return (
    <div className="mt-2">
      {error ? (
        <p className="mb-1 px-1 text-[11px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {error}
        </p>
      ) : null}
      <GlossThreadPanel
        anchor={anchor}
        messageId={messageId}
        snapshot={resolvedSnapshot}
        thread={thread}
        isSending={isSending}
        onClose={onClose}
        onSend={(text) => void handleSend(text)}
        surface="chronicle"
        statusNote={statusNote}
      />
    </div>
  )
}

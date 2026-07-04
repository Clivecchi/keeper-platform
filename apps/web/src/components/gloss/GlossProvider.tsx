/**
 * Gloss — universal gesture for focused Dialog exchange on discrete content.
 */

import * as React from "react"
import type { GlossAnchor, GlossContentSnapshot, GlossThread, GlossThreadMessage } from "@keeper/shared"
import {
  buildGlossThreadKey,
  findGlossThread,
  upsertGlossThreadMessage,
} from "@keeper/shared"
import { KipApi } from "../../lib/kipApi"
import { extractAgentReplyFromRunResult } from "../../v0/boards/directorDialog"
import type { AgentDialogueMessage } from "../agent/types"

export interface GlossRunConfig {
  agentId: string | null
  sessionId: string | null
  domainId: string | null
  domainSlug?: string | null
  agentContext?: Record<string, unknown>
  agentName?: string
}

export interface GlossContextValue {
  activeKey: string | null
  sendingKey: string | null
  openGloss: (messageId: string, anchor: GlossAnchor, snapshot?: GlossContentSnapshot) => void
  closeGloss: () => void
  sendGloss: (params: {
    messageId: string
    anchor: GlossAnchor
    text: string
    snapshot?: GlossContentSnapshot
    existingThreads: readonly GlossThread[]
  }) => Promise<void>
  getThread: (message: AgentDialogueMessage, anchor: GlossAnchor) => GlossThread | undefined
}

const GlossContext = React.createContext<GlossContextValue | null>(null)

export function useGloss(): GlossContextValue | null {
  return React.useContext(GlossContext)
}

export interface GlossProviderProps {
  config: GlossRunConfig
  onUpdateMessageThreads: (messageId: string, threads: GlossThread[]) => void
  children: React.ReactNode
}

export function GlossProvider({
  config,
  onUpdateMessageThreads,
  children,
}: GlossProviderProps) {
  const [activeKey, setActiveKey] = React.useState<string | null>(null)
  const [sendingKey, setSendingKey] = React.useState<string | null>(null)

  const closeGloss = React.useCallback(() => {
    setActiveKey(null)
  }, [])

  const openGloss = React.useCallback(
    (_messageId: string, anchor: GlossAnchor) => {
      setActiveKey(buildGlossThreadKey(anchor))
    },
    [],
  )

  const persistThreads = React.useCallback(
    async (messageId: string, threads: GlossThread[]) => {
      onUpdateMessageThreads(messageId, threads)
      try {
        await KipApi.updateMessageMetadata(messageId, { glossThreads: threads })
      } catch (err) {
        console.warn("[Gloss] failed to persist thread metadata", err)
      }
    },
    [onUpdateMessageThreads],
  )

  const sendGloss = React.useCallback(
    async (params: {
      messageId: string
      anchor: GlossAnchor
      text: string
      snapshot?: GlossContentSnapshot
      existingThreads: readonly GlossThread[]
    }) => {
      const { messageId, anchor, text, snapshot, existingThreads } = params
      const trimmed = text.trim()
      if (!trimmed || !config.agentId) return

      const threadKey = buildGlossThreadKey(anchor)
      setSendingKey(threadKey)

      const userMessage: GlossThreadMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      }

      const withUser = upsertGlossThreadMessage(existingThreads, anchor, userMessage)
      await persistThreads(messageId, withUser)

      const existingThread = findGlossThread(withUser, anchor)
      const threadHistory = existingThread?.messages ?? [userMessage]

      try {
        const result = await KipApi.runAgent(
          config.agentId,
          trimmed,
          undefined,
          config.sessionId ?? undefined,
          {
            domainId: config.domainId,
            domainSlug: config.domainSlug,
            agentContext: {
              ...(config.agentContext ?? {}),
              glossMode: true,
              glossAnchor: anchor,
              glossContent: snapshot,
              glossThreadHistory: threadHistory.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            },
          },
        )

        const reply = extractAgentReplyFromRunResult(result)?.trim()
        if (!reply) return

        const agentMessage: GlossThreadMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          content: reply,
          createdAt: new Date().toISOString(),
        }

        const withAgent = upsertGlossThreadMessage(withUser, anchor, agentMessage)
        await persistThreads(messageId, withAgent)
      } finally {
        setSendingKey(null)
      }
    },
    [config, persistThreads],
  )

  const getThread = React.useCallback(
    (message: AgentDialogueMessage, anchor: GlossAnchor) => {
      const threads = message.glossThreads ?? []
      return findGlossThread(threads, anchor)
    },
    [],
  )

  const value = React.useMemo<GlossContextValue>(
    () => ({
      activeKey,
      sendingKey,
      openGloss,
      closeGloss,
      sendGloss,
      getThread,
    }),
    [activeKey, sendingKey, openGloss, closeGloss, sendGloss, getThread],
  )

  return <GlossContext.Provider value={value}>{children}</GlossContext.Provider>
}

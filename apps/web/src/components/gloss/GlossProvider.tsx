/**
 * Gloss — universal gesture for focused Dialog exchange on discrete content.
 */

import * as React from "react"
import type { GlossAnchor, GlossContentSnapshot, GlossThread, GlossThreadMessage } from "@keeper/shared"
import {
  buildGlossSurfaceKey,
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

export type GlossActiveOpen = {
  messageId: string
  anchor: GlossAnchor
  snapshot?: GlossContentSnapshot
}

export interface GlossContextValue {
  /** Surface key of the deepest currently hovered gloss surface (ignores selectionText) */
  hoveredKey: string | null
  activeKey: string | null
  /** Full open payload — includes phrase-level selectionText when present */
  activeOpen: GlossActiveOpen | null
  sendingKey: string | null
  registerHover: (key: string, depth: number) => void
  unregisterHover: (key: string) => void
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
  /** Whether an open gloss belongs to this surface (selectionText may differ). */
  isOpenOnSurface: (messageId: string, surfaceAnchor: GlossAnchor) => boolean
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
  const [activeOpen, setActiveOpen] = React.useState<GlossActiveOpen | null>(null)
  const [sendingKey, setSendingKey] = React.useState<string | null>(null)
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)
  const hoverStackRef = React.useRef<Array<{ key: string; depth: number }>>([])

  const recomputeHoveredKey = React.useCallback(() => {
    const stack = hoverStackRef.current
    if (!stack.length) {
      setHoveredKey(null)
      return
    }
    let winner = stack[0]
    for (const entry of stack) {
      if (entry.depth >= winner.depth) {
        winner = entry
      }
    }
    setHoveredKey(winner.key)
  }, [])

  const registerHover = React.useCallback(
    (key: string, depth: number) => {
      const stack = hoverStackRef.current.filter((entry) => entry.key !== key)
      stack.push({ key, depth })
      hoverStackRef.current = stack
      recomputeHoveredKey()
    },
    [recomputeHoveredKey],
  )

  const unregisterHover = React.useCallback(
    (key: string) => {
      hoverStackRef.current = hoverStackRef.current.filter((entry) => entry.key !== key)
      recomputeHoveredKey()
    },
    [recomputeHoveredKey],
  )

  const closeGloss = React.useCallback(() => {
    setActiveKey(null)
    setActiveOpen(null)
  }, [])

  const openGloss = React.useCallback(
    (messageId: string, anchor: GlossAnchor, snapshot?: GlossContentSnapshot) => {
      setActiveKey(buildGlossThreadKey(anchor))
      setActiveOpen({ messageId, anchor, snapshot })
    },
    [],
  )

  const isOpenOnSurface = React.useCallback(
    (messageId: string, surfaceAnchor: GlossAnchor) => {
      if (!activeOpen) return false
      return (
        activeOpen.messageId === messageId
        && buildGlossSurfaceKey(activeOpen.anchor) === buildGlossSurfaceKey(surfaceAnchor)
      )
    },
    [activeOpen],
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
      hoveredKey,
      activeKey,
      activeOpen,
      sendingKey,
      registerHover,
      unregisterHover,
      openGloss,
      closeGloss,
      sendGloss,
      getThread,
      isOpenOnSurface,
    }),
    [
      hoveredKey,
      activeKey,
      activeOpen,
      sendingKey,
      registerHover,
      unregisterHover,
      openGloss,
      closeGloss,
      sendGloss,
      getThread,
      isOpenOnSurface,
    ],
  )

  return <GlossContext.Provider value={value}>{children}</GlossContext.Provider>
}

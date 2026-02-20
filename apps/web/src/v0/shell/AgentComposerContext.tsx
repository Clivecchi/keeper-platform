"use client"

/**
 * AgentComposerContext
 *
 * Provides composer state and handlers from AgentBoardFrame to the Margin (bottom bar).
 * When the Agent frame is active, Margin renders the composer in the bar instead of
 * at the bottom of the workspace. This keeps the agent available in the same place at all times.
 */

import * as React from "react"
import type { AgentComposerProps } from "../../components/agent/AgentComposer"

export type AgentComposerContextValue = AgentComposerProps | null

const AgentComposerContext = React.createContext<AgentComposerContextValue>(null)

export function AgentComposerProvider({
  value,
  children,
}: {
  value: AgentComposerProps
  children: React.ReactNode
}) {
  return (
    <AgentComposerContext.Provider value={value}>
      {children}
    </AgentComposerContext.Provider>
  )
}

export function useAgentComposerContext() {
  return React.useContext(AgentComposerContext)
}

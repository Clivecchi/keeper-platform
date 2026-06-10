"use client"

import * as React from "react"

const accentStyle = {
  color: "hsl(var(--theme-accent-primary, 172 66% 50%))",
} as const

/** Bold, accent-colored agent name for training / config instructions. */
export function AgentNameHighlight({
  name,
  children,
}: {
  name?: string
  children?: React.ReactNode
}) {
  const display = children ?? name?.trim() ?? "this agent"
  return (
    <span className="font-semibold" style={accentStyle}>
      {display}
    </span>
  )
}

export function resolveTrainingAgentName(name?: string): string {
  return name?.trim() || "this agent"
}

export function AgentSpeaksInstruction({ agentName }: { agentName: string }) {
  const name = resolveTrainingAgentName(agentName)
  return (
    <>
      How <AgentNameHighlight name={name} /> speaks. First person. One or two sentences.
    </>
  )
}

export function AgentCharacterInstruction({ agentName }: { agentName: string }) {
  const name = resolveTrainingAgentName(agentName)
  return (
    <>
      Who <AgentNameHighlight name={name} /> is. Sincere, playful, sharp — expand on this.
    </>
  )
}

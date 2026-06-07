"use client"

import { BlockShell, BlockTitle } from "./blockShell"

export type LinkedAgentItem = {
  id: string
  name: string
  model: string
}

export type LinkedAgentsBlockProps = {
  agents: LinkedAgentItem[]
}

export function LinkedAgentsBlock({ agents }: LinkedAgentsBlockProps) {
  return (
    <BlockShell>
      <BlockTitle>Linked agents</BlockTitle>
      {agents.length === 0 ? (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          No agents using this provider
        </p>
      ) : (
        <ul className="space-y-1.5">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className="text-[12px]"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              <span style={{ color: "hsl(var(--theme-ink-primary))" }}>{agent.name}</span>
              <span className="opacity-70"> · {agent.model}</span>
            </li>
          ))}
        </ul>
      )}
    </BlockShell>
  )
}

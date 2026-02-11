/**
 * AgentContextBar
 * A thin persistent bar showing the agent's current operating context:
 * active journey scope, active keeper scope, SOLE memory status, and session ID.
 *
 * Displayed above the workspace in the Agent Board to make it always clear
 * what context the agent conversation is scoped to.
 */

import React from "react"
import { shortId } from "./helpers"

const SURFACE = {
  bg: "hsl(var(--theme-surface-paper) / 0.5)",
  border: "var(--theme-border-soft)",
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
}

export interface AgentContextBarProps {
  /** Name of the active journey, or null if none selected */
  activeJourneyName?: string | null
  /** Name of the active keeper, or null if none selected */
  activeKeeperName?: string | null
  /** Whether SOLE memory is currently active */
  soleActive?: boolean
  /** Current session ID, or null if no session */
  sessionId?: string | null
  /** Optional class name */
  className?: string
}

export const AgentContextBar: React.FC<AgentContextBarProps> = ({
  activeJourneyName,
  activeKeeperName,
  soleActive = false,
  sessionId,
  className = "",
}) => {
  const items: { label: string; value: string; active: boolean }[] = [
    {
      label: "Journey",
      value: activeJourneyName || "None",
      active: Boolean(activeJourneyName),
    },
    {
      label: "Keeper",
      value: activeKeeperName || "None",
      active: Boolean(activeKeeperName),
    },
    {
      label: "SOLE",
      value: soleActive ? "Active" : "Inactive",
      active: soleActive,
    },
    {
      label: "Session",
      value: sessionId ? shortId(sessionId) : "None",
      active: Boolean(sessionId),
    },
  ]

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-2 text-xs ${className}`}
      style={{
        backgroundColor: SURFACE.bg,
        borderColor: SURFACE.border,
      }}
    >
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: item.active
                ? "rgb(16 185 129)" // emerald-500
                : "rgb(209 213 219)", // gray-300
            }}
          />
          <span style={{ color: SURFACE.inkSecondary }}>{item.label}:</span>
          <span
            className="font-medium"
            style={{ color: item.active ? SURFACE.inkPrimary : SURFACE.inkSecondary }}
          >
            {item.value}
          </span>
        </span>
      ))}
    </div>
  )
}

export default AgentContextBar

/**
 * AgentContextBanner
 *
 * Context-first banner for the Agent Board. Emphasizes domain and keeper/journey
 * in view; agent is secondary. Config (lens, mode, governance, voice) lives in
 * Cockpit only.
 *
 * Line 1: Domain · Keeper or Journey or "Agent studio"
 * Line 2: with {agentName} · Live + [Open Cockpit]
 */

import * as React from "react"
import { Cog6ToothIcon } from "@heroicons/react/24/outline"

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  border: "var(--theme-border-soft)",
}

export interface AgentContextBannerProps {
  domainName?: string | null
  keeperName?: string | null
  journeyName?: string | null
  agentName: string
  isLive?: boolean
  onOpenCockpit?: () => void
  className?: string
}

export const AgentContextBanner: React.FC<AgentContextBannerProps> = ({
  domainName,
  keeperName,
  journeyName,
  agentName,
  isLive = true,
  onOpenCockpit,
  className = "",
}) => {
  const contextLabel =
    keeperName || journeyName || "Agent studio"
  const primaryLine = domainName
    ? `${domainName} · ${contextLabel}`
    : contextLabel
  const secondaryLine = `with ${agentName}${isLive ? " · Live" : ""}`

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${className}`}
      style={{
        backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
        borderColor: SURFACE.border,
      }}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          className="text-lg font-semibold"
          style={{ color: SURFACE.inkPrimary }}
        >
          {primaryLine}
        </h2>
        <span
          className="text-sm"
          style={{ color: SURFACE.inkSecondary }}
        >
          {secondaryLine}
        </span>
      </div>
      {onOpenCockpit && (
        <button
          type="button"
          onClick={onOpenCockpit}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: SURFACE.border,
            color: SURFACE.inkSecondary,
            backgroundColor: "transparent",
          }}
        >
          <Cog6ToothIcon className="w-4 h-4" />
          Open Cockpit
        </button>
      )}
    </div>
  )
}

export default AgentContextBanner

/**
 * AgentPostureHeader
 *
 * Shared banner component for the Agent Board that displays the governance stack:
 * Agent name, domain, lens, dialogue mode, governance, voice, and live status.
 *
 * Used by both v0 AgentBoardFrame and legacy KipAgentBoardPage.
 */

import React from "react"
import { Cog6ToothIcon } from "@heroicons/react/24/outline"

const SURFACE = {
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
  border: "var(--theme-border-soft)",
}

export interface AgentPostureHeaderProps {
  agentName: string
  domainName?: string | null
  lensName: string
  dialogueMode: "domain" | "debug"
  governanceMode: "strict" | "warn" | "off"
  voiceLabel: string
  isLive?: boolean
  onOpenCockpit?: () => void
  /** Hide voice when unauthenticated */
  showVoice?: boolean
  className?: string
}

export const AgentPostureHeader: React.FC<AgentPostureHeaderProps> = ({
  agentName,
  domainName,
  lensName,
  dialogueMode,
  governanceMode,
  voiceLabel,
  isLive = true,
  onOpenCockpit,
  showVoice = true,
  className = "",
}) => {
  const items: { label: string; value: string }[] = [
    { label: "Domain", value: domainName || "—" },
    { label: "Lens", value: lensName },
    { label: "Mode", value: dialogueMode },
    { label: "Governance", value: governanceMode },
  ]

  if (showVoice) {
    items.push({ label: "Voice", value: voiceLabel })
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${className}`}
      style={{
        backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
        borderColor: SURFACE.border,
      }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2
          className="text-lg font-semibold"
          style={{ color: SURFACE.inkPrimary }}
        >
          {agentName}
        </h2>
        {domainName && (
          <span
            className="text-sm"
            style={{ color: SURFACE.inkSecondary }}
          >
            {domainName}
          </span>
        )}
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-sm">
            <span
              className="text-xs uppercase tracking-wide"
              style={{ color: SURFACE.inkSecondary }}
            >
              {item.label}:
            </span>
            <span style={{ color: SURFACE.inkPrimary }}>{item.value}</span>
          </span>
        ))}
        {isLive && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "rgb(16 185 129)" }}
              aria-hidden
            />
            <span
              className="text-xs font-medium"
              style={{ color: "rgb(16 185 129)" }}
            >
              Live
            </span>
          </span>
        )}
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
          <Cog6ToothIcon className="h-4 w-4" />
          Open Cockpit
        </button>
      )}
    </div>
  )
}

export default AgentPostureHeader

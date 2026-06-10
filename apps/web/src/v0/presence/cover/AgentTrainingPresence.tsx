"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { parseVoicePromptSections } from "./voicePromptSections"
import {
  BehaviorSectionEditor,
  CapabilitiesSectionEditor,
  CurrentlySectionEditor,
  GovernanceSectionEditor,
  IdentitySectionEditor,
  type TrainingPlatformData,
} from "./trainingSectionEditors"

export interface AgentTrainingPresenceProps {
  objectId: string
  domainId: string
  voicePrompt: string
  platformData: TrainingPlatformData
  activeCapabilities: string[]
  identity: {
    name: string
    avatar?: string
    status?: string
  }
  onVoicePromptSaved: (next: string) => void
}

function TrainingIdentityHeader({
  name,
  avatar,
  status,
}: AgentTrainingPresenceProps["identity"]) {
  const displayAvatar = avatar?.trim() || "◇"
  const isLive =
    (status ?? "").toLowerCase().includes("ready") ||
    (status ?? "").toLowerCase().includes("active")

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-3 py-2.5"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
        background: "hsl(var(--theme-surface-elevated) / 0.08)",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-sm border"
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.45)",
          background: "hsl(var(--theme-surface-panel) / 0.5)",
          color: "hsl(var(--theme-ink-secondary))",
        }}
        aria-hidden
      >
        {displayAvatar.length <= 2 ? displayAvatar : displayAvatar.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[14px] font-medium truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {name || "Untitled"}
        </p>
        {status?.trim() && (
          <p
            className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {isLive && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(var(--theme-status-success, 152 69% 43%))" }}
                aria-hidden
              />
            )}
            {status}
          </p>
        )}
      </div>
    </div>
  )
}

export function AgentTrainingPresence({
  objectId,
  domainId,
  voicePrompt,
  platformData,
  activeCapabilities,
  identity,
  onVoicePromptSaved,
}: AgentTrainingPresenceProps) {
  const sections = React.useMemo(
    () => parseVoicePromptSections(voicePrompt),
    [voicePrompt],
  )

  const baseProps = {
    voicePrompt,
    objectId,
    domainId,
    onVoicePromptSaved,
  }

  return (
    <motion.div
      className="flex flex-col h-full min-h-0"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      data-cover-mode="training"
    >
      <TrainingIdentityHeader {...identity} />
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        <p
          className="text-[12px] mb-4 leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Structured system prompt — saved per section to this agent&apos;s voice prompt.
        </p>

        <CurrentlySectionEditor
          {...baseProps}
          sectionKey="currently"
          label="Currently"
          content={sections.currently}
          defaultOpen
        />

        <IdentitySectionEditor
          {...baseProps}
          sectionKey="identity"
          label="1. Identity"
          content={sections.identity}
          platformData={platformData}
          defaultOpen
        />

        <BehaviorSectionEditor
          {...baseProps}
          sectionKey="behavior"
          label="2. Behavior"
          content={sections.behavior}
          defaultOpen
        />

        <CapabilitiesSectionEditor
          {...baseProps}
          sectionKey="capabilities"
          label="3. Capabilities"
          content={sections.capabilities}
          activeCapabilities={activeCapabilities}
          defaultOpen
        />

        <GovernanceSectionEditor
          {...baseProps}
          sectionKey="governance"
          label="4. Governance"
          content={sections.governance}
          defaultOpen
        />
      </div>
    </motion.div>
  )
}

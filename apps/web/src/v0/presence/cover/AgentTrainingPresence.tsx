"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  parseVoicePromptSections,
  type VoicePromptSectionKey,
} from "./voicePromptSections"
import {
  BehaviorSectionEditor,
  CapabilitiesSectionEditor,
  CurrentlySectionEditor,
  GovernanceSectionEditor,
  IdentitySectionEditor,
  type TrainingPlatformData,
} from "./trainingSectionEditors"
import { TrainingFilmStrip } from "./TrainingFilmStrip"
import { TrainingFrameStage } from "./TrainingFrameStage"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"

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
  const boardCtx = useUniversalBoardOptional()
  const activeFrame =
    boardCtx?.selection.activeTrainingFrame ?? ("currently" as VoicePromptSectionKey)
  const onFrameSelect = boardCtx?.actions.onTrainingFrameSelect

  const sections = React.useMemo(
    () => parseVoicePromptSections(voicePrompt),
    [voicePrompt],
  )

  const frameHints = React.useMemo(
    () =>
      ({
        currently: Boolean(sections.currently.trim()),
        identity: Boolean(sections.identity.trim()),
        behavior: Boolean(sections.behavior.trim()),
        capabilities: Boolean(sections.capabilities.trim()),
        governance: Boolean(sections.governance.trim()),
      }) satisfies Partial<Record<VoicePromptSectionKey, boolean>>,
    [sections],
  )

  const baseProps = {
    voicePrompt,
    objectId,
    domainId,
    agentName: identity.name,
    onVoicePromptSaved,
    presentation: "frame" as const,
  }

  const renderActiveFrame = () => {
    switch (activeFrame) {
      case "currently":
        return (
          <CurrentlySectionEditor
            {...baseProps}
            sectionKey="currently"
            label="Currently"
            content={sections.currently}
          />
        )
      case "identity":
        return (
          <IdentitySectionEditor
            {...baseProps}
            sectionKey="identity"
            label="1. Identity"
            content={sections.identity}
            platformData={platformData}
          />
        )
      case "behavior":
        return (
          <BehaviorSectionEditor
            {...baseProps}
            sectionKey="behavior"
            label="2. Behavior"
            content={sections.behavior}
          />
        )
      case "capabilities":
        return (
          <CapabilitiesSectionEditor
            {...baseProps}
            sectionKey="capabilities"
            label="3. Capabilities"
            content={sections.capabilities}
            activeCapabilities={activeCapabilities}
          />
        )
      case "governance":
        return (
          <GovernanceSectionEditor
            {...baseProps}
            sectionKey="governance"
            label="4. Governance"
            content={sections.governance}
          />
        )
      default:
        return null
    }
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
      {onFrameSelect && (
        <TrainingFilmStrip
          activeFrame={activeFrame}
          onFrameSelect={onFrameSelect}
          frameHints={frameHints}
        />
      )}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4">
        <TrainingFrameStage frameKey={activeFrame} agentName={identity.name}>
          {renderActiveFrame()}
        </TrainingFrameStage>
        <p
          className="text-[11px] leading-relaxed mt-2 px-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Edit this frame in Chronicle, or talk it through in Dialog — the focused frame
          steers what Kip helps you shape next.
        </p>
      </div>
    </motion.div>
  )
}

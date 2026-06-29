"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { voicePromptSectionDef, type VoicePromptSectionKey } from "./voicePromptSections"

export interface TrainingFrameStageProps {
  frameKey: VoicePromptSectionKey
  agentName: string
  children: React.ReactNode
}

export function TrainingFrameStage({ frameKey, agentName, children }: TrainingFrameStageProps) {
  const def = voicePromptSectionDef(frameKey)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={frameKey}
        className="flex flex-col min-h-0"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        data-training-frame-stage={frameKey}
      >
        <div
          className="rounded-xl border overflow-hidden mb-4"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            background:
              "linear-gradient(165deg, hsl(var(--theme-surface-elevated) / 0.35) 0%, hsl(var(--theme-surface-panel) / 0.15) 100%)",
          }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}
          >
            <p
              className="text-[10px] font-mono uppercase tracking-[0.12em] mb-1"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              KE3P · Train · {agentName || "Agent"}
            </p>
            <h2
              className="text-[18px] font-semibold tracking-tight"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {def.stripLabel}
            </h2>
            <p
              className="text-[12px] mt-1 leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {def.frameIntent}
            </p>
          </div>
          <div className="px-4 py-4">{children}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

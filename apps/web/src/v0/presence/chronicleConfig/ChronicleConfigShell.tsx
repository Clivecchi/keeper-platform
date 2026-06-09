"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import { ChronicleSaveBar, type ChronicleSaveBarProps } from "./ChronicleSaveBar"

export interface ChronicleConfigIdentity {
  name: string
  avatar?: string
  status?: string
}

export interface ChronicleConfigShellProps extends ChronicleSaveBarProps {
  identity: ChronicleConfigIdentity
  onBack: () => void
  children: React.ReactNode
}

function ConfigIdentityHeader({
  name,
  avatar,
  status,
  onBack,
}: ChronicleConfigIdentity & { onBack: () => void }) {
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
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 p-1 rounded-md transition-opacity hover:opacity-75"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
        aria-label="Back to cover"
      >
        <ArrowLeftIcon className="w-4 h-4" />
      </button>

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

/**
 * Universal Config Mode shell — compressed identity header, editable body, persistent save bar.
 */
export function ChronicleConfigShell({
  identity,
  onBack,
  children,
  saveStatus,
  saveMessage,
  isDirty,
  onSave,
  onDismissError,
  saveLabel,
}: ChronicleConfigShellProps) {
  return (
    <motion.div
      className="flex flex-col h-full min-h-0"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      data-cover-mode="config"
    >
      <ConfigIdentityHeader {...identity} onBack={onBack} />

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        {children}
      </div>

      <ChronicleSaveBar
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        isDirty={isDirty}
        onSave={onSave}
        onDismissError={onDismissError}
        saveLabel={saveLabel}
      />
    </motion.div>
  )
}

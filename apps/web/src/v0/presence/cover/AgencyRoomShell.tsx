"use client"

import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import { motion } from "framer-motion"

export interface AgencyRoomShellProps {
  title: string
  status?: string
  onBack: () => void
  children: React.ReactNode
}

/** Chronicle room off Agency Place — back to Cover, no Save warehouse. */
export function AgencyRoomShell({ title, status, onBack, children }: AgencyRoomShellProps) {
  return (
    <motion.div
      className="theme-reading-plane keeper-chronicle-stack"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      data-cover-mode="agency-room"
    >
      <div
        className="shrink-0 flex items-center gap-3 px-3 py-2.5"
        style={{
          borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          background: "var(--treatment-paper, hsl(var(--theme-surface-elevated)))",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 p-1 rounded-md transition-opacity hover:opacity-75"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
          aria-label="Back to Agency Place"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className="text-[14px] font-medium truncate"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {title}
          </p>
          {status?.trim() ? (
            <p
              className="text-[10px] font-mono uppercase tracking-wider"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {status}
            </p>
          ) : null}
        </div>
      </div>
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-8">
        {children}
      </div>
    </motion.div>
  )
}

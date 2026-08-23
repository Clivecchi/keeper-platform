"use client"

import * as React from "react"
import type { StagePresence } from "@keeper/shared"
import type { ComposerCastAgent } from "./useKeeperStage"

type StageAgencyStripProps = {
  presence: StagePresence
  agent: ComposerCastAgent | null
  onChange: (patch: { contextualRole?: string | null; direction?: string | null }) => void
}

export function StageAgencyStrip({ presence, agent, onChange }: StageAgencyStripProps) {
  const [role, setRole] = React.useState(presence.contextualRole ?? "")
  const [direction, setDirection] = React.useState(presence.direction ?? "")

  React.useEffect(() => {
    setRole(presence.contextualRole ?? "")
    setDirection(presence.direction ?? "")
  }, [presence.id, presence.contextualRole, presence.direction])

  const baseRole = agent?.role?.trim() || "Agent"
  const purpose = agent?.purpose?.trim()

  return (
    <section
      className="keeper-stage-agency"
      aria-label={`${presence.title} agency`}
      style={{
        borderTop: "1px solid hsl(var(--theme-border-soft))",
        background: "hsl(var(--theme-surface-paper) / 0.92)",
        padding: "12px 14px 14px",
      }}
    >
      <p
        className="text-[11px] uppercase tracking-[0.08em]"
        style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
      >
        Base Agency
      </p>
      <h3
        className="text-[16px] font-medium"
        style={{ color: "hsl(var(--theme-ink-primary))", margin: "2px 0 0" }}
      >
        {presence.title}
      </h3>
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))", margin: "2px 0 0" }}>
        {baseRole}
        {purpose ? ` · ${purpose}` : ""}
      </p>

      <p
        className="text-[11px] uppercase tracking-[0.08em]"
        style={{ color: "hsl(var(--theme-ink-secondary))", margin: "12px 0 0" }}
      >
        On this Stage
      </p>
      <label className="mt-2 block text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Role
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onBlur={() => onChange({ contextualRole: role.trim() || null, direction: direction.trim() || null })}
          placeholder="Lead"
          className="mt-1 w-full rounded-md px-2 py-1.5 text-[14px]"
          style={{
            background: "hsl(var(--theme-surface-panel) / 0.55)",
            color: "hsl(var(--theme-ink-primary))",
            border: "1px solid hsl(var(--theme-border-soft))",
          }}
        />
      </label>
      <label className="mt-2 block text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Direction
        <textarea
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          onBlur={() => onChange({ contextualRole: role.trim() || null, direction: direction.trim() || null })}
          placeholder="What should they hold here?"
          rows={2}
          className="mt-1 w-full resize-none rounded-md px-2 py-1.5 text-[14px]"
          style={{
            background: "hsl(var(--theme-surface-panel) / 0.55)",
            color: "hsl(var(--theme-ink-primary))",
            border: "1px solid hsl(var(--theme-border-soft))",
          }}
        />
      </label>
    </section>
  )
}

"use client"

import * as React from "react"
import { PresenceField } from "./PresenceField"
import { resolvePlaybillAgent } from "../lib/playbillData"

export interface RealmArrivalRemarksProps {
  remarks: string
  agentSlug: string
  agentDisplayName: string
  isLoading?: boolean
}

export function RealmArrivalRemarks({
  remarks,
  agentSlug,
  agentDisplayName,
  isLoading = false,
}: RealmArrivalRemarksProps) {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [iconFallback, setIconFallback] = React.useState(
    agentDisplayName.slice(0, 1).toUpperCase() || "?",
  )

  React.useEffect(() => {
    let cancelled = false
    void resolvePlaybillAgent(agentSlug)
      .then((agent) => {
        if (cancelled || !agent) return
        setAvatarUrl(agent.avatarUrl)
        setIconFallback(agent.iconFallback)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [agentSlug])

  return (
    <section
      className="realm-arrival-remarks shrink-0 px-4 pt-4 pb-3"
      aria-label="Opening remarks"
    >
      <div className="flex gap-3 items-start">
        <PresenceField
          stageHeight={64}
          backdropUrl={avatarUrl}
          className="w-[72px] shrink-0"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-12 w-12 rounded-xl object-cover object-center border shadow-sm"
              style={{ borderColor: "hsl(var(--theme-border-soft) / 0.55)" }}
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl border font-serif text-lg font-semibold"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.55)",
                color: "hsl(var(--theme-accent-primary))",
                background: "hsl(var(--theme-surface-elevated) / 0.92)",
              }}
              aria-hidden
            >
              {iconFallback}
            </div>
          )}
        </PresenceField>

        <div className="min-w-0 flex-1 pt-1">
          <p
            className="text-[11px] uppercase tracking-[0.18em] mb-1.5"
            style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
          >
            {agentDisplayName}
          </p>
          <p
            className="font-serif text-[15px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {isLoading ? "…" : remarks}
          </p>
        </div>
      </div>
    </section>
  )
}

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

function AgentMark({
  displayName,
  avatarUrl,
  fallback,
}: {
  displayName: string
  avatarUrl: string | null
  fallback: string
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-11 w-11 shrink-0 rounded-xl object-cover object-center border"
        style={{ borderColor: "hsl(var(--theme-border-soft) / 0.5)" }}
      />
    )
  }
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border font-serif text-lg font-semibold"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        color: "hsl(var(--theme-accent-primary))",
        background: "hsl(var(--theme-surface-elevated) / 0.9)",
      }}
      aria-hidden
    >
      {fallback}
    </div>
  )
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
        <AgentMark
          displayName={agentDisplayName}
          avatarUrl={avatarUrl}
          fallback={iconFallback}
        />
        <div className="min-w-0 flex-1">
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

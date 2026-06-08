"use client"

import * as React from "react"
import { apiFetch } from "../../lib/api"

type SoleMemoryCardRecord = {
  id: string
  content: string
  topic?: string | null
  keeperId?: string | null
  domainId?: string | null
  createdAt?: string
  SoleReflection?: {
    id: string
    agentId: string
    createdAt: string
  } | null
}

function formatWhen(iso: string | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function SoleMemoryChronicle({
  memoryCardId,
  domainId,
  onLabelResolved,
}: {
  memoryCardId: string
  domainId: string
  onLabelResolved?: (label: string) => void
}) {
  const [card, setCard] = React.useState<SoleMemoryCardRecord | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void apiFetch(
      `/api/domains/${encodeURIComponent(domainId)}/kip/sole-memory-cards/${encodeURIComponent(memoryCardId)}`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const data =
          (res as { data?: SoleMemoryCardRecord })?.data ??
          (res as SoleMemoryCardRecord)
        if (!data?.id) {
          setError("SOLE memory card not found")
          setCard(null)
          return
        }
        setCard(data)
        const label =
          data.topic?.trim() ||
          data.content.trim().slice(0, 48) ||
          "SOLE Memory"
        onLabelResolved?.(label)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load SOLE memory")
          setCard(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [memoryCardId, domainId, onLabelResolved])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Loading SOLE memory…
        </p>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {error ?? "SOLE memory card not found"}
        </p>
      </div>
    )
  }

  const scopeLabel = card.keeperId ? "Keeper memory" : "Domain anchor"

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-5">
      <div className="mb-4">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          SOLE Memory
        </p>
        <h2
          className="mt-1 text-lg font-semibold leading-snug"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {card.topic?.trim() || "Reflection"}
        </h2>
        <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {scopeLabel}
          {card.createdAt ? ` · ${formatWhen(card.createdAt)}` : ""}
        </p>
      </div>

      <div
        className="rounded-xl border px-4 py-3"
        style={{
          borderColor: "hsl(var(--theme-border-soft))",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.95)",
        }}
      >
        <p
          className="whitespace-pre-wrap text-[14px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {card.content}
        </p>
      </div>
    </div>
  )
}

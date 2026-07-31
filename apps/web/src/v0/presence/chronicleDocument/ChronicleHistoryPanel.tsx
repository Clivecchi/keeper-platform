"use client"

import * as React from "react"
import { Bot, ChevronDown, FileText, GitBranch } from "lucide-react"
import type { ChronicleEvent } from "@keeper/shared"
import { KipApi } from "../../../lib/kipApi"
import { groupChronicleEvents, type ChronicleEventGroup } from "./chronicleMobile"

export { groupChronicleEvents }

export interface ChronicleHistoryPanelProps {
  domainId: string | null
  dialogId: string | null
  onOpenDocument: (event: ChronicleEvent) => void
}

function EventCard({
  event,
  onOpenDocument,
  nested = false,
}: {
  event: ChronicleEventGroup
  onOpenDocument: (event: ChronicleEvent) => void
  nested?: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)
  const isMoment = event.eventType === "moment"
  const isStructural = event.eventType === "structural"
  const hasChildren = event.children.length > 0
  const Icon = isMoment ? FileText : isStructural ? GitBranch : Bot

  return (
    <article
      className="rounded-xl px-3.5 py-3"
      style={{
        background: "hsl(var(--theme-surface-paper) / 0.76)",
        border: isStructural
          ? "1px solid hsl(var(--theme-accent-primary) / 0.55)"
          : "1px solid hsl(var(--theme-border-soft) / 0.45)",
        marginTop: nested ? 8 : 0,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{
            color: "hsl(var(--theme-accent-primary))",
            background: "hsl(var(--theme-accent-primary) / 0.12)",
          }}
        >
          <Icon size={15} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => isMoment && onOpenDocument(event)}
            disabled={!isMoment}
            className="block min-w-0 text-left disabled:cursor-default"
          >
            <p
              className="font-serif text-[18px] font-semibold leading-snug"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {event.title}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              {event.summary}
            </p>
          </button>
          <p className="mt-2 text-[11px] uppercase tracking-wider" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            {event.actor} · {new Date(event.timestamp).toLocaleString()}
          </p>
        </div>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="shrink-0 rounded p-1.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide related history" : "Show related history"}
          >
            <ChevronDown className={expanded ? "" : "-rotate-90"} size={16} aria-hidden />
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="ml-4 mt-3 border-l pl-3" style={{ borderColor: "hsl(var(--theme-border-soft) / 0.65)" }}>
          {event.children.map((child) => (
            <EventCard key={child.id} event={{ ...child, children: child.children ?? [] }} nested onOpenDocument={onOpenDocument} />
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function ChronicleHistoryPanel({ domainId, dialogId, onOpenDocument }: ChronicleHistoryPanelProps) {
  const [events, setEvents] = React.useState<ChronicleEvent[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!domainId || !dialogId) {
      setEvents([])
      return
    }
    let cancelled = false
    setLoading(true)
    void KipApi.getDialogChronicleEvents(domainId, dialogId)
      .then((response) => {
        if (!cancelled) setEvents(response.events)
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [domainId, dialogId])

  const groups = React.useMemo(() => groupChronicleEvents(events), [events])
  if (!dialogId) return null
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-6 pt-3">
      {loading ? <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Loading history…</p> : null}
      {!loading && groups.length === 0 ? (
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          No Chronicle history yet for this Dialog.
        </p>
      ) : null}
      {groups.map((event) => (
        <EventCard key={event.id} event={event} onOpenDocument={onOpenDocument} />
      ))}
    </div>
  )
}

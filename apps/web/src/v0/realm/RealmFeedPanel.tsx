"use client"

import * as React from "react"
import type { RealmFeedEvent } from "@keeper/shared"
import { formatRelativeTime } from "../presence/integrationChronicle/shared"

export interface RealmFeedPanelProps {
  events: RealmFeedEvent[]
  isLoading?: boolean
  className?: string
  onEventSelect?: (event: RealmFeedEvent) => void
}

export function RealmFeedPanel({
  events,
  isLoading = false,
  className = "",
  onEventSelect,
}: RealmFeedPanelProps) {
  if (isLoading) {
    return (
      <div className={`px-4 py-6 ${className}`}>
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Loading realm feed…
        </p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={`px-4 py-6 ${className}`}>
        <p className="font-serif text-[15px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          Nothing in motion yet. When activity lands across your domains, it will gather here.
        </p>
      </div>
    )
  }

  return (
    <ul
      className={`realm-feed-panel divide-y ${className}`}
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
    >
      {events.map((event) => {
        const interactive = Boolean(onEventSelect)
        const Tag = interactive ? "button" : "div"
        return (
          <li key={event.id}>
            <Tag
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => onEventSelect?.(event) : undefined}
              className={[
                "w-full px-4 py-3 text-left",
                interactive ? "transition-opacity hover:opacity-90" : "",
              ].join(" ")}
            >
              <p
                className="text-[10px] uppercase tracking-[0.16em]"
                style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
              >
                {event.domainName} · {formatRelativeTime(event.occurredAt)}
              </p>
              <p
                className="mt-1 font-serif text-[14px] leading-snug"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {event.summary}
              </p>
            </Tag>
          </li>
        )
      })}
    </ul>
  )
}

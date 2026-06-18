"use client"

import * as React from "react"
import type {
  KeeperDto,
  KeeperEngagementTemplateBrief,
  KeeperJourneyBrief,
} from "../feeds/KeeperFeed"

const blockShellClass = "rounded-md border px-3 py-3"
const blockShellStyle = {
  borderColor: "hsl(var(--theme-border-soft) / 0.45)",
  background: "hsl(var(--theme-surface-elevated) / 0.12)",
}

export function KeeperDefinitionBlock({ keeper }: { keeper: KeeperDto }) {
  return (
    <div className={blockShellClass} style={blockShellStyle}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Definition
      </p>
      <p className="text-[13px] whitespace-pre-wrap" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {keeper.description?.trim() || keeper.purpose?.trim() || "—"}
      </p>
      {keeper.memoryPattern && (
        <p className="text-[11px] mt-2" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Memory pattern: {keeper.memoryPattern}
        </p>
      )}
    </div>
  )
}

export function KeeperJourneysBlock({
  journeys,
  onJourneySelect,
}: {
  journeys: KeeperJourneyBrief[]
  onJourneySelect?: (journeyId: string) => void
}) {
  return (
    <div className={blockShellClass} style={blockShellStyle}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Journeys
      </p>
      {journeys.length === 0 ? (
        <p className="text-[13px] italic" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No journeys yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {journeys.map((journey) => (
            <li key={journey.id}>
              <button
                type="button"
                onClick={() => onJourneySelect?.(journey.id)}
                className="text-left w-full transition-opacity hover:opacity-80"
              >
                <span className="text-[13px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                  {journey.name?.trim() || "Untitled journey"}
                </span>
                <span className="block text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  {journey.momentCount} moment{journey.momentCount === 1 ? "" : "s"} · {journey.pathCount} path{journey.pathCount === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function KeeperEngagementTemplatesBlock({
  templates,
}: {
  templates: KeeperEngagementTemplateBrief[]
}) {
  return (
    <div className={blockShellClass} style={blockShellStyle}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Engagement templates
      </p>
      {templates.length === 0 ? (
        <p className="text-[13px] italic" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No templates linked to this keeper.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((template) => (
            <li key={template.id} className="text-[13px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              <span className="font-medium">{template.label}</span>
              <span className="block text-[11px] font-mono" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                {template.slug} · {template.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function KeeperSoleMemoryBlock({
  soleMemoryCount,
}: {
  soleMemoryCount: number
}) {
  return (
    <div className={blockShellClass} style={blockShellStyle}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        SOLE memory
      </p>
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {soleMemoryCount === 0
          ? "No memory cards linked yet."
          : `${soleMemoryCount} memory card${soleMemoryCount === 1 ? "" : "s"} scoped to this keeper.`}
      </p>
      <p className="text-[11px] mt-2" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Voice panel, echo, and logbook actions are Phase 1 follow-ups.
      </p>
    </div>
  )
}

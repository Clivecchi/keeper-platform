"use client"

import * as React from "react"
import type { LibraryItemDto } from "../feeds/LibraryItemFeed"

function readOnlyRow(label: string, value: React.ReactNode) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[10px] font-mono uppercase tracking-wider"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {label}
      </span>
      <div className="text-[13px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {value}
      </div>
    </div>
  )
}

export function LibraryDefinitionBlock({ item }: { item: LibraryItemDto }) {
  const sourceRef =
    item.source_type === "url" ? (
      <a
        href={item.source_ref}
        target="_blank"
        rel="noreferrer"
        className="underline break-all"
        style={{ color: "hsl(var(--theme-accent-primary))" }}
      >
        {item.source_ref}
      </a>
    ) : (
      <span className="break-all font-mono text-[12px]">{item.source_ref}</span>
    )

  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        background: "hsl(var(--theme-surface-panel) / 0.35)",
      }}
    >
      <h4 className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Definition
      </h4>
      {readOnlyRow("Source type", item.source_type)}
      {readOnlyRow("Source", sourceRef)}
      {readOnlyRow("Assigned Keeper", item.assigned_keeper_name ?? "—")}
      {readOnlyRow("Assigned Agent", item.assigned_agent_name ?? "—")}
    </div>
  )
}

export function LibraryAgentPerspectiveBlock({
  item,
}: {
  item: LibraryItemDto
}) {
  const agentLabel = item.assigned_agent_name?.trim() || "Agent"
  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        background: "hsl(var(--theme-surface-panel) / 0.35)",
      }}
    >
      <h4 className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        {agentLabel}&apos;s perspective
      </h4>
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {item.agent_perspective?.trim() || "Perspective pending…"}
      </p>
    </div>
  )
}

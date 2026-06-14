"use client"

import * as React from "react"
import {
  capabilitySourceFile,
  type CapabilityKind,
} from "../capabilityNavUtils"
import type { CapabilityUsedByEntry } from "../feeds/CapabilityFeed"

const blockShellClass = "rounded-md border px-3 py-3"
const blockShellStyle = {
  borderColor: "hsl(var(--theme-border-soft) / 0.45)",
  background: "hsl(var(--theme-surface-elevated) / 0.12)",
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span
        className="text-[10px] font-mono uppercase tracking-wider"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {label}
      </span>
      <span className="text-[13px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {value}
      </span>
    </div>
  )
}

export function CapabilityDefinitionBlock({
  slug,
  kind,
  description,
}: {
  slug: string
  kind: CapabilityKind
  description: string | null
}) {
  const sourceFile = capabilitySourceFile(kind)
  return (
    <div className={blockShellClass} style={blockShellStyle}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Definition
      </p>
      <FieldRow label="Slug" value={slug} />
      <FieldRow label="Kind" value={kind} />
      <FieldRow label="Description" value={description?.trim() || "—"} />
      <FieldRow label="Source" value={`Defined in ${sourceFile}`} />
    </div>
  )
}

export function CapabilityUsedByBlock({
  usedBy,
}: {
  usedBy: CapabilityUsedByEntry[]
}) {
  return (
    <div className={blockShellClass} style={blockShellStyle}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Used by
      </p>
      {usedBy.length === 0 ? (
        <p className="text-[13px] italic" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No agents reference this slug in capabilities, tools, or permissions arrays.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {usedBy.map((entry) => (
            <li
              key={`${entry.agentId}-${entry.column}`}
              className="text-[13px] flex flex-wrap items-baseline gap-x-2"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              <span className="font-medium">{entry.agentName}</span>
              <span
                className="text-[11px] font-mono"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {entry.agentSlug} · {entry.column}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

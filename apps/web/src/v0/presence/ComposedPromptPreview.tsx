"use client"

import * as React from "react"
import {
  parseComposedPromptSections,
  type ComposedPromptSection,
  type ComposedSectionKind,
} from "./composedPromptPreview"

const KIND_HINT: Record<ComposedSectionKind, string> = {
  identity: "Who this agent is and how it responds in the current mode.",
  "domain-lens": "Domain-wide voice layer — shared, not owned by this agent. Edit in Domain settings.",
  technical: "Runtime environment resolved for this session (technical).",
  rules: "Platform rules assembled at runtime — read-only here.",
  contract: "Non-negotiable domain behavioral contract.",
}

function SectionCard({
  section,
}: {
  section: ComposedPromptSection
}) {
  const isCollapsible = section.kind !== "identity"

  if (!isCollapsible) {
    return (
      <div
        className="rounded-lg border px-3 py-3"
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.45)",
          background: "hsl(var(--theme-surface-elevated) / 0.3)",
        }}
      >
        <p
          className="text-[12px] font-semibold mb-1"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {section.title}
        </p>
        <p
          className="text-[11px] mb-2 leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {KIND_HINT[section.kind]}
        </p>
        <pre
          className="text-[13px] leading-relaxed whitespace-pre-wrap break-words font-sans"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {section.body}
        </pre>
      </div>
    )
  }

  return (
    <details
      className="rounded-lg border group"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-elevated) / 0.22)",
      }}
      open={section.defaultOpen}
    >
      <summary
        className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between gap-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        <span className="text-[12px] font-semibold">{section.title}</span>
        <span className="text-[11px] opacity-70 group-open:hidden">Show</span>
        <span className="text-[11px] opacity-70 hidden group-open:inline">Hide</span>
      </summary>
      <div className="px-3 pb-3 border-t" style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}>
        <p
          className="text-[11px] mt-2 mb-2 leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {KIND_HINT[section.kind]}
        </p>
        <pre
          className="text-[12px] leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {section.body}
        </pre>
      </div>
    </details>
  )
}

export interface ComposedPromptPreviewProps {
  value: string
}

export function ComposedPromptPreview({ value }: ComposedPromptPreviewProps) {
  const sections = React.useMemo(() => parseComposedPromptSections(value), [value])

  if (!sections.length) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        No composed prompt available yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p
        className="text-[12px] leading-relaxed mb-3"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Assembled at runtime for this agent. Identity is agent-specific; domain lens and platform
        blocks are shared infrastructure — not edited on this card.
      </p>
      {sections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}
    </div>
  )
}

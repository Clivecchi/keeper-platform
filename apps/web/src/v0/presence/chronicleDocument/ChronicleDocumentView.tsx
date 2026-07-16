"use client"

import * as React from "react"
import type { ChronicleDocument } from "@keeper/shared"

export interface ChronicleDocumentViewProps {
  document: ChronicleDocument
  /** Opens a Gloss exchange in Dialog for this document's anchor. */
  onGloss?: () => void
  /** @deprecated Use onGloss */
  onDiscuss?: () => void
}

export function ChronicleDocumentView({ document, onGloss, onDiscuss }: ChronicleDocumentViewProps) {
  const handleGloss = onGloss ?? onDiscuss
  const [expanded, setExpanded] = React.useState(false)
  const clampLines = document.body.clampLines ?? 6
  const canExpand = document.body.expandable !== false && document.body.text.length > 280

  return (
    <article className="keeper-chronicle-document flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {document.identity.label}
          {document.identity.subtitle ? ` · ${document.identity.subtitle}` : ""}
        </p>
        <h2
          className="text-[18px] font-semibold leading-snug"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {document.title}
        </h2>
        {document.lede ? (
          <p className="text-[14px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {document.lede}
          </p>
        ) : null}
      </header>

      {document.status ? (
        <p
          className="text-[12px] font-medium uppercase tracking-wide"
          style={{
            color:
              document.status.tone === "error"
                ? "hsl(var(--theme-status-error))"
                : document.status.tone === "active"
                  ? "hsl(var(--theme-status-success))"
                  : "hsl(var(--theme-ink-tertiary))",
          }}
        >
          {document.status.label}
        </p>
      ) : null}

      <div
        className="text-[14px] leading-relaxed whitespace-pre-wrap"
        style={{
          color: "hsl(var(--theme-ink-secondary))",
          ...(canExpand && !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
            : {}),
        }}
      >
        {document.body.text}
      </div>

      <div className="flex items-center gap-3">
        {canExpand ? (
          <button
            type="button"
            className="text-[12px] font-medium underline-offset-2 hover:underline"
            style={{ color: "hsl(var(--theme-accent-primary))" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
        {handleGloss ? (
          <button
            type="button"
            className="text-[12px] font-semibold rounded-md px-2.5 py-1"
            style={{
              background: "hsl(var(--theme-accent-primary) / 0.12)",
              color: "hsl(var(--theme-accent-primary))",
            }}
            onClick={handleGloss}
            aria-label="Gloss"
          >
            Gloss
          </button>
        ) : null}
      </div>
    </article>
  )
}

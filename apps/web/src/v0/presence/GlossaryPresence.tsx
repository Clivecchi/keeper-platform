"use client"

/**
 * GlossaryPresence
 * ================
 * Chronicle surface for the Object Glossary.
 *
 * Domain (focus) — read access.
 * Design (config) — definition ownership. Source of truth remains the
 * governing repo file; this is not a Dialog Document.
 */

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { PresenceLayout } from "./types"
import {
  OBJECT_GLOSSARY_MARKDOWN,
  OBJECT_GLOSSARY_SOURCE_REF,
  OBJECT_GLOSSARY_SOURCE_URL,
  OBJECT_GLOSSARY_TITLE,
} from "../glossary/objectGlossaryMarkdown"

export interface GlossaryPresenceProps {
  layout?: PresenceLayout
  onLabelResolved?: (label: string) => void
}

const GLOSSARY_MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => (
    <h1
      className="text-[22px] font-semibold tracking-tight mt-1 mb-3"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className="text-[16px] font-semibold mt-7 mb-2"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="text-[14px] font-semibold mt-5 mb-1.5"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p
      className="text-[14px] leading-relaxed mb-3"
      style={{ color: "hsl(var(--theme-ink-secondary))" }}
    >
      {children}
    </p>
  ),
  li: ({ children }) => (
    <li
      className="text-[14px] leading-relaxed mb-1"
      style={{ color: "hsl(var(--theme-ink-secondary))" }}
    >
      {children}
    </li>
  ),
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote
      className="pl-3 my-4 text-[14px] leading-relaxed"
      style={{
        borderLeft: "2px solid hsl(var(--theme-border-soft))",
        color: "hsl(var(--theme-ink-primary))",
      }}
    >
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table
        className="w-full text-left text-[13px] border-collapse"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th
      className="px-2 py-1.5 font-medium align-top"
      style={{
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.6)",
        color: "hsl(var(--theme-ink-primary))",
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      className="px-2 py-1.5 align-top"
      style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)" }}
    >
      {children}
    </td>
  ),
  code: ({ children }) => (
    <code
      className="text-[12px] px-1 py-0.5 rounded"
      style={{
        background: "hsl(var(--theme-surface-elevated) / 0.5)",
        color: "hsl(var(--theme-ink-primary))",
      }}
    >
      {children}
    </code>
  ),
  hr: () => (
    <hr
      className="my-6"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.4)" }}
    />
  ),
}

function GlossaryMarkdown() {
  return (
    <div className="keeper-glossary-prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={GLOSSARY_MD_COMPONENTS}>
        {OBJECT_GLOSSARY_MARKDOWN}
      </ReactMarkdown>
    </div>
  )
}

export function GlossaryPresence({
  layout = "focus",
  onLabelResolved,
}: GlossaryPresenceProps) {
  React.useEffect(() => {
    onLabelResolved?.(OBJECT_GLOSSARY_TITLE)
  }, [onLabelResolved])

  const isConfig = layout === "config"
  const [copied, setCopied] = React.useState(false)

  const handleCopyPath = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(OBJECT_GLOSSARY_SOURCE_REF)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {isConfig ? "Definition ownership" : "Governing vocabulary"}
        </p>
        <h1
          className="text-[18px] font-semibold tracking-tight"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {OBJECT_GLOSSARY_TITLE}
        </h1>
        <p
          className="text-[13px] mt-1.5 leading-snug"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {isConfig
            ? "Design owns what the Glossary says. Domain sidebar is look-up. Edits happen in the source file — there is no in-product save."
            : "Platform vocabulary — same governing tier as the EntityKind Recipe."}
        </p>
        {isConfig ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p
              className="text-[12px] font-mono"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Source · {OBJECT_GLOSSARY_SOURCE_REF}
            </p>
            <a
              href={OBJECT_GLOSSARY_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] underline underline-offset-2"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              Open source
            </a>
            <button
              type="button"
              onClick={() => void handleCopyPath()}
              className="text-[12px] underline underline-offset-2"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {copied ? "Copied" : "Copy path"}
            </button>
          </div>
        ) : null}
      </div>
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-8">
        <GlossaryMarkdown />
      </div>
    </div>
  )
}

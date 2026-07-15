/**
 * AgentMessageContent — parses keeper-card fences inside agent prose and renders
 * KipResponseCard segments alongside markdown prose.
 */

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { KipResponseCard, type KipResponseCardProps } from "./KipResponseCard"

export type AgentContentSegment =
  | { kind: "prose"; text: string }
  | { kind: "keeper-card"; card: KipResponseCardProps }
  | { kind: "keeper-card-raw"; raw: string }

const KEEPER_CARD_PATTERN = /```keeper-card\s*\n?([\s\S]*?)```/gi

function parseKeeperCardJson(raw: string): KipResponseCardProps | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const type = typeof parsed.type === "string" ? parsed.type.trim() : ""
    const title = typeof parsed.title === "string" ? parsed.title.trim() : ""
    if (!type || !title) return null
    return {
      type,
      title,
      body: typeof parsed.body === "string" ? parsed.body : undefined,
      meta: typeof parsed.meta === "string" ? parsed.meta : undefined,
      items: Array.isArray(parsed.items)
        ? parsed.items.filter((item): item is string => typeof item === "string")
        : undefined,
    }
  } catch {
    return null
  }
}

export function parseContentSegments(content: string): AgentContentSegment[] {
  const segments: AgentContentSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  KEEPER_CARD_PATTERN.lastIndex = 0
  while ((match = KEEPER_CARD_PATTERN.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const prose = content.slice(lastIndex, match.index).trim()
      if (prose) segments.push({ kind: "prose", text: prose })
    }
    const card = parseKeeperCardJson(match[1])
    if (card) {
      segments.push({ kind: "keeper-card", card })
    } else {
      segments.push({ kind: "keeper-card-raw", raw: match[1].trim() })
    }
    lastIndex = KEEPER_CARD_PATTERN.lastIndex
  }

  const tail = content.slice(lastIndex).trim()
  if (tail) segments.push({ kind: "prose", text: tail })

  if (!segments.length && content.trim()) {
    segments.push({ kind: "prose", text: content.trim() })
  }

  return segments
}

const MD_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="whitespace-pre-line">{children}</p>
  ),
}

export function AgentMessageContent({ content }: { content: string }) {
  const segments = React.useMemo(() => parseContentSegments(content), [content])

  return (
    <div className="kip-message-content space-y-2">
      {segments.map((segment, index) => {
        if (segment.kind === "prose") {
          return (
            <ReactMarkdown key={`prose-${index}`} components={MD_COMPONENTS}>
              {segment.text}
            </ReactMarkdown>
          )
        }
        if (segment.kind === "keeper-card") {
          return <KipResponseCard key={`card-${index}`} {...segment.card} />
        }
        return (
          <pre
            key={`raw-${index}`}
            className="overflow-x-auto rounded-lg bg-black/5 px-3 py-2 text-xs"
          >
            {segment.raw}
          </pre>
        )
      })}
    </div>
  )
}

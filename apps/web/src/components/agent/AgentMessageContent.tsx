/**
 * AgentMessageContent — parses keeper-card fences inside agent prose and renders
 * KipResponseCard segments alongside markdown prose. Prefers structured metadata card.
 */

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { KipResponseCard, type KipResponseCardProps } from "./KipResponseCard"
import {
  normalizeKeeperCard,
  parseContentSegments,
  stripKeeperCardFences,
  type AgentContentSegment,
} from "./keeperCardParse"

export type { AgentContentSegment }
export {
  normalizeKeeperCard,
  parseContentSegments,
  parseKeeperCardJson,
  stripKeeperCardFences,
} from "./keeperCardParse"

const MD_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="whitespace-pre-line">{children}</p>
  ),
}

export function AgentMessageContent({
  content,
  card,
}: {
  content: string
  /** Structured card from message metadata — preferred over content fences. */
  card?: KipResponseCardProps | null
}) {
  const segments = React.useMemo((): AgentContentSegment[] => {
    const metaCard = card ? normalizeKeeperCard(card) : null
    if (metaCard) {
      const prose = stripKeeperCardFences(content)
      const result: AgentContentSegment[] = []
      if (prose) result.push({ kind: "prose", text: prose })
      result.push({ kind: "keeper-card", card: metaCard })
      return result
    }
    return parseContentSegments(content)
  }, [content, card])

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

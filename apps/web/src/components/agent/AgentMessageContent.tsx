/**
 * AgentMessageContent — parses keeper-card fences inside agent prose and renders
 * KipResponseCard / ChronicleUpdateChip segments alongside markdown prose.
 */

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { KipResponseCard, type KipResponseCardProps } from "./KipResponseCard"
import { ChronicleUpdateChip } from "./ChronicleUpdateChip"
import {
  normalizeKeeperCard,
  parseContentSegments,
  stripKeeperCardFences,
  type AgentContentSegment,
} from "./keeperCardParse"
import type { AgentDialogueMessage } from "./types"

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

function isChronicleUpdateCard(card: KipResponseCardProps): boolean {
  return card.type === "chronicle_update"
}

function isKnownIssueCard(card: KipResponseCardProps): boolean {
  return card.type === "known_issue" || /known\s*issue/i.test(card.title)
}

export function AgentMessageContent({
  content,
  card,
  chronicleChip,
  onOpenChronicleChip,
}: {
  content: string
  /** Structured card from message metadata — preferred over content fences. */
  card?: KipResponseCardProps | null
  chronicleChip?: AgentDialogueMessage["chronicleChip"]
  onOpenChronicleChip?: (chip: NonNullable<AgentDialogueMessage["chronicleChip"]>) => void
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

  const openFromChip = React.useCallback(() => {
    if (!chronicleChip || !onOpenChronicleChip) return
    onOpenChronicleChip(chronicleChip)
  }, [chronicleChip, onOpenChronicleChip])

  return (
    <div className="kip-message-content min-w-0 space-y-2 break-words">
      {segments.map((segment, index) => {
        if (segment.kind === "prose") {
          return (
            <ReactMarkdown key={`prose-${index}`} components={MD_COMPONENTS}>
              {segment.text}
            </ReactMarkdown>
          )
        }
        if (segment.kind === "keeper-card") {
          if (isChronicleUpdateCard(segment.card)) {
            return (
              <ChronicleUpdateChip
                key={`chip-${index}`}
                actor={chronicleChip?.actor || segment.card.title.split(" added to ")[0] || "Agent"}
                dialogTitle={
                  chronicleChip?.dialogTitle
                  || segment.card.title.split(" added to ")[1]
                  || "Document"
                }
                meta={segment.card.meta}
                onOpen={chronicleChip && onOpenChronicleChip ? openFromChip : undefined}
              />
            )
          }
          const clickableIssue = isKnownIssueCard(segment.card) && chronicleChip && onOpenChronicleChip
          return (
            <KipResponseCard
              key={`card-${index}`}
              {...segment.card}
              onOpen={clickableIssue ? openFromChip : undefined}
            />
          )
        }
        return (
          <pre
            key={`raw-${index}`}
            className="max-w-full overflow-x-auto rounded-lg bg-black/5 px-3 py-2 text-xs"
          >
            {segment.raw}
          </pre>
        )
      })}
    </div>
  )
}

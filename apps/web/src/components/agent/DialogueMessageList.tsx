/**
 * DialogueMessageList
 * Renders a scrollable list of agent conversation messages with action receipts.
 * Extracted from KipAgentBoardPage for reuse in the new Agent Board frame.
 */

import React, { useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import clsx from "clsx"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { LinkedCard } from "../props/LinkedCard"
import { ActionReceiptCard } from "../kip/ActionReceiptCard"
import { DraftUpdateProposeCard } from "../kip/DraftUpdateProposeCard"
import { DraftPointProposeCard } from "../kip/DraftPointProposeCard"
import type { DraftPoint } from "@keeper/shared"
import { KipResponseCard } from "./KipResponseCard"
import type { AgentDialogueMessage } from "./types"
import { normalizeActionReceipt } from "./types"
import { formatTime } from "./helpers"
import type { AgentBoardMessaging } from "../../v0/data/domain-frame.types"

// ─── keeper-card parsing ──────────────────────────────────────────────────────

const KEEPER_CARD_RE = /```keeper-card\n([\s\S]*?)```/g

type ContentSegment =
  | { kind: "markdown"; text: string }
  | { kind: "card"; data: { type: string; title: string; body?: string; meta?: string; items?: string[] } }

function parseContentSegments(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  // Reset lastIndex since the regex is module-level with /g
  const re = new RegExp(KEEPER_CARD_RE.source, "g")

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "markdown", text: content.slice(lastIndex, match.index) })
    }
    try {
      const json = JSON.parse(match[1].trim())
      if (json && typeof json.type === "string" && typeof json.title === "string") {
        segments.push({ kind: "card", data: json })
      } else {
        // Missing required fields — fall back to standard code block
        segments.push({ kind: "markdown", text: match[0] })
      }
    } catch {
      // Invalid JSON — fall back to standard code block
      segments.push({ kind: "markdown", text: match[0] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ kind: "markdown", text: content.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ kind: "markdown", text: content }]
}

// ─── Markdown component map (shared across all segment renders) ───────────────

const MD_COMPONENTS = {
  h1: ({ children }: React.PropsWithChildren) => <h1 className="kip-md-h1">{children}</h1>,
  h2: ({ children }: React.PropsWithChildren) => <h2 className="kip-md-h2">{children}</h2>,
  h3: ({ children }: React.PropsWithChildren) => <h3 className="kip-md-h3">{children}</h3>,
  p: ({ children }: React.PropsWithChildren) => <p className="kip-md-p">{children}</p>,
  strong: ({ children }: React.PropsWithChildren) => <strong className="kip-md-strong">{children}</strong>,
  em: ({ children }: React.PropsWithChildren) => <em className="kip-md-em">{children}</em>,
  ul: ({ children }: React.PropsWithChildren) => <ul className="kip-md-ul">{children}</ul>,
  ol: ({ children }: React.PropsWithChildren) => <ol className="kip-md-ol">{children}</ol>,
  li: ({ children }: React.PropsWithChildren) => <li className="kip-md-li">{children}</li>,
  code: ({ inline, children, ...props }: any) =>
    inline
      ? <code className="kip-md-code-inline" {...props}>{children}</code>
      : <pre className="kip-md-code-block"><code {...props}>{children}</code></pre>,
  blockquote: ({ children }: React.PropsWithChildren) => <blockquote className="kip-md-blockquote">{children}</blockquote>,
  hr: () => <hr className="kip-md-hr" />,
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement> & React.PropsWithChildren) =>
    <a href={href} target="_blank" rel="noopener noreferrer" className="kip-md-link">{children}</a>,
}

// ─── Segment renderer ─────────────────────────────────────────────────────────

function AgentMessageContent({ content }: { content: string }) {
  const segments = parseContentSegments(content)
  return (
    <div className="kip-message-content">
      {segments.map((seg, idx) => {
        if (seg.kind === "card") {
          return (
            <KipResponseCard
              key={idx}
              type={seg.data.type}
              title={seg.data.title}
              body={seg.data.body}
              meta={seg.data.meta}
              items={seg.data.items}
            />
          )
        }
        // Only render ReactMarkdown if the text is non-empty
        if (!seg.text.trim()) return null
        return (
          <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={MD_COMPONENTS as any}>
            {seg.text}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export interface DialogueMessageListProps {
  /** Whether messages are still loading */
  isLoading: boolean
  /** Array of conversation messages */
  messages: AgentDialogueMessage[]
  /** Whether a message is currently being sent */
  isSending: boolean
  /** Error message to display */
  error: string | null
  /** Callback when a draft link is clicked */
  onOpenDraft?: (draftId: string) => void
  /** Callback when a moment link is clicked (e.g. in action receipts) */
  onOpenMoment?: (momentId: string) => void
  /** Callback when a journey card is tapped (loads it in the right panel) */
  onOpenJourney?: (journeyId: string) => void
  /** Callback when user confirms a proposed draft update (legacy whole-draft flow) */
  onConfirmDraftUpdate?: (draftId: string, payload: { title?: string; summary?: string; status?: string; spec?: unknown }) => void
  /** Callback when user accepts a proposed draft point (Step 3+) */
  onAcceptDraftPoint?: (draftId: string, pointId: string) => void
  /** Point ids already accepted in this session (updates card state without reload) */
  acceptedDraftPointIds?: ReadonlySet<string>
  /** Point id currently being accepted */
  acceptingDraftPointId?: string | null
  /** Agent name for empty state and thinking indicator (dynamic, not hardcoded) */
  agentName?: string
  /** Echo attribution fallback when message.echo.attributedTo is missing (board def agentName) */
  echoAgentName?: string
  /** Domain-driven messaging strings for dialogue states */
  agentBoardMessaging?: AgentBoardMessaging
  /** Agent messages span full width of the centered column (narrow reading measure) */
  agentBubbleFullWidth?: boolean
  /**
   * Ref to the outer scroll container. Pass the scroll surface ref from KeeperDialogFrame
   * so the scroll-based opacity listener attaches to the correct element. When omitted the
   * component falls back to listening on its own inner container.
   */
  scrollContainerRef?: React.RefObject<HTMLDivElement>
}

export const DialogueMessageList: React.FC<DialogueMessageListProps> = ({
  isLoading,
  messages,
  isSending,
  error,
  onOpenDraft,
  onOpenMoment,
  onOpenJourney,
  onConfirmDraftUpdate,
  onAcceptDraftPoint,
  acceptedDraftPointIds,
  acceptingDraftPointId,
  agentName = "Agent",
  echoAgentName,
  agentBoardMessaging,
  agentBubbleFullWidth = true,
  scrollContainerRef,
}) => {
  const innerContainerRef = useRef<HTMLDivElement>(null)

  // Map<messageId, wrapper DOM element> — used to read positions for opacity computation
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // IDs that were present on mount; only new arrivals get entry animations
  const seenMessageIds = useRef<Set<string>>(new Set(messages.map((m) => m.id)))

  // Keep seenMessageIds current so re-renders don't re-animate already-shown messages
  useEffect(() => {
    messages.forEach((m) => seenMessageIds.current.add(m.id))
  }, [messages])

  // ── Scroll-based atmospheric opacity ──────────────────────────────────────
  // Reads each message wrapper's viewport position and writes --scroll-opacity
  // as a CSS custom property directly on the DOM node — zero React re-renders.
  const computeOpacities = useCallback(() => {
    const container = scrollContainerRef?.current ?? innerContainerRef.current
    if (!container) return

    const cr = container.getBoundingClientRect()
    const containerHeight = cr.height
    const containerBottom = cr.bottom
    const containerTop = cr.top

    // First pass — identify the topmost fully-visible message so it can hold
    // full presence when the user scrolls back up to read it.
    let topmostFullyVisibleId: string | null = null
    let topmostTop = Infinity

    messageRefs.current.forEach((el, id) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.top >= containerTop && rect.bottom <= containerBottom && rect.top < topmostTop) {
        topmostTop = rect.top
        topmostFullyVisibleId = id
      }
    })

    // Second pass — assign opacity via CSS custom property
    messageRefs.current.forEach((el, id) => {
      if (!el) return

      if (id === topmostFullyVisibleId) {
        el.style.setProperty("--scroll-opacity", "1")
        return
      }

      const rect = el.getBoundingClientRect()
      // Fraction of container height the message bottom sits above the container bottom.
      // 0 = at the floor (newest), 1 = at the ceiling (oldest visible).
      const distFromBottom = (containerBottom - rect.bottom) / containerHeight

      let opacity: number
      if (distFromBottom <= 0.4) {
        opacity = 1.0
      } else if (distFromBottom <= 0.7) {
        // Linear interpolation: 1.0 → 0.6 across the middle band
        const t = (distFromBottom - 0.4) / 0.3
        opacity = 1.0 - t * 0.4
      } else {
        opacity = 0.6
      }

      el.style.setProperty("--scroll-opacity", String(opacity))
    })
  }, [scrollContainerRef])

  // Attach scroll listener to whichever container is doing the scrolling
  useEffect(() => {
    const container = scrollContainerRef?.current ?? innerContainerRef.current
    if (!container) return
    container.addEventListener("scroll", computeOpacities, { passive: true })
    return () => container.removeEventListener("scroll", computeOpacities)
  }, [computeOpacities, scrollContainerRef])

  // Recompute after message list changes (new message appended, scroll-to-bottom)
  useEffect(() => {
    const raf = requestAnimationFrame(() => computeOpacities())
    return () => cancelAnimationFrame(raf)
  }, [messages, computeOpacities])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={innerContainerRef}
      className="keeper-panel-scroll min-h-[24rem] space-y-4 overflow-y-auto rounded-2xl px-4 py-4"
      style={{ backgroundColor: "transparent" }}
    >
      {isLoading ? (
        <>
          <SkeletonBubble alignment="left" />
          <SkeletonBubble alignment="right" />
        </>
      ) : messages.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-6 text-center text-sm"
          style={{
            borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
            color: "var(--theme-ink-secondary-color)",
          }}
        >
          {(agentBoardMessaging?.dialogue.start_prompt ?? "Say hello to {agent_name} to start the conversation.").replace("{agent_name}", agentName)}
        </div>
      ) : (
        messages.map((message) => {
          // Messages present on mount skip the entry animation (initial={false}).
          // Only arrivals after mount animate in.
          const isNew = !seenMessageIds.current.has(message.id)

          return (
            // Outer wrapper owns the scroll-based opacity via CSS custom property.
            // CSS (.dialog-message-surface .keeper-panel-scroll > div) reads
            // --scroll-opacity and applies it. Hover is handled by the :hover rule
            // in index.css — no JS hover state needed.
            <div
              key={message.id}
              ref={(el) => {
                if (el) messageRefs.current.set(message.id, el)
                else messageRefs.current.delete(message.id)
              }}
            >
              {/* Inner motion.div owns entry animation only — opacity 0→1 and x/y drift.
                  After animation completes its opacity is 1, so the outer wrapper's
                  CSS opacity controls atmospheric fading without compounding. */}
              <motion.div
                className={clsx(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
                initial={
                  isNew
                    ? message.role === "user"
                      ? { opacity: 0, x: 40 }
                      : { opacity: 0, y: 8 }
                    : false
                }
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{
                  duration: message.role === "user" ? 0.2 : 0.3,
                  ease: "easeOut",
                }}
              >
                <div
                  className={clsx(
                    "rounded-xl px-4 py-3 text-sm shadow-sm",
                    message.role === "user" ? "max-w-xl" : agentBubbleFullWidth ? "w-full max-w-none" : "max-w-xl",
                  )}
                  style={{
                    backgroundColor:
                      message.role === "user"
                        ? "hsl(var(--theme-dialogue-user-bg) / 0.65)"
                        : "hsl(var(--theme-dialogue-agent-bg) / 0.72)",
                    color:
                      message.role === "user"
                        ? "hsl(168 10% 88%)"
                        : "hsl(38 22% 85%)",
                    border:
                      message.role === "agent"
                        ? "1px solid hsl(var(--theme-dialogue-border) / 0.3)"
                        : "1px solid hsl(var(--theme-focus-ring) / 0.35)",
                    fontSize: "14px",
                    lineHeight: message.role === "agent" ? 1.65 : 1.5,
                    boxShadow: message.role === "agent" ? "none" : undefined,
                  }}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-line">{message.content}</p>
                  ) : (
                    <AgentMessageContent content={message.content} />
                  )}
                  {message.echo?.content?.trim() && (
                    <div
                      className="mt-2.5 border-t pt-2.5"
                      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.65)" }}
                    >
                      <p
                        className="mb-1 text-[11px] font-medium tracking-wide"
                        style={{ color: "hsl(var(--theme-ink-secondary, 25 10% 45%))" }}
                      >
                        {message.echo.attributedTo ?? echoAgentName ?? "Agent"}
                      </p>
                      <p
                        className="text-[12px] leading-relaxed"
                        style={{ color: "hsl(var(--theme-ink-secondary, 25 10% 40%))" }}
                      >
                        {message.echo.content.trim()}
                      </p>
                    </div>
                  )}
                  {message.linkedCard && (
                    <div className="mt-3">
                      <LinkedCard {...message.linkedCard} variant="inline" />
                    </div>
                  )}
                  {message.actionResults && message.actionResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.actionResults.map((actionResult, idx) => {
                        const receipt = normalizeActionReceipt(actionResult)
                        const isPointPropose =
                          receipt.type === "draft.update.propose"
                          && receipt.status === "success"
                          && receipt.data?.point
                        const pointProposeData = receipt.data as {
                          draftId?: string
                          draftTitle?: string
                          point?: DraftPoint
                        } | undefined
                        if (
                          isPointPropose
                          && pointProposeData?.draftId
                          && pointProposeData.point
                        ) {
                          const point = pointProposeData.point
                          return (
                            <DraftPointProposeCard
                              key={idx}
                              draftId={pointProposeData.draftId}
                              draftTitle={pointProposeData.draftTitle ?? "Draft"}
                              point={point}
                              onAccept={onAcceptDraftPoint}
                              onOpenDraft={onOpenDraft}
                              isAccepting={acceptingDraftPointId === point.id}
                              accepted={
                                point.status === "accepted"
                                || acceptedDraftPointIds?.has(point.id)
                                || false
                              }
                            />
                          )
                        }
                        const isLegacyPropose = receipt.type === "draft.update.propose" && receipt.status === "success"
                        const proposeData = receipt.data as {
                          draftId?: string
                          draftTitle?: string
                          summary?: string
                          proposedPayload?: { id: string; title?: string; summary?: string; status?: string; spec?: unknown }
                        } | undefined
                        if (isLegacyPropose && proposeData?.draftId && proposeData?.proposedPayload && onConfirmDraftUpdate) {
                          return (
                            <DraftUpdateProposeCard
                              key={idx}
                              draftId={proposeData.draftId}
                              draftTitle={proposeData.draftTitle ?? "Draft"}
                              summary={proposeData.summary ?? "Update draft"}
                              proposedPayload={proposeData.proposedPayload}
                              onConfirm={onConfirmDraftUpdate}
                              onReject={() => {}}
                              onOpenDraft={onOpenDraft}
                            />
                          )
                        }
                        return (
                          <ActionReceiptCard
                            key={idx}
                            receipt={receipt}
                            onOpenDraft={
                              receipt.data?.draft?.id
                                ? (draftId) => onOpenDraft?.(draftId)
                                : undefined
                            }
                            onOpenMoment={
                              receipt.data?.moment?.id
                                ? (momentId) => onOpenMoment?.(momentId)
                                : undefined
                            }
                            onOpenJourney={
                              receipt.data?.journey?.id
                                ? (journeyId) => onOpenJourney?.(journeyId)
                                : undefined
                            }
                          />
                        )
                      })}
                    </div>
                  )}
                  <span
                    className="mt-2 block text-xs"
                    style={{
                      color: message.role === "user" ? "rgba(255,255,255,0.8)" : "var(--theme-ink-tertiary-color)",
                    }}
                  >
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              </motion.div>
            </div>
          )
        })
      )}
      {isSending && (
        <p className="text-xs" style={{ color: "var(--theme-ink-tertiary-color)" }}>{(agentBoardMessaging?.dialogue.thinking ?? "{agent_name} is thinking…").replace("{agent_name}", agentName)}</p>
      )}
      {error && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            error.toLowerCase().includes("credits") ||
            error.toLowerCase().includes("quota")
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            {error.toLowerCase().includes("credits") ||
            error.toLowerCase().includes("quota") ? (
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            )}
          </svg>
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {error.toLowerCase().includes("credits") ||
              error.toLowerCase().includes("quota")
                ? "AI Model Needs Credits"
                : "Something went wrong"}
            </span>
            <span className="text-xs opacity-80">{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}

const SkeletonBubble: React.FC<{ alignment: "left" | "right" }> = ({
  alignment,
}) => (
  <div
    className={clsx(
      "flex",
      alignment === "left" ? "justify-start" : "justify-end",
    )}
  >
    <div
      className="h-16 w-40 animate-pulse rounded-2xl"
      style={{ backgroundColor: "hsl(var(--theme-surface-elevated) / 0.85)" }}
    />
  </div>
)

export default DialogueMessageList

"use client"

import * as React from "react"
import type { GlossAnchor, GlossContentSnapshot, GlossThread } from "@keeper/shared"
import { buildGlossAnchorDataAttribute, buildGlossThreadKey } from "@keeper/shared"
import { useGloss } from "./GlossProvider"
import { GlossThreadPanel } from "./GlossThreadPanel"

export interface GlossSurfaceProps {
  anchor: GlossAnchor
  messageId: string
  snapshot?: GlossContentSnapshot
  glossThreads?: readonly GlossThread[]
  /** When false, only the affordance + thread apply — children render unchanged */
  enabled?: boolean
  className?: string
  children: React.ReactNode
}

export function GlossSurface({
  anchor,
  messageId,
  snapshot,
  glossThreads = [],
  enabled = true,
  className,
  children,
}: GlossSurfaceProps) {
  const gloss = useGloss()
  const [hovered, setHovered] = React.useState(false)
  const [pressing, setPressing] = React.useState(false)
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const threadKey = buildGlossThreadKey(anchor)
  const isOpen = gloss?.activeKey === threadKey
  const isSending = gloss?.sendingKey === threadKey

  const clearPressTimer = React.useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  React.useEffect(() => () => clearPressTimer(), [clearPressTimer])

  const handleOpen = React.useCallback(() => {
    if (!gloss || !enabled) return
    gloss.openGloss(messageId, anchor, snapshot)
  }, [gloss, enabled, messageId, anchor, snapshot])

  const handleTouchStart = React.useCallback(() => {
    if (!enabled) return
    setPressing(true)
    clearPressTimer()
    pressTimer.current = setTimeout(() => {
      handleOpen()
      setPressing(false)
    }, 480)
  }, [enabled, clearPressTimer, handleOpen])

  const handleTouchEnd = React.useCallback(() => {
    clearPressTimer()
    setPressing(false)
  }, [clearPressTimer])

  if (!enabled || !gloss) {
    return <>{children}</>
  }

  const thread = glossThreads.find((t) => buildGlossThreadKey(t.anchor) === threadKey)
  const messageCount = thread?.messages.length ?? 0

  return (
    <div
      className={[
        "gloss-surface group relative",
        isOpen ? "gloss-surface--open" : "",
        pressing ? "gloss-surface--pressing" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-gloss-anchor={buildGlossAnchorDataAttribute(anchor)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}

      {(hovered || isOpen || messageCount > 0) && (
        <button
          type="button"
          className="gloss-affordance"
          aria-label="Gloss — discuss this"
          title="Gloss"
          onClick={(e) => {
            e.stopPropagation()
            handleOpen()
          }}
        >
          <span className="gloss-affordance__mark" aria-hidden>
            ✦
          </span>
          {messageCount > 0 ? (
            <span className="gloss-affordance__count">{messageCount}</span>
          ) : null}
        </button>
      )}

      {isOpen ? (
        <GlossThreadPanel
          anchor={anchor}
          messageId={messageId}
          snapshot={snapshot}
          thread={thread}
          isSending={isSending}
          onClose={gloss.closeGloss}
          onSend={(text) =>
            void gloss.sendGloss({
              messageId,
              anchor,
              text,
              snapshot,
              existingThreads: glossThreads,
            })
          }
        />
      ) : null}
    </div>
  )
}
